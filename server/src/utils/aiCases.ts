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

const MAX_TEST_CASES_PER_REQUEST = 5;

/* ───────────────────────────────────────────────
   Modal API: Fine-tuned Llama 3.1 8B
   ─────────────────────────────────────────────── */

const MODAL_API_URL =
  process.env.MODAL_API_URL ??
  'https://yalkincyaliniz--testcase-generator-api-model-generate.modal.run';

/**
 * Parse free-text Markdown test cases from the Llama model into structured objects.
 *
 * The model output looks like:
 *   **Test Case 1: Miktar Arttırma İşlemi**
 *   - **Öncelik:** Yüksek
 *   - **Ön Koşullar:** Ürün sepete eklenmiş olmalı.
 *   - **Adımlar:**
 *     1. Sepete git.
 *     2. Ürün seç.
 *     3. + butonuna tıkla.
 *   - **Beklenen Sonuç:** Miktar 1 artmalı.
 */
const parseModalResponse = (text: string): AITestCaseSuggestion[] => {
  // Split by test case headers like "**Test Case 1:" or "**Test Case 1."
  const testCaseBlocks = text.split(/\*\*Test Case\s*\d+[:.]\s*/i).filter((b) => b.trim().length > 0);

  return testCaseBlocks.map((block, idx) => {
    // Clean all ** markers for easier parsing
    const clean = block.replace(/\*\*/g, '');

    const extractField = (pattern: RegExp, fallback: string): string => {
      const match = clean.match(pattern);
      return match?.[1]?.trim() || fallback;
    };

    // Title: first line before any "- " field
    const titleMatch = clean.match(/^([^\n-]+)/);
    const title = titleMatch?.[1]?.trim().replace(/\s*[-–—]+\s*$/, '') || `Test Case ${idx + 1}`;

    // Pre Conditions
    const preConditions = extractField(
      /Ön\s*Koşullar\s*:\s*(.+)/i,
      'Belirli bir ön koşul yok',
    );

    // Steps: capture multi-line numbered steps
    const stepsMatch = clean.match(
      /Adımlar\s*:\s*([\s\S]*?)(?=\n\s*-?\s*Beklenen\s*Sonuç|---|\n\s*$)/i,
    );
    let testStep = '1) Adımı uygulayın\n2) Sonucu gözlemleyin\n3) Beklenen davranışı doğrulayın';
    if (stepsMatch?.[1]) {
      const lines = stepsMatch[1]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((l, i) => `${i + 1}) ${l.replace(/^\d+[.)]\s*/, '')}`);
      if (lines.length >= 2) {
        testStep = lines.join('\n');
      }
    }

    // Expected Result
    const expectedResult = extractField(
      /Beklenen\s*Sonuç\s*:\s*(.+(?:\n(?!\s*-\s|\s*---).+)*)/i,
      'Beklenen sonuç doğrulanmalıdır',
    );

    // Test Data: try to extract from steps or use pre-conditions context
    const testDataMatch = clean.match(/Test\s*(?:Data|Verisi)\s*:\s*(.+)/i);
    const testData = testDataMatch?.[1]?.trim() || deriveTestData(preConditions, testStep);

    return {
      testCaseId: `TC-${String(idx + 1).padStart(3, '0')}`,
      userType: 'Registered',
      platform: 'Web' as const,
      module: 'General',
      testScenario: title,
      testCase: title,
      preConditions,
      testData,
      testStep,
      expectedResult: expectedResult.trim(),
    };
  });
};

/**
 * Derive test data from pre-conditions and steps when not explicitly provided.
 */
const deriveTestData = (preConditions: string, testStep: string): string => {
  const hints: string[] = [];

  // Extract quantities, values, specific data from pre-conditions
  const quantityMatch = preConditions.match(/(\d+)\s*(adet|ürün|stok)/i);
  if (quantityMatch) {
    hints.push(`${quantityMatch[1]} ${quantityMatch[2]}`);
  }

  // Extract specific input values from steps
  const inputMatch = testStep.match(/"([^"]+)"/);
  if (inputMatch) {
    hints.push(`Girdi: "${inputMatch[1]}"`);
  }

  const numberMatch = testStep.match(/(-?\d+)\s*(?:yazın|girin|değer)/i);
  if (numberMatch) {
    hints.push(`Değer: ${numberMatch[1]}`);
  }

  return hints.length > 0 ? hints.join(', ') : preConditions !== 'Belirli bir ön koşul yok' ? preConditions : 'Standart test verisi';
};

export const generateRegressionSetsFromText = async (
  input: AICaseGenerationInput,
): Promise<AICaseGenerationResult> => {
  const userStoryPrompt = `
**User Story:** ${input.userStory}

**Acceptance Criteria:**
${input.acceptanceCriteria.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}
`.trim();

  let response: Response;
  try {
    response = await fetch(MODAL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_story: userStoryPrompt }),
    });
  } catch (err) {
    throw new LLMRequestError(
      'Modal API\'ye bağlanılamadı. Sunucu uyanıyor olabilir, lütfen tekrar deneyin.',
      502,
      true,
    );
  }

  if (!response.ok) {
    throw new LLMRequestError(
      `Modal API hatası: ${response.status} ${response.statusText}`,
      response.status >= 400 && response.status < 500 ? 400 : 502,
      response.status === 503 || response.status === 504,
    );
  }

  const data = (await response.json()) as { status?: string; result?: string };

  if (data.status !== 'success' || !data.result) {
    throw new LLMRequestError('Modal API beklenmeyen yanıt döndü', 502, false);
  }

  const testCases = parseModalResponse(data.result);

  if (testCases.length === 0) {
    throw new LLMRequestError('AI yanıtından test case çıkarılamadı', 502, false);
  }

  const limitedCases = testCases.slice(0, MAX_TEST_CASES_PER_REQUEST);

  return {
    regressionSets: [
      {
        name: 'AI Generated Regression Set',
        description: 'User story ve acceptance criteria temel alınarak fine-tuned Llama 3.1 modeli ile oluşturulmuş test seti.',
        platform: 'Web',
        testCases: limitedCases,
      },
    ],
  };
};

/* ───────────────────────────────────────────────
   Legacy normalizeAIResult kept for backward compat
   ─────────────────────────────────────────────── */
export const normalizeAIResult = (
  raw: { testCases?: any[] },
  maxTestCases = MAX_TEST_CASES_PER_REQUEST,
): AICaseGenerationResult => {
  const cases = (raw.testCases ?? []).slice(0, maxTestCases);
  return {
    regressionSets: [
      {
        name: 'AI Generated Regression Set',
        description: 'AI tarafından oluşturulmuş test seti.',
        platform: 'Web',
        testCases: cases.map((tc: any, idx: number) => ({
          testCaseId: `TC-${String(idx + 1).padStart(3, '0')}`,
          userType: tc.userType ?? 'Registered',
          platform: tc.platform ?? 'Web',
          module: tc.module ?? 'General',
          testScenario: tc.testScenario ?? '',
          testCase: tc.testCase ?? '',
          preConditions: tc.preConditions ?? 'None',
          testData: tc.testData ?? 'N/A',
          testStep: tc.testStep ?? '',
          expectedResult: tc.expectedResult ?? '',
        })),
      },
    ],
  };
};
