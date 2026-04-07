export interface AICaseGenerationInput {
  userStory: string;
  acceptanceCriteria: string[];
}

export interface AITestCaseSuggestion {
  testCaseId: string;
  userType: string;
  platform: 'Web' | 'iOS' | 'Android' | 'TV';
  module: string;
  testScenario: string;
  testCase: string;
  preConditions: string;
  testData: string;
  testStep: string;
  expectedResult: string;
}

export interface AIRegressionSetSuggestion {
  name: string;
  description: string;
  platform: 'Web' | 'iOS' | 'Android' | 'TV';
  testCases: AITestCaseSuggestion[];
}

export interface AICaseGenerationResult {
  regressionSets: AIRegressionSetSuggestion[];
}

export class LLMRequestError extends Error {
  statusCode: number;
  retryable: boolean;

  constructor(message: string, statusCode = 502, retryable = false) {
    super(message);
    this.name = 'LLMRequestError';
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

const ALLOWED_PLATFORMS = ['Web', 'iOS', 'Android', 'TV'] as const;
const MAX_TEST_CASES_PER_REQUEST = 3;

const SYSTEM_PROMPT = `
You are a senior QA analyst.
Return ONLY test cases in strict JSON.

OUTPUT FORMAT (STRICT JSON ONLY, NO EXTRA KEYS)
{
  "testCases": [
    {
      "testCaseId": "TC-001",
      "userType": "Guest|Registered|Admin",
      "platform": "Web|iOS|Android|TV",
      "module": "string",
      "testScenario": "string",
      "testCase": "string",
      "preConditions": "string",
      "testData": "string",
      "testStep": "1) ...\\n2) ...\\n3) ...",
      "expectedResult": "string"
    }
  ]
}

MANDATORY RULES
1) Return exactly 3 testCases (not less, not more).
2) Use exactly these keys for each test case.
3) testCaseId regex: ^TC-[0-9]{3}$.
4) platform must be one of: Web, iOS, Android, TV.
5) testStep must be numbered multiline steps with at least 3 steps.
6) Cover positive + negative + edge/validation scenarios in these 3 cases.
7) Keep answers concise to reduce token usage.
8) JSON only. No markdown, no prose, no explanations.
`.trim();

const USER_PROMPT_TEMPLATE = (input: AICaseGenerationInput): string => `
Generate only 3 test cases for this input.

User story:
${input.userStory}

Acceptance criteria:
${input.acceptanceCriteria.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}
`.trim();

type RawLLMResponse = {
  testCases?: unknown[];
  regressionSets?: Array<{
    name?: unknown;
    description?: unknown;
    platform?: unknown;
    testCases?: unknown[];
  }>;
};

const coerceRawTestCases = (raw: RawLLMResponse): unknown[] => {
  if (Array.isArray(raw.testCases)) return raw.testCases;
  if (Array.isArray(raw.regressionSets) && Array.isArray(raw.regressionSets[0]?.testCases)) {
    return raw.regressionSets[0].testCases as unknown[];
  }
  return [];
};

const coerceMeta = (raw: RawLLMResponse): { name: string; description: string; platform: 'Web' | 'iOS' | 'Android' | 'TV' } => {
  if (!Array.isArray(raw.regressionSets) || !raw.regressionSets[0]) {
    return {
      name: 'AI Generated Regression Set',
      description: 'User story ve acceptance criteria temel alınarak oluşturulmuş öneri seti.',
      platform: 'Web',
    };
  }
  const first = raw.regressionSets[0];
  const platform =
    typeof first.platform === 'string' && ALLOWED_PLATFORMS.includes(first.platform as any)
      ? (first.platform as 'Web' | 'iOS' | 'Android' | 'TV')
      : 'Web';
  return {
    name: normalizeText(first.name, 'AI Generated Regression Set'),
    description: normalizeText(
      first.description,
      'User story ve acceptance criteria temel alınarak oluşturulmuş öneri seti.',
    ),
    platform,
  };
};

/*
Previous extended prompt intentionally removed for token efficiency and hard-output control.
*/
const _LEGACY_PROMPT_REMOVED = true;

/*
Old shape reference kept here as a typed contract:
{
  "regressionSets": [
    {
      "name": "string",
      "description": "string",
      "platform": "Web|iOS|Android|TV",
      "testCases": [
        {
          "testCaseId": "TC-001",
          "userType": "Guest|Registered|Admin",
          "platform": "Web|iOS|Android|TV",
          "module": "string",
          "testScenario": "string",
          "testCase": "string",
          "preConditions": "string",
          "testData": "string",
          "testStep": "1) ...\\n2) ...\\n3) ...",
          "expectedResult": "string"
        }
      ]
    }
  ]
}
*/

const extractJson = (raw: string): string => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('LLM response is not valid JSON');
  }
  return raw.slice(start, end + 1);
};

const sleep = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

const isLikelyJsonParseError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('json') ||
    message.includes('expected') ||
    message.includes('unterminated') ||
    message.includes('unexpected end')
  );
};

export const generateRegressionSetsFromText = async (
  input: AICaseGenerationInput,
): Promise<AICaseGenerationResult> => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  const prompt = USER_PROMPT_TEMPLATE(input);
  const buildPayload = (maxTokens: number) => ({
    model,
    temperature: 0.1,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' as const },
    messages: [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: prompt },
    ],
  });

  const requestAndParse = async (maxTokens: number): Promise<RawLLMResponse> => {
    const payload = buildPayload(maxTokens);

    let response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    // Retry once for temporary rate-limits.
    if (response.status === 429) {
      await sleep(1200);
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    }

    if (!response.ok) {
      let providerMessage = '';
      try {
        const errBody = (await response.json()) as {
          error?: { message?: string; type?: string; code?: string };
        };
        providerMessage = errBody.error?.message ?? '';
      } catch {
        providerMessage = '';
      }

      if (response.status === 429) {
        throw new LLMRequestError(
          providerMessage ||
            'AI provider rate limit or quota exceeded. Please retry shortly or check billing/quota.',
          429,
          true,
        );
      }

      throw new LLMRequestError(
        providerMessage || `LLM request failed with status ${response.status}`,
        response.status >= 400 && response.status < 500 ? 400 : 502,
        false,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    return JSON.parse(extractJson(content)) as RawLLMResponse;
  };

  try {
    const parsed = await requestAndParse(420);
    return normalizeAIResult(parsed, MAX_TEST_CASES_PER_REQUEST);
  } catch (error) {
    // If provider returned cut/incomplete JSON, retry once with a slightly higher output budget.
    if (isLikelyJsonParseError(error)) {
      const parsed = await requestAndParse(520);
      return normalizeAIResult(parsed, MAX_TEST_CASES_PER_REQUEST);
    }

    if (error instanceof LLMRequestError) {
      throw error;
    }

    throw new LLMRequestError(
      error instanceof Error ? error.message : 'Failed to parse AI response',
      502,
      false,
    );
  }
};

const normalizeText = (value: unknown, fallback = 'N/A'): string => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : fallback;
};

const normalizeMultilineSteps = (value: unknown): string => {
  if (typeof value !== 'string') return '1) Adımı uygulayın\n2) Sonucu gözlemleyin\n3) Beklenen davranışı doğrulayın';
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, idx) => `${idx + 1}) ${line.replace(/^\d+\)\s*/, '')}`);
  if (lines.length >= 3) return lines.join('\n');
  return '1) Adımı uygulayın\n2) Sonucu gözlemleyin\n3) Beklenen davranışı doğrulayın';
};

export const normalizeAIResult = (
  raw: RawLLMResponse,
  maxTestCases = MAX_TEST_CASES_PER_REQUEST,
): AICaseGenerationResult => {
  const meta = coerceMeta(raw);
  const rawCases = coerceRawTestCases(raw);
  const limitedCases = rawCases.slice(0, Math.max(1, maxTestCases));

  if (limitedCases.length === 0) {
    throw new Error('AI response did not include any test case');
  }

  const normalizedCases: AITestCaseSuggestion[] = limitedCases.map((testCase: any, idx) => ({
    testCaseId: `TC-${String(idx + 1).padStart(3, '0')}`,
    userType: normalizeText(testCase.userType, 'Registered'),
    platform: meta.platform,
    module: normalizeText(testCase.module, 'General'),
    testScenario: normalizeText(testCase.testScenario, 'Genel senaryo doğrulaması'),
    testCase: normalizeText(testCase.testCase, 'Fonksiyonel davranış doğrulaması'),
    preConditions: normalizeText(testCase.preConditions, 'None'),
    testData: normalizeText(testCase.testData, 'N/A'),
    testStep: normalizeMultilineSteps(testCase.testStep),
    expectedResult: normalizeText(testCase.expectedResult, 'Beklenen sonuç doğrulanmalıdır'),
  }));

  return {
    regressionSets: [
      {
        name: meta.name,
        description: meta.description,
        platform: meta.platform,
        testCases: normalizedCases,
      },
    ],
  };
};

