import dns from 'dns/promises';
import { chromium, Browser, BrowserContext, Page } from 'playwright';

/* ────────────────────────────────────────────────────────────────────────
   Public types
   ──────────────────────────────────────────────────────────────────────── */

export interface ParsedTestCase {
  id: string;
  title: string;
  preconditions: string[];
  steps: string[];
  expectedResults: string[];
}

export interface StepResult {
  step: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
  durationMs: number;
}

export interface TestRunResult {
  testCaseId: string;
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  errorMessage?: string;
  stepResults: StepResult[];
  screenshotBase64?: string;
  finalUrl?: string;
  durationMs: number;
}

export interface RunTestsOptions {
  url: string;
  testCases: ParsedTestCase[];
  headed?: boolean;
  slowMo?: number;
}

export interface RunTestsOutput {
  url: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  summary: { total: number; passed: number; failed: number; skipped: number };
  results: TestRunResult[];
}

/* ────────────────────────────────────────────────────────────────────────
   Security: URL validation + SSRF defenses
   ──────────────────────────────────────────────────────────────────────── */

const PRIVATE_IPV4_PATTERNS: RegExp[] = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
  /^198\.1[89]\./, // benchmark
  /^203\.0\.113\./, // TEST-NET-3
  /^192\.0\.2\./, // TEST-NET-1
  /^198\.51\.100\./, // TEST-NET-2
  /^255\.255\.255\.255$/,
];

function isPrivateIpv4(ip: string): boolean {
  return PRIVATE_IPV4_PATTERNS.some((p) => p.test(ip));
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA
  if (/^fe[89ab]/.test(lower)) return true; // link-local
  if (lower.startsWith('fec0')) return true;
  if (lower.startsWith('ff')) return true; // multicast
  return false;
}

function isLocalHostname(host: string): boolean {
  const h = host.toLowerCase().trim();
  if (!h) return true;
  if (['localhost', '0.0.0.0', '::', '::1'].includes(h)) return true;
  if (h.endsWith('.local')) return true;
  if (h.endsWith('.localhost')) return true;
  if (h.endsWith('.internal')) return true;
  if (h.endsWith('.lan')) return true;
  return false;
}

function isIpv4Literal(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function isIpv6Literal(host: string): boolean {
  return host.includes(':');
}

export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UrlValidationError';
  }
}

export async function validateStartUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UrlValidationError('Geçersiz URL formatı');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new UrlValidationError('Sadece http:// veya https:// adresleri desteklenir');
  }

  const host = parsed.hostname;
  if (!host) throw new UrlValidationError('URL host bilgisi yok');

  if (isLocalHostname(host)) {
    throw new UrlValidationError('Yerel ağ adresleri (localhost / .local / .internal) test edilemez');
  }

  if (isIpv4Literal(host) && isPrivateIpv4(host)) {
    throw new UrlValidationError(`Özel/yerel IPv4 (${host}) test edilemez`);
  }

  if (isIpv6Literal(host) && isPrivateIpv6(host)) {
    throw new UrlValidationError(`Özel/yerel IPv6 (${host}) test edilemez`);
  }

  try {
    const addresses = await dns.lookup(host, { all: true });
    for (const a of addresses) {
      if (a.family === 4 && isPrivateIpv4(a.address)) {
        throw new UrlValidationError(
          `Adresin çözümlendiği IP (${a.address}) özel ağa ait — güvenlik nedeniyle reddedildi`,
        );
      }
      if (a.family === 6 && isPrivateIpv6(a.address)) {
        throw new UrlValidationError(
          `Adresin çözümlendiği IPv6 (${a.address}) özel ağa ait — güvenlik nedeniyle reddedildi`,
        );
      }
    }
  } catch (err: any) {
    if (err instanceof UrlValidationError) throw err;
    throw new UrlValidationError(`Adres çözümlenemedi: ${err.message || String(err)}`);
  }
}

/* ────────────────────────────────────────────────────────────────────────
   Browser context with runtime SSRF filter + dialog/download blocks
   ──────────────────────────────────────────────────────────────────────── */

async function setupContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: false,
    bypassCSP: false,
    javaScriptEnabled: true,
    acceptDownloads: false,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AITestRunner/1.0',
  });

  await context.route('**/*', async (route) => {
    const reqUrl = route.request().url();

    if (
      reqUrl.startsWith('data:') ||
      reqUrl.startsWith('blob:') ||
      reqUrl.startsWith('about:')
    ) {
      return route.continue();
    }

    if (!/^https?:/i.test(reqUrl)) {
      return route.abort('blockedbyclient');
    }

    try {
      const u = new URL(reqUrl);
      const h = u.hostname;
      if (isLocalHostname(h)) return route.abort('blockedbyclient');
      if (isIpv4Literal(h) && isPrivateIpv4(h)) return route.abort('blockedbyclient');
      if (isIpv6Literal(h) && isPrivateIpv6(h)) return route.abort('blockedbyclient');
    } catch {
      return route.abort('blockedbyclient');
    }

    return route.continue();
  });

  return context;
}

/* ────────────────────────────────────────────────────────────────────────
   Step interpretation – converts Turkish natural-language steps into actions
   ──────────────────────────────────────────────────────────────────────── */

function synthesizeFillValue(label: string, rawValue: string): string {
  const quoted = rawValue.match(/["“'']([^"”'']{1,80})["”'']/);
  if (quoted && quoted[1]) return quoted[1];

  const ll = label.toLowerCase();
  if (/e-?posta|email|mail/.test(ll)) return 'test.user@example.com';
  if (/şifre|parola|password/.test(ll)) return 'TestPass123!';
  if (/soyad|last.?name/.test(ll)) return 'User';
  if (/ad\b(?!res)|isim|first.?name|\bname\b/.test(ll)) return 'Test';
  if (/telefon|phone|gsm/.test(ll)) return '5551112233';
  if (/mesaj|message|yorum|comment/.test(ll)) return 'Otomatik test mesajıdır.';
  if (/arama|search|sorgu|query/.test(ll)) return 'test';
  if (/url|website|site/.test(ll)) return 'https://example.com';
  if (/yaş|age|number|sayı|miktar/.test(ll)) return '25';
  if (/şehir|city/.test(ll)) return 'Istanbul';
  if (/ülke|country/.test(ll)) return 'Turkey';
  if (/adres|address/.test(ll)) return 'Test Address 123';
  if (/kart|card/.test(ll)) return '4242424242424242';
  if (/cvv|cvc/.test(ll)) return '123';
  return 'test';
}

async function clickByText(page: Page, text: string, timeout = 8_000): Promise<void> {
  const trimmed = text.trim();
  const candidates: Array<() => ReturnType<Page['locator']>> = [
    () => page.getByRole('button', { name: trimmed, exact: false }) as any,
    () => page.getByRole('link', { name: trimmed, exact: false }) as any,
    () => page.getByRole('menuitem', { name: trimmed, exact: false }) as any,
    () => page.locator(`button:has-text("${trimmed.replace(/"/g, '\\"')}")`),
    () => page.locator(`a:has-text("${trimmed.replace(/"/g, '\\"')}")`),
    () => page.locator(`[role="button"]:has-text("${trimmed.replace(/"/g, '\\"')}")`),
    () => page.getByText(trimmed, { exact: false }) as any,
  ];

  for (const factory of candidates) {
    try {
      const loc = factory().first();
      const count = await loc.count();
      if (count > 0) {
        await loc.click({ timeout });
        return;
      }
    } catch {
      /* try next */
    }
  }
  throw new Error(`"${trimmed}" elementi bulunamadı veya tıklanamadı`);
}

async function fillByLabelOrPlaceholder(
  page: Page,
  labelText: string,
  value: string,
  timeout = 8_000,
): Promise<void> {
  const cleaned = labelText
    .replace(/\s*(alan[ıi]?|kutu(?:su)?|input|field)\s*$/i, '')
    .trim();

  const safe = cleaned.replace(/"/g, '\\"');

  const candidates: Array<() => ReturnType<Page['locator']>> = [
    () => page.getByLabel(cleaned, { exact: false }) as any,
    () => page.getByPlaceholder(cleaned) as any,
    () => page.getByPlaceholder(new RegExp(cleaned, 'i')) as any,
    () => page.locator(`input[name*="${safe.toLowerCase()}" i]`),
    () => page.locator(`input[aria-label*="${safe}" i]`),
    () => page.locator(`textarea[name*="${safe.toLowerCase()}" i]`),
  ];

  for (const factory of candidates) {
    try {
      const loc = factory().first();
      const count = await loc.count();
      if (count > 0) {
        await loc.fill(value, { timeout });
        return;
      }
    } catch {
      /* try next */
    }
  }

  // Type-based fallback
  if (/şifre|parola|password/i.test(labelText)) {
    const loc = page.locator('input[type="password"]').first();
    if ((await loc.count()) > 0) {
      await loc.fill(value, { timeout });
      return;
    }
  }
  if (/e-?posta|email/i.test(labelText)) {
    const loc = page.locator('input[type="email"]').first();
    if ((await loc.count()) > 0) {
      await loc.fill(value, { timeout });
      return;
    }
  }
  if (/arama|search/i.test(labelText)) {
    const loc = page.locator('input[type="search"], input[name="q"]').first();
    if ((await loc.count()) > 0) {
      await loc.fill(value, { timeout });
      return;
    }
  }

  throw new Error(`"${labelText}" alanı bulunamadı veya doldurulamadı`);
}

async function executeStep(page: Page, stepText: string): Promise<void> {
  const step = stepText.trim();

  if (/\bf5\b|yenile/i.test(step)) {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 });
    return;
  }

  if (/(geri\s*(buton|tuş|nav)|tarayıcı.*geri|page\.?goback|history\.back)/i.test(step)) {
    const before = page.url();
    try {
      const link = page.locator('a[href]:not([href^="javascript:"]):not([href^="#"])').first();
      if ((await link.count()) > 0 && before.replace(/#.*/, '') === before) {
        await link.click({ timeout: 5_000 });
        await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
      }
    } catch {
      /* ignore */
    }
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15_000 });
    return;
  }

  const pxMatch = step.match(/(\d{3,4})\s*px/i);
  if (
    pxMatch &&
    pxMatch[1] &&
    /(küçült|büyüt|resize|viewport|tablet|mobil|genişl|ekran|boyut)/i.test(step)
  ) {
    const width = Math.max(320, Math.min(1920, parseInt(pxMatch[1], 10)));
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(300);
    return;
  }

  if (/enter\s*tuş|tab\s*tuş/i.test(step)) {
    const key = /tab/i.test(step) ? 'Tab' : 'Enter';
    await page.keyboard.press(key);
    await page.waitForLoadState('domcontentloaded', { timeout: 8_000 }).catch(() => {});
    return;
  }

  if (
    /sayfa\s*adres|sayfaya?\s*gid|sayfanın\s*yüklenmesi|yüklenme(?:si)?\s*beklen|sayfa\s*aç[ıi]l/i.test(
      step,
    )
  ) {
    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
    return;
  }

  const clickMatch = step.match(
    /["“'']([^"”'']{1,60})["”'']\s*(?:buton|tuş|link|aksiyon|menü|menüsü|sekme)?[a-zçğıöşü]*\s*t[ıi]klan/i,
  );
  if (clickMatch && clickMatch[1]) {
    await clickByText(page, clickMatch[1]);
    await page.waitForLoadState('domcontentloaded', { timeout: 8_000 }).catch(() => {});
    return;
  }

  if (
    /(hyperlink|link|menü\s*öğesi|menüye|nav(?:igasyon)?)\s*(?:üzerine|öğesine)?\s*t[ıi]klan/i.test(
      step,
    )
  ) {
    const link = page
      .locator('a[href]:not([href^="javascript:"]):not([href^="#"])')
      .first();
    if ((await link.count()) > 0) {
      await link.click({ timeout: 8_000 });
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
      return;
    }
    throw new Error('Tıklanacak link bulunamadı');
  }

  const fillMatch = step.match(
    /([\wçğıöşüÇĞİÖŞÜ\-\s\.]+?)\s*(?:alan|kutu)(?:[ıi]?n[aei]|usuna|sına|ı|u|a)?\s*(.*?)\s*(?:yaz[ıi]l|gir[ıi]l|gir[ıi]r|doldurul)/iu,
  );
  if (fillMatch && fillMatch[1]) {
    const labelText = fillMatch[1].trim();
    const valueRaw = (fillMatch[2] || '').trim();
    const value = synthesizeFillValue(labelText, valueRaw);
    await fillByLabelOrPlaceholder(page, labelText, value);
    return;
  }

  // Observational / undecodable step — treat as no-op (not failure)
}

/* ────────────────────────────────────────────────────────────────────────
   Orchestrator
   ──────────────────────────────────────────────────────────────────────── */

const PER_STEP_TIMEOUT_MS = 12_000;
const PER_TEST_TIMEOUT_MS = 60_000;
const TOTAL_TIMEOUT_MS = 5 * 60_000;
const NAV_TIMEOUT_MS = 20_000;
const MAX_CONCURRENT_HEADLESS = 3;
const MAX_CONCURRENT_HEADED = 1;
const HEADED_SLOW_MO_MS = 400;
const HEADED_PER_STEP_TIMEOUT_MS = 18_000;
const HEADED_PER_TEST_TIMEOUT_MS = 120_000;
const HEADED_TOTAL_TIMEOUT_MS = 10 * 60_000;

function timeoutPromise<T>(ms: number, label: string): Promise<T> {
  return new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(label)), ms),
  );
}

async function runOneCase(
  browser: Browser,
  startUrl: string,
  tc: ParsedTestCase,
  opts: { perStepTimeoutMs: number; headed: boolean },
): Promise<TestRunResult> {
  const testStart = Date.now();
  const stepResults: StepResult[] = [];
  let context: BrowserContext | null = null;

  try {
    context = await setupContext(browser);
    const page = await context.newPage();
    page.on('dialog', (d) => d.dismiss().catch(() => {}));
    page.on('download', (d) => d.cancel().catch(() => {}));
    page.setDefaultTimeout(opts.perStepTimeoutMs);
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
    if (opts.headed) {
      try {
        await page.bringToFront();
      } catch {
        /* ignore */
      }
    }

    await Promise.race([
      page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS }),
      timeoutPromise<never>(NAV_TIMEOUT_MS + 2_000, 'Sayfa açma zaman aşımı'),
    ]);

    let testFailed = false;
    let firstError = '';
    for (let i = 0; i < tc.steps.length; i += 1) {
      const stepText = tc.steps[i] as string;
      const stepStart = Date.now();

      try {
        await Promise.race([
          executeStep(page, stepText),
          timeoutPromise<never>(opts.perStepTimeoutMs, 'Adım zaman aşımı'),
        ]);
        stepResults.push({
          step: stepText,
          status: 'passed',
          durationMs: Date.now() - stepStart,
        });
      } catch (err: any) {
        const msg = err?.message ? String(err.message).split('\n')[0] : String(err);
        stepResults.push({
          step: stepText,
          status: 'failed',
          error: msg,
          durationMs: Date.now() - stepStart,
        });
        testFailed = true;
        firstError = msg ?? '';
        for (let j = i + 1; j < tc.steps.length; j += 1) {
          stepResults.push({ step: tc.steps[j] as string, status: 'skipped', durationMs: 0 });
        }
        break;
      }
    }

    let screenshotBase64: string | undefined;
    try {
      const buf = await page.screenshot({
        type: 'jpeg',
        quality: 55,
        fullPage: false,
        timeout: 8_000,
      });
      screenshotBase64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
    } catch {
      /* ignore */
    }

    const finalUrl = page.url();

    return {
      testCaseId: tc.id,
      title: tc.title,
      status: testFailed ? 'failed' : 'passed',
      errorMessage: testFailed ? firstError : undefined,
      stepResults,
      screenshotBase64,
      finalUrl,
      durationMs: Date.now() - testStart,
    };
  } catch (err: any) {
    return {
      testCaseId: tc.id,
      title: tc.title,
      status: 'failed',
      errorMessage: err?.message ? String(err.message).split('\n')[0] : String(err),
      stepResults,
      durationMs: Date.now() - testStart,
    };
  } finally {
    if (context) await context.close().catch(() => {});
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIdx = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (true) {
      const idx = nextIdx;
      nextIdx += 1;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx] as T);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function runTestCases(options: RunTestsOptions): Promise<RunTestsOutput> {
  await validateStartUrl(options.url);

  const startedAt = new Date();
  const limitedCases = options.testCases.slice(0, 10);

  const headed = options.headed === true;
  const slowMo = headed ? Math.max(0, Math.min(2000, options.slowMo ?? HEADED_SLOW_MO_MS)) : 0;
  const concurrency = headed ? MAX_CONCURRENT_HEADED : MAX_CONCURRENT_HEADLESS;
  const perStepTimeout = headed ? HEADED_PER_STEP_TIMEOUT_MS : PER_STEP_TIMEOUT_MS;
  const perTestTimeout = headed ? HEADED_PER_TEST_TIMEOUT_MS : PER_TEST_TIMEOUT_MS;
  const totalTimeout = headed ? HEADED_TOTAL_TIMEOUT_MS : TOTAL_TIMEOUT_MS;

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: !headed,
      slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const runAll = async () => {
      const wrapped = limitedCases.map((tc) => async () =>
        Promise.race([
          runOneCase(browser as Browser, options.url, tc, {
            perStepTimeoutMs: perStepTimeout,
            headed,
          }),
          timeoutPromise<TestRunResult>(perTestTimeout + 5_000, 'Test süresi aşıldı').catch(
            (err) => ({
              testCaseId: tc.id,
              title: tc.title,
              status: 'failed' as const,
              errorMessage: err.message,
              stepResults: [],
              durationMs: perTestTimeout,
            }),
          ),
        ]),
      );
      return runWithConcurrency(wrapped, concurrency, (factory) => factory());
    };

    const allResults = await Promise.race([
      runAll(),
      timeoutPromise<TestRunResult[]>(totalTimeout, 'Toplam koşum süresi aşıldı'),
    ]);

    const finishedAt = new Date();
    const summary = {
      total: allResults.length,
      passed: allResults.filter((r) => r.status === 'passed').length,
      failed: allResults.filter((r) => r.status === 'failed').length,
      skipped: allResults.filter((r) => r.status === 'skipped').length,
    };

    return {
      url: options.url,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      summary,
      results: allResults,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
