import { Request, Response } from 'express';
import puppeteer from 'puppeteer';

const MODAL_API_URL =
  process.env.MODAL_API_URL ??
  'https://yalkincyaliniz--testcase-generator-api-model-generate.modal.run';

const TARGET_CASE_COUNT = 5;
const MODEL_CALL_TIMEOUT_MS = 25_000;

/* ────────────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────────────── */

interface FieldInfo {
  type: string;
  name: string;
  id: string;
  label: string;
  placeholder: string;
  required: boolean;
}

interface FormInfo {
  index: number;
  fields: FieldInfo[];
  submitText: string;
}

interface ButtonInfo {
  text: string;
  inForm: boolean;
}

interface LinkInfo {
  text: string;
  href: string;
}

interface PageData {
  title: string;
  url: string;
  description: string;
  forms: FormInfo[];
  standaloneInputs: FieldInfo[];
  buttons: ButtonInfo[];
  links: LinkInfo[];
  headings: string[];
  stats: { forms: number; inputs: number; buttons: number; links: number; selects: number };
}

interface Feature {
  intent: string;
  name: string;
  acceptanceCriteria: string[];
}

interface ParsedTestCase {
  id: string;
  title: string;
  preconditions: string[];
  steps: string[];
  expectedResults: string[];
}

/* ────────────────────────────────────────────────────────────────────────
   Step 1 – Crawl page with Puppeteer
   ──────────────────────────────────────────────────────────────────────── */

const PUPPETEER_LAUNCH_BASE = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
} as const;

async function launchPuppeteerBrowser() {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (fromEnv) {
    return puppeteer.launch({
      ...PUPPETEER_LAUNCH_BASE,
      executablePath: fromEnv,
    });
  }

  try {
    return await puppeteer.launch({ ...PUPPETEER_LAUNCH_BASE });
  } catch (firstErr: unknown) {
    const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
    if (/Could not find Chrome|browser executable/i.test(msg)) {
      try {
        return await puppeteer.launch({
          ...PUPPETEER_LAUNCH_BASE,
          channel: 'chrome',
        });
      } catch {
        /* fall through */
      }
    }
    const hint =
      'Puppeteer için Chrome bulunamadı. Proje kökünden: cd server && npx puppeteer browsers install chrome ' +
      '(veya Google Chrome yüklüyse PUPPETEER_EXECUTABLE_PATH ile chrome yolunu verin.)';
    throw new Error(`${msg}\n${hint}`);
  }
}

async function crawlPage(opts: {
  url?: string;
  html?: string;
  cookies?: string;
}): Promise<PageData> {
  const browser = await launchPuppeteerBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    if (opts.cookies && opts.url) {
      try {
        const urlObj = new URL(opts.url);
        const cookiePairs = opts.cookies.split(';').map((c) => c.trim()).filter(Boolean);
        const puppetCookies = cookiePairs.map((pair) => {
          const [name, ...val] = pair.split('=');
          return { name: (name || '').trim(), value: val.join('=').trim(), domain: urlObj.hostname };
        });
        await page.setCookie(...puppetCookies);
      } catch (err) {
        console.warn('Cookie parsing failed, ignoring cookies:', err);
      }
    }

    if (opts.html) {
      await page.setContent(opts.html, { waitUntil: 'networkidle0' });
    } else if (opts.url) {
      await page.goto(opts.url, { waitUntil: 'networkidle2', timeout: 30000 });
    }

    const data = await page.evaluate(() => {
      const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image']);

      const getLabel = (el: Element): string => {
        const id = (el as HTMLElement).id;
        if (id) {
          try {
            const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
            if (lbl) return (lbl as HTMLElement).innerText.trim();
          } catch {
            /* ignore */
          }
        }
        const parentLabel = el.closest('label');
        if (parentLabel) {
          const txt = (parentLabel as HTMLElement).innerText.trim();
          if (txt) return txt;
        }
        const aria = el.getAttribute('aria-label');
        if (aria) return aria.trim();
        return '';
      };

      const toField = (el: Element) => {
        const input = el as HTMLInputElement;
        const type = (input.type || el.tagName).toLowerCase();
        return {
          type,
          name: input.name || '',
          id: input.id || '',
          label: getLabel(el),
          placeholder: input.placeholder || '',
          required: !!input.required,
        };
      };

      const formEls = Array.from(document.querySelectorAll('form'));
      const forms = formEls.map((form, i) => {
        const fields = Array.from(form.querySelectorAll('input, select, textarea'))
          .filter((el) => !SKIP_TYPES.has(((el as HTMLInputElement).type || '').toLowerCase()))
          .map(toField);

        const submitBtn = form.querySelector(
          'button[type="submit"], input[type="submit"], button:not([type])',
        ) as HTMLElement | null;
        const submitText = submitBtn
          ? (((submitBtn as HTMLInputElement).value || submitBtn.innerText) || '').trim()
          : '';

        return { index: i, fields, submitText };
      });

      const standaloneInputs = Array.from(document.querySelectorAll('input, select, textarea'))
        .filter((el) => !el.closest('form'))
        .filter((el) => !SKIP_TYPES.has(((el as HTMLInputElement).type || '').toLowerCase()))
        .map(toField);

      const buttonEls = Array.from(
        document.querySelectorAll(
          'button, input[type="submit"], input[type="button"], [role="button"], a.btn',
        ),
      );
      const buttons = buttonEls
        .map((el) => {
          const text =
            ((el as HTMLElement).innerText || (el as HTMLInputElement).value || '').trim();
          return { text, inForm: !!el.closest('form') };
        })
        .filter((b) => b.text.length > 0 && b.text.length < 60);

      let linkEls = Array.from(
        document.querySelectorAll('header a[href], nav a[href], [role="navigation"] a[href]'),
      );
      if (linkEls.length === 0) {
        linkEls = Array.from(document.querySelectorAll('a[href]')).slice(0, 12);
      }
      const links = linkEls
        .map((el) => {
          const a = el as HTMLAnchorElement;
          return { text: a.innerText.trim(), href: a.href };
        })
        .filter((l) => l.text.length > 0 && l.text.length < 50)
        .slice(0, 10);

      const headings = Array.from(document.querySelectorAll('h1, h2'))
        .map((el) => (el as HTMLElement).innerText.trim())
        .filter((t) => t.length > 0)
        .slice(0, 6);

      const descMeta = document.querySelector('meta[name="description"]');
      const description = descMeta ? descMeta.getAttribute('content') || '' : '';

      const stats = {
        forms: formEls.length,
        inputs: document.querySelectorAll('input, textarea').length,
        buttons: buttonEls.length,
        links: document.querySelectorAll('a[href]').length,
        selects: document.querySelectorAll('select').length,
      };

      return {
        title: document.title,
        description,
        forms,
        standaloneInputs,
        buttons,
        links,
        headings,
        stats,
      };
    });

    return { ...data, url: opts.url ?? '' };
  } finally {
    await browser.close();
  }
}

/* ────────────────────────────────────────────────────────────────────────
   Step 2 – Infer distinct features and pad to TARGET_CASE_COUNT
   ──────────────────────────────────────────────────────────────────────── */

const matches = (haystack: string, patterns: RegExp[]): boolean =>
  patterns.some((p) => p.test(haystack));

function inferFormFeature(form: FormInfo): Feature {
  const haystack = form.fields
    .map((f) => `${f.label} ${f.name} ${f.placeholder} ${f.id} ${f.type}`)
    .join(' ')
    .toLowerCase();
  const submit = (form.submitText || '').toLowerCase();
  const full = `${haystack} ${submit}`;

  const passwordCount = form.fields.filter((f) => f.type === 'password').length;
  const hasPassword = passwordCount > 0;
  const hasEmail = form.fields.some(
    (f) =>
      f.type === 'email' ||
      matches(`${f.label} ${f.name} ${f.placeholder}`.toLowerCase(), [
        /email/,
        /e-?posta/,
        /\bmail\b/,
      ]),
  );
  const hasName = form.fields.some((f) =>
    matches(`${f.label} ${f.name} ${f.placeholder}`.toLowerCase(), [
      /\bname\b/,
      /\bad(soyad)?\b/,
      /isim/,
      /first.?name/,
      /last.?name/,
      /soyad/,
    ]),
  );
  const hasMessage = form.fields.some((f) => f.type === 'textarea');
  const isSearch =
    form.fields.some((f) => f.type === 'search') ||
    matches(full, [/\bsearch\b/, /\bara(ma)?\b/, /\bsorgu\b/, /\bquery\b/]);

  if (isSearch) {
    return {
      intent: 'search',
      name: 'Site içi arama',
      acceptanceCriteria: [
        'Arama kutusuna geçerli bir anahtar kelime girilip arama tetiklendiğinde, arama sonuçları sayfası açılmalı ve anahtar kelimeyle ilgili en az bir sonuç listelenmelidir.',
      ],
    };
  }

  if (hasPassword && passwordCount >= 2) {
    return {
      intent: 'register',
      name: 'Kayıt formu',
      acceptanceCriteria: [
        'Ad, e-posta, şifre ve şifre tekrar alanları geçerli verilerle doldurulup kayıt ol butonuna tıklandığında yeni kullanıcı hesabı başarıyla oluşturulmalı ve kullanıcı onay/giriş sayfasına yönlendirilmelidir.',
      ],
    };
  }

  if (hasPassword && hasEmail && hasName) {
    return {
      intent: 'register',
      name: 'Kayıt formu',
      acceptanceCriteria: [
        'Ad, e-posta ve şifre alanları geçerli verilerle doldurulup kayıt ol butonuna tıklandığında yeni kullanıcı hesabı oluşturulmalı ve kullanıcıya başarı geri bildirimi gösterilmelidir.',
      ],
    };
  }

  if (hasPassword && hasEmail) {
    return {
      intent: 'login',
      name: 'Giriş formu',
      acceptanceCriteria: [
        'Geçerli e-posta ve şifre girilip Giriş butonuna tıklandığında, kullanıcı sisteme oturum açmalı ve ana sayfaya / panel sayfasına yönlendirilmelidir.',
      ],
    };
  }

  if (hasMessage && (hasEmail || hasName)) {
    return {
      intent: 'contact',
      name: 'İletişim formu',
      acceptanceCriteria: [
        'İletişim formundaki zorunlu alanlar (ad, e-posta, mesaj) doldurulup gönder butonuna tıklandığında, form başarıyla iletilmeli ve kullanıcıya teşekkür mesajı gösterilmelidir.',
      ],
    };
  }

  if (
    hasEmail &&
    form.fields.length <= 2 &&
    matches(full, [/subscribe/, /abone/, /newsletter/, /bülten/, /bulten/])
  ) {
    return {
      intent: 'newsletter',
      name: 'Bülten aboneliği',
      acceptanceCriteria: [
        'E-posta adresi girilip abone ol butonuna tıklandığında abonelik başarıyla oluşturulmalı ve kullanıcıya onay mesajı gösterilmelidir.',
      ],
    };
  }

  const submitLabel = form.submitText || 'Gönder';
  const requiredFields = form.fields
    .filter((f) => f.required)
    .map((f) => f.label || f.placeholder || f.name)
    .filter(Boolean)
    .slice(0, 4);
  const fieldHint =
    requiredFields.length > 0 ? `(${requiredFields.join(', ')})` : '';

  return {
    intent: `form:${form.index}`,
    name: `${submitLabel} formu`,
    acceptanceCriteria: [
      `${submitLabel} formundaki tüm zorunlu alanlar ${fieldHint} geçerli verilerle doldurulup ${submitLabel} butonuna tıklandığında, form başarıyla işlenmeli ve kullanıcıya başarı geri bildirimi gösterilmelidir.`,
    ],
  };
}

const CTA_KEYWORDS = [
  'login',
  'sign in',
  'giriş yap',
  'giris yap',
  'register',
  'sign up',
  'kayıt ol',
  'kayit ol',
  'üye ol',
  'uye ol',
  'kaydol',
  'sepete ekle',
  'add to cart',
  'satın al',
  'satin al',
  'buy now',
  'checkout',
  'ödeme',
  'odeme',
  'iletişim',
  'iletisim',
  'contact',
];

interface PaddingTemplate {
  intent: string;
  name: string;
  criteria: string;
}

const PADDING_FEATURES: PaddingTemplate[] = [
  {
    intent: 'page-load',
    name: 'Sayfanın hatasız yüklenmesi',
    criteria:
      'Sayfa adresi tarayıcıda açıldığında başlık, üst menü, ana içerik ve alt bilgi bölümleri eksiksiz olarak görüntülenmeli ve tarayıcı konsolunda kritik bir hata oluşmamalıdır.',
  },
  {
    intent: 'page-links',
    name: 'Sayfa içi linklerin çalışması',
    criteria:
      'Sayfa üzerindeki bir hyperlink üzerine tıklandığında ilgili hedef sayfa açılmalı, link 404 veya kırık bağlantı hatası vermemelidir.',
  },
  {
    intent: 'page-refresh',
    name: 'Sayfa yenileme davranışı',
    criteria:
      'Sayfa tarayıcıdan F5 / yenile butonuyla yenilendiğinde içerik kaybı olmadan tekrar yüklenmeli ve kullanıcının görüntülediği bölüm tutarlı kalmalıdır.',
  },
  {
    intent: 'browser-nav',
    name: 'Tarayıcı geri butonu',
    criteria:
      'Sayfadan başka bir sayfaya gidildikten sonra tarayıcının Geri butonuna tıklandığında önceki sayfaya dönüş sağlanmalı ve içerik önceki haliyle tutarlı görüntülenmelidir.',
  },
  {
    intent: 'responsive',
    name: 'Responsive görüntü kontrolü',
    criteria:
      'Tarayıcı penceresi tablet (768px) veya mobil (375px) genişliğine küçültüldüğünde sayfa içeriği yeni boyuta uygun şekilde yeniden düzenlenmeli, metinler okunaklı ve butonlar tıklanabilir kalmalı, yatay scroll oluşmamalıdır.',
  },
];

function inferFeatures(pageData: PageData): Feature[] {
  const features: Feature[] = [];
  const seenIntents = new Set<string>();

  const push = (f: Feature) => {
    if (seenIntents.has(f.intent)) return;
    seenIntents.add(f.intent);
    features.push(f);
  };

  for (const form of pageData.forms) {
    if (form.fields.length === 0) continue;
    push(inferFormFeature(form));
    if (features.length >= TARGET_CASE_COUNT) break;
  }

  if (features.length < TARGET_CASE_COUNT && !seenIntents.has('search')) {
    const standaloneSearch = pageData.standaloneInputs.find((i) => {
      const blob = `${i.label} ${i.name} ${i.placeholder} ${i.id}`.toLowerCase();
      return i.type === 'search' || matches(blob, [/\bsearch\b/, /\bara(ma)?\b/, /^q$/, /sorgu/]);
    });
    if (standaloneSearch) {
      push({
        intent: 'search',
        name: 'Site içi arama',
        acceptanceCriteria: [
          'Arama kutusuna geçerli bir anahtar kelime girilip Enter veya arama butonuna basıldığında, arama sonuçları sayfası açılmalı ve anahtar kelimeyle ilgili en az bir sonuç listelenmelidir.',
        ],
      });
    }
  }

  if (features.length < TARGET_CASE_COUNT) {
    const meaningfulLinks = pageData.links
      .filter((l) => !l.href.startsWith('javascript:'))
      .filter((l) => l.text.length >= 2)
      .slice(0, 6);
    if (meaningfulLinks.length >= 2) {
      const linkNames = meaningfulLinks
        .slice(0, 4)
        .map((l) => `"${l.text}"`)
        .join(', ');
      push({
        intent: 'navigation',
        name: 'Üst menü navigasyonu',
        acceptanceCriteria: [
          `Üst menüdeki ${linkNames} linklerinden birine tıklandığında, ilgili sayfa hatasız açılmalı, URL doğru güncellenmeli ve sayfanın başlığı linkin hedefiyle uyumlu olmalıdır.`,
        ],
      });
    }
  }

  if (features.length < TARGET_CASE_COUNT) {
    const standaloneButtons = pageData.buttons.filter((b) => !b.inForm);
    const usedTexts = new Set<string>(features.map((f) => f.name.toLowerCase()));
    for (const btn of standaloneButtons) {
      if (features.length >= TARGET_CASE_COUNT) break;
      const lower = btn.text.toLowerCase();
      if (!CTA_KEYWORDS.some((kw) => lower.includes(kw))) continue;
      if ([...usedTexts].some((t) => t.includes(lower) || lower.includes(t.replace(/ formu$/, '')))) {
        continue;
      }
      push({
        intent: `cta:${lower}`,
        name: `"${btn.text}" aksiyonu`,
        acceptanceCriteria: [
          `Sayfadaki "${btn.text}" butonuna tıklandığında ilgili akış başlatılmalı; hedef sayfa veya modal hatasız açılmalı ve beklenen alanları içermelidir.`,
        ],
      });
      usedTexts.add(lower);
    }
  }

  for (const padding of PADDING_FEATURES) {
    if (features.length >= TARGET_CASE_COUNT) break;
    if (seenIntents.has(padding.intent)) continue;
    push({
      intent: padding.intent,
      name: padding.name,
      acceptanceCriteria: [padding.criteria],
    });
  }

  return features.slice(0, TARGET_CASE_COUNT);
}

/* ────────────────────────────────────────────────────────────────────────
   Step 3 – Build one focused prompt per feature
   ──────────────────────────────────────────────────────────────────────── */

function buildSingleFeaturePrompt(pageData: PageData, feature: Feature): string {
  const pageRef = pageData.title || pageData.url || 'web sayfası';

  const userStory =
    `Kullanıcı olarak, "${pageRef}" sayfası üzerinde ${feature.name} özelliğini ` +
    `sorunsuz şekilde kullanabilmek istiyorum.`;

  const criteriaLines = feature.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`);

  return [
    `**User Story:** ${userStory}`,
    '',
    '**Acceptance Criteria:**',
    ...criteriaLines,
  ].join('\n');
}

/* ────────────────────────────────────────────────────────────────────────
   Step 4 – Call Modal-hosted model (with timeout)
   ──────────────────────────────────────────────────────────────────────── */

async function callModal(prompt: string, timeoutMs = MODEL_CALL_TIMEOUT_MS): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(MODAL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_story: prompt }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Modal HTTP ${response.status}: ${text}`);
    }

    const data = (await response.json()) as { status?: string; result?: string };
    if (!data.result) {
      throw new Error('Modal beklenmeyen yanıt döndü');
    }
    return data.result;
  } finally {
    clearTimeout(timer);
  }
}

/* ────────────────────────────────────────────────────────────────────────
   Step 5 – Parse model Markdown output into structured test cases
   ──────────────────────────────────────────────────────────────────────── */

const SECTION_KEYS = [
  { key: 'preconditions', patterns: [/ön\s*ko[sş]ullar/i, /pre[-\s]?conditions?/i] },
  { key: 'steps', patterns: [/ad[ıi]mlar/i, /test\s*ad[ıi]mlar[ıi]?/i, /steps?/i] },
  {
    key: 'expectedResults',
    patterns: [/beklenen\s*sonu[cç]/i, /expected\s*results?/i, /expected\s*outcome/i],
  },
] as const;

function stripCategoryFromTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\s*[-–—:|/(]\s*(pozitif|positive|negatif|negative|edge\s*case)[^)\n]*\)?$/i, '')
    .replace(/\b(pozitif|negatif|positive|negative|edge\s*case)\b\s*senaryo[su]?/gi, '')
    .replace(/^[*\s-]+/, '')
    .replace(/[*\s-]+$/, '')
    .trim();
}

function detectSectionKey(line: string): (typeof SECTION_KEYS)[number]['key'] | null {
  for (const sec of SECTION_KEYS) {
    if (sec.patterns.some((p) => p.test(line))) return sec.key;
  }
  return null;
}

function parseTestCases(markdown: string): ParsedTestCase[] {
  const cleaned = markdown.replace(/\*\*/g, '');
  const blocks = cleaned
    .split(/(?:^|\n)\s*(?:Test\s*Case|Test\s*Senaryosu|TC[-_])\s*\d+\s*[:.\-]\s*/i)
    .map((b) => b.trim())
    .filter((b) => b.length > 10);

  const results: ParsedTestCase[] = [];

  blocks.forEach((block, idx) => {
    const lines = block.split('\n').map((l) => l.trim());

    let title = '';
    let i = 0;
    while (i < lines.length && !title) {
      const candidate = lines[i].replace(/^[-*•]\s*/, '').trim();
      i += 1;
      if (!candidate) continue;
      if (/^kategori\s*:/i.test(candidate)) continue;
      if (detectSectionKey(candidate)) {
        i -= 1;
        break;
      }
      title = stripCategoryFromTitle(candidate);
    }
    if (!title) title = `Test Senaryosu ${idx + 1}`;

    const sections: Record<string, string[]> = {
      preconditions: [],
      steps: [],
      expectedResults: [],
    };
    let current: keyof typeof sections | null = null;

    for (; i < lines.length; i += 1) {
      const raw = lines[i];
      if (!raw) continue;

      const sectionKey = detectSectionKey(raw);
      if (sectionKey) {
        current = sectionKey as keyof typeof sections;
        const afterColon = raw.replace(/^[-*•]?\s*/, '').replace(/^[^:]+:\s*/, '').trim();
        if (afterColon) sections[current].push(afterColon);
        continue;
      }

      if (/^kategori\s*:/i.test(raw)) continue;

      if (current) {
        const value = raw
          .replace(/^[-*•]\s*/, '')
          .replace(/^\d+[.)]\s*/, '')
          .trim();
        if (value) sections[current].push(value);
      }
    }

    if (
      sections.preconditions.length === 0 &&
      sections.steps.length === 0 &&
      sections.expectedResults.length === 0
    ) {
      return;
    }

    results.push({
      id: `TC-${String(idx + 1).padStart(3, '0')}`,
      title,
      preconditions: sections.preconditions.length ? sections.preconditions : ['-'],
      steps: sections.steps.length ? sections.steps : ['-'],
      expectedResults: sections.expectedResults.length ? sections.expectedResults : ['-'],
    });
  });

  return results;
}

/* ────────────────────────────────────────────────────────────────────────
   Step 6 – Filter out negative / unhappy-path cases
   ──────────────────────────────────────────────────────────────────────── */

const NEGATIVE_PATTERNS: RegExp[] = [
  /hatal[ıi]/i,
  /yanl[ıi][şs]/i,
  /ge[çc]ersiz/i,
  /olmayan/i,
  /eksik/i,
  /negatif/i,
  /bo[şs]\s+(?:de[ğg]er|alan|girdi|input)/i,
  /bulun?ama[dy]?/i,
  /bulamad?[ıi]?/i,
  /olumsuz/i,
  /tutars[ıi]z/i,
  /hata\s*mesaj/i,
  /reddedil/i,
  /izin\s*verilm/i,
  /engellen/i,
  /invalid/i,
  /incorrect/i,
  /\bwrong\b/i,
  /\bmissing\b/i,
  /not\s*found/i,
  /\bfail/i,
  /unable\s*to/i,
];

function isLikelyNegativeCase(tc: ParsedTestCase): boolean {
  const titleHaystack = tc.title.toLowerCase();
  if (NEGATIVE_PATTERNS.some((p) => p.test(titleHaystack))) return true;

  const expectedHaystack = tc.expectedResults.join(' ').toLowerCase();
  if (
    NEGATIVE_PATTERNS.some((p) => p.test(expectedHaystack)) ||
    /hata\s*mesaj/i.test(expectedHaystack) ||
    /bulunamad[ıi]/i.test(expectedHaystack)
  ) {
    return true;
  }
  return false;
}

/* ────────────────────────────────────────────────────────────────────────
   Step 7 – High-quality synthesis templates (fallback)
   ──────────────────────────────────────────────────────────────────────── */

type TemplateFn = (pd: PageData, feature: Feature) => Omit<ParsedTestCase, 'id'>;

const TEMPLATES: Record<string, TemplateFn> = {
  login: (pd) => ({
    title: 'Geçerli Bilgilerle Sisteme Giriş Yapma',
    preconditions: [
      `Kullanıcı "${pd.title || 'giriş'}" sayfasındadır.`,
      'Kullanıcının kayıtlı bir e-posta adresi ve şifresi bulunmaktadır.',
    ],
    steps: [
      'E-posta alanına kayıtlı e-posta adresi yazılır.',
      'Şifre alanına ilgili şifre yazılır.',
      '"Giriş Yap" butonuna tıklanır.',
    ],
    expectedResults: [
      'Kullanıcı sisteme başarıyla giriş yapar.',
      'Kullanıcı ana sayfaya veya panel sayfasına yönlendirilir.',
    ],
  }),
  register: (pd) => ({
    title: 'Yeni Kullanıcı Hesabı Oluşturma',
    preconditions: [
      `Kullanıcı "${pd.title || 'kayıt'}" sayfasındadır.`,
      'Kullanıcının sistemde daha önce kayıtlı olmayan bir e-posta adresi bulunmaktadır.',
    ],
    steps: [
      'Ad ve soyad alanları doldurulur.',
      'Geçerli bir e-posta adresi yazılır.',
      'Şifre alanına güvenli bir şifre yazılır.',
      'Şifre tekrar alanına aynı şifre girilir.',
      '"Kayıt Ol" butonuna tıklanır.',
    ],
    expectedResults: [
      'Yeni kullanıcı hesabı başarıyla oluşturulur.',
      'Kullanıcı onay sayfasına veya giriş ekranına yönlendirilir.',
    ],
  }),
  search: (pd) => ({
    title: 'Arama Kutusu ile Ürün / İçerik Arama',
    preconditions: [
      `Kullanıcı "${pd.title || 'ana'}" sayfasındadır.`,
      'Sayfadaki arama kutusu görünür durumdadır.',
    ],
    steps: [
      'Arama kutusuna geçerli bir anahtar kelime yazılır.',
      'Enter tuşuna basılır veya arama butonuna tıklanır.',
    ],
    expectedResults: [
      'Arama sonuçları sayfası açılır.',
      'Sonuç sayfasında anahtar kelimeyle ilgili en az bir öğe listelenir.',
    ],
  }),
  contact: (pd) => ({
    title: 'İletişim Formunu Doldurarak Mesaj Gönderme',
    preconditions: [`Kullanıcı "${pd.title || 'iletişim'}" sayfasındadır.`],
    steps: [
      'Ad ve e-posta alanları doldurulur.',
      'Mesaj alanına bir metin yazılır.',
      '"Gönder" butonuna tıklanır.',
    ],
    expectedResults: [
      'Form başarıyla gönderilir.',
      'Kullanıcıya teşekkür / onay mesajı gösterilir.',
    ],
  }),
  newsletter: (pd) => ({
    title: 'Bülten Aboneliği Oluşturma',
    preconditions: [
      `Kullanıcı "${pd.title || 'ana'}" sayfasındadır.`,
      'Bülten abonelik alanı görünür durumdadır.',
    ],
    steps: [
      'E-posta adresi alanına geçerli bir e-posta yazılır.',
      '"Abone Ol" butonuna tıklanır.',
    ],
    expectedResults: [
      'Abonelik başarıyla oluşturulur.',
      'Kullanıcıya abonelik onayı mesajı gösterilir.',
    ],
  }),
  form: (pd, f) => {
    const submitText = f.name.replace(/ formu$/i, '').trim() || 'Gönder';
    return {
      title: `${submitText} Formunu Doldurarak Gönderme`,
      preconditions: [`Kullanıcı "${pd.title || 'ilgili'}" sayfasındadır.`],
      steps: [
        'Formdaki tüm zorunlu alanlar geçerli verilerle doldurulur.',
        `"${submitText}" butonuna tıklanır.`,
      ],
      expectedResults: [
        'Form başarıyla işlenir ve gönderilir.',
        'Kullanıcıya başarı geri bildirimi gösterilir.',
      ],
    };
  },
  navigation: (pd) => {
    const linkNames =
      pd.links
        .slice(0, 3)
        .map((l) => `"${l.text}"`)
        .join(', ') || '"Ana Sayfa"';
    return {
      title: 'Üst Menü Navigasyonu ile Sayfalar Arası Geçiş',
      preconditions: [`Kullanıcı "${pd.title || 'ana'}" sayfasındadır.`],
      steps: [`Üst menüdeki ${linkNames} bağlantılarından birine tıklanır.`],
      expectedResults: [
        'Tıklanan menüye ait sayfa açılır.',
        'URL yeni sayfaya göre güncellenir ve içerik hatasız yüklenir.',
      ],
    };
  },
  cta: (pd, f) => {
    const ctaText = f.name.replace(/^"|"\s*aksiyonu$/g, '').replace(/"\s*$/, '');
    return {
      title: `${ctaText} Butonuna Tıklayarak İlgili Akışı Başlatma`,
      preconditions: [`Kullanıcı "${pd.title || 'sayfa'}" sayfasındadır.`],
      steps: [`Sayfadaki "${ctaText}" butonuna tıklanır.`],
      expectedResults: [
        'İlgili akış başlatılır ve hedef sayfa veya modal hatasız açılır.',
        'Açılan ekran beklenen başlığı ve gerekli alanları içerir.',
      ],
    };
  },
  'page-load': (pd) => ({
    title: 'Sayfanın Hatasız Yüklenmesi',
    preconditions: [`"${pd.title || 'Sayfa'}" URL'si tarayıcıda açılır.`],
    steps: ['Sayfa adresine gidilir.', 'Sayfanın yüklenmesi beklenir.'],
    expectedResults: [
      'Sayfa başlığı, üst menü, ana içerik ve alt bilgi bölümleri eksiksiz görüntülenir.',
      'Tarayıcı konsolunda kritik bir hata oluşmaz.',
    ],
  }),
  'page-links': (pd) => ({
    title: 'Sayfa İçi Linklerin Çalışması',
    preconditions: [`Kullanıcı "${pd.title || 'sayfa'}" üzerindedir.`],
    steps: ['Sayfadaki herhangi bir hyperlink üzerine tıklanır.'],
    expectedResults: [
      'Hedef sayfa hatasız olarak açılır.',
      'Link 404 veya kırık bağlantı hatası vermez.',
    ],
  }),
  'page-refresh': (pd) => ({
    title: 'Sayfa Yenileme Davranışı',
    preconditions: [`Kullanıcı "${pd.title || 'sayfa'}" üzerindedir.`],
    steps: ['Tarayıcıda F5 tuşuna basılır veya yenile butonuna tıklanır.'],
    expectedResults: [
      'Sayfa içerik kaybı olmadan yeniden yüklenir.',
      'Kullanıcının görüntülediği bölüm tutarlı şekilde gelir.',
    ],
  }),
  'browser-nav': (pd) => ({
    title: 'Tarayıcı Geri Butonu ile Önceki Sayfaya Dönme',
    preconditions: [
      `Kullanıcı "${pd.title || 'sayfa'}" sayfasından başka bir sayfaya geçmiştir.`,
    ],
    steps: ['Tarayıcının "Geri" butonuna tıklanır.'],
    expectedResults: [
      'Önceki sayfaya dönüş sağlanır.',
      'Sayfa içeriği önceki durumuyla tutarlı şekilde görüntülenir.',
    ],
  }),
  responsive: (pd) => ({
    title: 'Responsive (Mobil/Tablet) Görüntü Kontrolü',
    preconditions: [`Kullanıcı "${pd.title || 'sayfa'}" üzerindedir.`],
    steps: [
      'Tarayıcı penceresi tablet (768px) veya mobil (375px) genişliğine küçültülür.',
    ],
    expectedResults: [
      'Sayfa içeriği yeni boyuta uygun olarak yeniden düzenlenir.',
      'Metinler okunaklı, butonlar tıklanabilir kalır ve yatay scroll oluşmaz.',
    ],
  }),
  generic: (_, f) => ({
    title: `${f.name} Kullanım Senaryosu`,
    preconditions: ['İlgili sayfa açıktır.'],
    steps: [`${f.name} ile ilgili adımlar sırayla uygulanır.`],
    expectedResults: ['Beklenen davranış sorunsuz şekilde gerçekleşir.'],
  }),
};

function synthesizeFromFeature(
  feature: Feature,
  pageData: PageData,
  idx: number,
): ParsedTestCase {
  let key = feature.intent;
  if (key.startsWith('cta:')) key = 'cta';
  else if (key.startsWith('form:')) key = 'form';
  const tpl = TEMPLATES[key] || TEMPLATES.generic;
  const built = tpl(pageData, feature);
  return {
    id: `TC-${String(idx + 1).padStart(3, '0')}`,
    ...built,
  };
}

/* ────────────────────────────────────────────────────────────────────────
   Step 8 – Orchestrator: per-feature parallel calls + fallback
   ──────────────────────────────────────────────────────────────────────── */

async function generateForAllFeatures(
  pageData: PageData,
  features: Feature[],
): Promise<{ testCases: ParsedTestCase[]; modelReachable: boolean }> {
  let modelReachable = false;

  const tasks = features.map(async (feature, idx) => {
    try {
      const prompt = buildSingleFeaturePrompt(pageData, feature);
      const text = await callModal(prompt);
      modelReachable = true;
      const parsed = parseTestCases(text);
      const positive = parsed.filter((c) => !isLikelyNegativeCase(c));
      const chosen = positive[0] ?? parsed[0];
      if (chosen) {
        return {
          ...chosen,
          id: `TC-${String(idx + 1).padStart(3, '0')}`,
          title: stripCategoryFromTitle(chosen.title) || feature.name,
        };
      }
    } catch (err) {
      console.warn(`[crawl] Feature "${feature.name}" model call failed:`, (err as Error).message);
    }
    return synthesizeFromFeature(feature, pageData, idx);
  });

  const testCases = await Promise.all(tasks);
  return { testCases, modelReachable };
}

/* ────────────────────────────────────────────────────────────────────────
   Controller
   ──────────────────────────────────────────────────────────────────────── */

export const crawlAndGenerate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, html, cookies } = req.body as {
      url?: string;
      html?: string;
      cookies?: string;
    };

    if (!url && !html) {
      res.status(400).json({ error: 'URL veya HTML zorunludur' });
      return;
    }

    const pageData = await crawlPage({ url, html, cookies });
    const features = inferFeatures(pageData);
    const { testCases, modelReachable } = await generateForAllFeatures(pageData, features);

    res.status(200).json({
      url: url ?? '',
      pageTitle: pageData.title,
      pageSummary:
        pageData.description || pageData.headings.join('. ') || pageData.title || '-',
      detectedElements: pageData.stats,
      features: features.map((f) => ({ intent: f.intent, name: f.name })),
      modelReachable,
      testCases,
    });
  } catch (error: any) {
    console.error('Crawl Error:', error);
    res.status(500).json({ error: error.message || 'Crawl işlemi başarısız oldu' });
  }
};
