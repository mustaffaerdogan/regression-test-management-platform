/**
 * Deterministic parser that extracts a User Story + Acceptance Criteria
 * from a Jira issue's title and (wiki-formatted) description.
 *
 * Replaces a previous OpenAI-based extraction. No external API calls.
 */

export interface ExtractedJira {
  userStory: string;
  acceptanceCriteria: string[];
}

/* ────────────────────────────────────────────────────────────────────────
   Normalization – strip Jira wiki markup so regex/scan work uniformly
   ──────────────────────────────────────────────────────────────────────── */

const stripJiraWiki = (raw: string): string => {
  let s = raw ?? '';

  // CRLF / CR -> LF
  s = s.replace(/\r\n?/g, '\n');

  // Decode common HTML entities
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

  // Code blocks: keep content, drop markers ({code} ... {code}, {noformat} ... {noformat})
  s = s.replace(/\{(?:code|noformat)(?::[^}]*)?\}([\s\S]*?)\{(?:code|noformat)\}/gi, '$1');

  // Inline mono: {{x}} -> x
  s = s.replace(/\{\{([^{}]+)\}\}/g, '$1');

  // Headers: "h1. text" -> "## text" (we keep a marker so headers stay detectable)
  s = s.replace(/^h([1-6])\.\s*/gim, (_m, lvl) => `${'#'.repeat(Number(lvl))} `);

  // Blockquote: "bq. text" -> "text"
  s = s.replace(/^bq\.\s*/gim, '');

  // Panels / quote / info etc. – keep contents only
  s = s.replace(/\{(panel|quote|info|note|warning|tip)(?::[^}]*)?\}/gi, '');
  s = s.replace(/\{(panel|quote|info|note|warning|tip)\}/gi, '');

  // Links [text|url] -> text
  s = s.replace(/\[([^\]|\n]+)\|[^\]\n]+\]/g, '$1');
  // Bare [url] -> url (skip checkbox markers like [x], [ ], [X], [✓])
  s = s.replace(/\[([^\]\n]{2,})\]/g, (_m, inner) => {
    const trimmed = (inner as string).trim();
    if (/^(x|X|✓|[ ])$/.test(trimmed)) return _m;
    return inner;
  });

  // Inline emphasis markers (but DO NOT eat list bullets at line start)
  // Bold *text* -> text  (only when not at line start as bullet marker)
  s = s.replace(/(^|[\s,;\-(])\*([^*\n][^*\n]*?)\*(?=$|[\s,;\-).!?:])/gm, '$1$2');
  // Italic _text_ -> text
  s = s.replace(/(^|[\s,;\-(])_([^_\n][^_\n]*?)_(?=$|[\s,;\-).!?:])/gm, '$1$2');
  // Underline +text+ -> text
  s = s.replace(/(^|[\s,;\-(])\+([^+\n][^+\n]*?)\+(?=$|[\s,;\-).!?:])/gm, '$1$2');
  // Strike -text- (rare to be intentional, leave alone to avoid breaking dashes)
  // Monospace {{x}} handled above

  // Jira status / icon shortcuts: (/) (x) (!) (?) (on) (off) (*) (*g) (*y) (*r) (*b)
  s = s.replace(/\((?:\/|x|!|\?|on|off|\*[gyrb]?)\)/gi, '');

  // Smart quotes -> normal
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // Collapse 3+ blank lines into 2
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
};

/* ────────────────────────────────────────────────────────────────────────
   User Story detection
   ──────────────────────────────────────────────────────────────────────── */

const USER_STORY_PATTERNS: RegExp[] = [
  // English: "As a <role>, I want to <action>[, so that <benefit>]"
  /\bAs\s+(?:a|an|the)\s+([^.,\n]+?),?\s+I\s+(?:want|would\s+like|need|wish)\s+(?:to\s+)?([^.\n]+?)(?:[,.]\s*so\s+that\s+([^.\n]+))?[.!]?$/im,
  // Turkish: "<X> olarak,? <Y> [yapabilmek ]istiyorum"
  /\b((?:Bir|Ben)?\s*[^,.\n]+?)\s+olarak[,]?\s+([^.\n]+?)(?:yapabilmek\s+)?istiyorum[.!]?$/im,
];

const detectUserStory = (text: string, fallback: string): string => {
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 10) continue;
    for (const pat of USER_STORY_PATTERNS) {
      const m = trimmed.match(pat);
      if (m) return trimmed.replace(/^[#\s>*•\-]+/, '').trim();
    }
  }
  return fallback.trim();
};

/* ────────────────────────────────────────────────────────────────────────
   Acceptance Criteria detection
   ──────────────────────────────────────────────────────────────────────── */

const AC_HEADER_RE =
  /^\s*(?:#{1,6}\s*)?(?:\*+\s*)?(?:acceptance\s*criteria|kabul\s*kriterleri|kriterler|criteria|ac|kk)\s*[:：]?\s*\*{0,2}\s*$/i;

const ANY_HEADER_RE = /^\s*(?:#{1,6}\s+|\*{1,2}[^*\n]{2,80}\*{1,2}\s*[:：]?\s*)$/;

const BULLET_RE = /^\s*(?:[-*•·]|\d+[.)]|\(\d+\)|\[(?:\s|x|X|✓)\])\s+(.+)$/;

const stripListMarker = (line: string): string =>
  line
    .replace(BULLET_RE, '$1')
    .replace(/^\s*[#*]+\s+/, '')
    .replace(/^\s*[-•·]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .trim();

const isBullet = (line: string): boolean => BULLET_RE.test(line);

interface ScanResult {
  criteria: string[];
  consumed: Set<number>; // line indices consumed (so we don't double-use them as user-story scan)
}

const extractAcceptanceCriteria = (text: string): ScanResult => {
  const lines = text.split('\n');
  const out: string[] = [];
  const consumed = new Set<number>();

  // 1) Search for an explicit "Acceptance Criteria" header
  let acStart = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (AC_HEADER_RE.test(lines[i] ?? '')) {
      acStart = i + 1;
      consumed.add(i);
      break;
    }
  }

  // 2) If header found, collect items below it
  if (acStart !== -1) {
    let blankRun = 0;
    let lastWasBullet = false;
    for (let i = acStart; i < lines.length; i += 1) {
      const raw = lines[i] ?? '';
      const trimmed = raw.trim();

      if (!trimmed) {
        blankRun += 1;
        // Two consecutive blank lines = stop (new section)
        if (blankRun >= 2) break;
        continue;
      }
      blankRun = 0;

      // Hit another header → stop
      if (AC_HEADER_RE.test(raw) || ANY_HEADER_RE.test(raw)) break;

      if (isBullet(raw)) {
        out.push(stripListMarker(raw));
        consumed.add(i);
        lastWasBullet = true;
        continue;
      }

      // Continuation of previous bullet (indented OR follows bullet without blank line)
      if (lastWasBullet && /^\s+\S/.test(raw)) {
        const last = out[out.length - 1] ?? '';
        out[out.length - 1] = `${last} ${trimmed}`;
        consumed.add(i);
        continue;
      }

      // Single inline sentence right after header (no bullet) – take it once
      if (out.length === 0 && trimmed.length >= 10) {
        out.push(trimmed);
        consumed.add(i);
        lastWasBullet = false;
        continue;
      }

      // Otherwise: section seems to have ended.
      break;
    }
  }

  // 3) Gherkin blocks Given/When/Then
  if (out.length === 0) {
    let buf: string[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const t = (lines[i] ?? '').trim();
      const isStep = /^(given|when|then|and|but)\b/i.test(stripListMarker(t));
      if (isStep) {
        buf.push(stripListMarker(t));
        consumed.add(i);
        continue;
      }
      if (buf.length > 0) {
        out.push(buf.join(' '));
        buf = [];
      }
    }
    if (buf.length > 0) out.push(buf.join(' '));
  }

  // 4) Last resort: take all bullet lines from the description, regardless of header
  if (out.length === 0) {
    for (let i = 0; i < lines.length; i += 1) {
      if (consumed.has(i)) continue;
      const raw = lines[i] ?? '';
      if (isBullet(raw)) {
        out.push(stripListMarker(raw));
        consumed.add(i);
      }
    }
  }

  // 5) Final resort: split description into sentences and take the first 3-5
  if (out.length === 0) {
    const sentences = text
      .replace(/\n+/g, ' ')
      .split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ])/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 20 && s.length <= 400);
    for (const s of sentences.slice(0, 5)) {
      out.push(s);
    }
  }

  return { criteria: out, consumed };
};

/* ────────────────────────────────────────────────────────────────────────
   Cleanup helpers
   ──────────────────────────────────────────────────────────────────────── */

const cleanCriterion = (s: string): string => {
  let out = s
    .replace(/^[\s#*•·\-]+/, '')
    .replace(/\[(x|X|✓|\s)\]\s*/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/[\s]+/g, ' ')
    .trim();
  // Strip outer balanced quotes only (both ends present)
  if (
    out.length >= 2 &&
    /^["“'']/.test(out) &&
    /["”'']$/.test(out) &&
    !out.slice(1, -1).match(/^["“'']|["”'']$/)
  ) {
    out = out.slice(1, -1).trim();
  }
  return out;
};

const dedupeCriteria = (items: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const c = cleanCriterion(raw);
    if (c.length < 10) continue;
    if (c.length > 500) continue;
    const key = c.toLowerCase().replace(/\W+/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= 10) break;
  }
  return out;
};

/* ────────────────────────────────────────────────────────────────────────
   Public entry point
   ──────────────────────────────────────────────────────────────────────── */

export const parseJiraIssue = (rawSummary: string, rawDescription: string): ExtractedJira => {
  const summary = (rawSummary ?? '').replace(/\s+/g, ' ').trim();
  const description = stripJiraWiki(rawDescription ?? '');

  const userStory = detectUserStory(description, summary);
  const { criteria } = extractAcceptanceCriteria(description);
  const acceptanceCriteria = dedupeCriteria(criteria);

  return {
    userStory: userStory || summary || '-',
    acceptanceCriteria,
  };
};
