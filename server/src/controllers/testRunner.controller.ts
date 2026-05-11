import { Request, Response, NextFunction } from 'express';
import { runTestCases, UrlValidationError } from '../utils/playwrightRunner';

const MAX_CASES = 10;
const MAX_STEPS_PER_CASE = 30;
const MAX_STR_LEN = 500;

const sanitizeString = (val: unknown, maxLen = MAX_STR_LEN): string =>
  String(val ?? '').slice(0, maxLen);

const sanitizeArray = (val: unknown, maxItems: number, maxStrLen = MAX_STR_LEN): string[] => {
  if (!Array.isArray(val)) return [];
  return val
    .slice(0, maxItems)
    .map((item) => sanitizeString(item, maxStrLen))
    .filter((s) => s.length > 0);
};

const inFlight = new Set<string>();

export const runAITests = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Yetkisiz' });
      return;
    }

    const userId = String((req.user as any)?.id ?? (req.user as any)?._id ?? 'anon');

    if (inFlight.has(userId)) {
      res.status(429).json({ error: 'Önceki test koşumu hala devam ediyor, lütfen bekleyin.' });
      return;
    }

    const { url, testCases, headed } = req.body as {
      url?: unknown;
      testCases?: unknown;
      headed?: unknown;
    };
    const isDev = process.env.NODE_ENV !== 'production';
    const headedFlag = isDev && headed === true;

    if (typeof url !== 'string' || url.length === 0 || url.length > 2048) {
      res.status(400).json({ error: 'Geçerli bir URL gönderin (max 2048 karakter)' });
      return;
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
      res.status(400).json({ error: 'En az bir test case gönderilmelidir' });
      return;
    }

    if (testCases.length > MAX_CASES) {
      res.status(400).json({ error: `En fazla ${MAX_CASES} test case desteklenir` });
      return;
    }

    const validated = testCases.map((tc: any, idx: number) => ({
      id: sanitizeString(tc?.id ?? `TC-${String(idx + 1).padStart(3, '0')}`, 32),
      title: sanitizeString(tc?.title, 200),
      preconditions: sanitizeArray(tc?.preconditions, 20),
      steps: sanitizeArray(tc?.steps, MAX_STEPS_PER_CASE),
      expectedResults: sanitizeArray(tc?.expectedResults, 20),
    }));

    if (validated.every((tc) => tc.steps.length === 0)) {
      res.status(400).json({ error: 'Test case adımları boş gönderilemez' });
      return;
    }

    inFlight.add(userId);
    try {
      const output = await runTestCases({ url, testCases: validated, headed: headedFlag });
      res.status(200).json(output);
    } catch (err) {
      if (err instanceof UrlValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      const msg = err instanceof Error ? err.message : 'Test koşumu başarısız';
      const lower = msg.toLowerCase();
      if (lower.includes('executable') || lower.includes("doesn't exist")) {
        res.status(503).json({
          error:
            'Playwright tarayıcısı kurulu değil. Sunucuda `npx playwright install chromium` çalıştırın.',
        });
        return;
      }
      res.status(502).json({ error: msg });
    } finally {
      inFlight.delete(userId);
    }
  } catch (err) {
    next(err);
  }
};
