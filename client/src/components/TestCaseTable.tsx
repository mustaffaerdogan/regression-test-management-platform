import type { TestCase } from '../types/regression';

interface TestCaseTableProps {
  testCases: TestCase[];
  onEdit: (testCase: TestCase) => void;
  onDelete: (testCaseId: string) => void;
}

export const TestCaseTable = ({ testCases, onEdit, onDelete }: TestCaseTableProps) => {
  if (testCases.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No test cases yet.</p>;
  }

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900/60">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">ID</th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              User Type
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Platform
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Module
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Scenario
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Test Case
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Pre Conditions
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Test Data
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Test Step
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Expected Result
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Actual Results
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
              Status
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {testCases.map((tc) => (
            <tr key={tc._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
              <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">
                {tc.testCaseId}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                {tc.userType}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                {tc.platform}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">
                {tc.module}
              </td>
              <td
                className="px-3 py-2 max-w-xs text-gray-700 dark:text-gray-200 truncate"
                title={tc.testScenario}
              >
                {tc.testScenario}
              </td>
              <td
                className="px-3 py-2 max-w-xs text-gray-700 dark:text-gray-200 truncate"
                title={tc.testCase}
              >
                {tc.testCase}
              </td>
              <td
                className="px-3 py-2 max-w-xs text-gray-700 dark:text-gray-200 truncate"
                title={tc.preConditions}
              >
                {tc.preConditions}
              </td>
              <td
                className="px-3 py-2 max-w-xs text-gray-700 dark:text-gray-200 truncate"
                title={tc.testData}
              >
                {tc.testData}
              </td>
              <td
                className="px-3 py-2 max-w-xs text-gray-700 dark:text-gray-200 truncate"
                title={tc.testStep}
              >
                {tc.testStep}
              </td>
              <td
                className="px-3 py-2 max-w-xs text-gray-700 dark:text-gray-200 truncate"
                title={tc.expectedResult}
              >
                {tc.expectedResult}
              </td>
              <td
                className="px-3 py-2 max-w-xs text-gray-700 dark:text-gray-200 truncate"
                title={tc.actualResults}
              >
                {tc.actualResults}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    {
                      Pass: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
                      Fail: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
                      'Not Executed':
                        'bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-300',
                    }[tc.status]
                  }`}
                >
                  {tc.status}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                <button
                  type="button"
                  onClick={() => onEdit(tc)}
                  className="mr-2 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(tc._id)}
                  className="text-red-600 dark:text-red-400 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


