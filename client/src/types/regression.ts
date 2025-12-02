export type RegressionPlatform = 'Web' | 'iOS' | 'Android' | 'TV';

export type TestCaseStatus = 'Pass' | 'Fail' | 'Not Executed';

export interface TestCase {
  _id: string;
  regressionSet: string;
  testCaseId: string;
  userType: string;
  platform: string;
  module: string;
  testScenario: string;
  testCase: string;
  preConditions: string;
  testData: string;
  testStep: string;
  expectedResult: string;
  actualResults: string;
  status: TestCaseStatus;
  createdAt: string;
}

export interface RegressionSet {
  _id: string;
  name: string;
  description?: string;
  platform: RegressionPlatform;
  createdAt: string;
  updatedAt?: string;
  testCases?: TestCase[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface CreateRegressionSetPayload {
  name: string;
  description?: string;
  platform: RegressionPlatform;
}

export type UpdateRegressionSetPayload = Partial<CreateRegressionSetPayload>;

export interface CreateTestCasePayload {
  testCaseId: string;
  userType: string;
  platform: string;
  module: string;
  testScenario: string;
  testCase: string;
  preConditions: string;
  testData: string;
  testStep: string;
  expectedResult: string;
  actualResults?: string;
  status?: TestCaseStatus;
}

export type UpdateTestCasePayload = Partial<CreateTestCasePayload>;

export interface RegressionSetQueryParams {
  search?: string;
  platform?: string;
  page?: number;
  limit?: number;
}


