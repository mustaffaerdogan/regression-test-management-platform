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

export interface AICasesResponse {
  regressionSets: AIRegressionSetSuggestion[];
}
