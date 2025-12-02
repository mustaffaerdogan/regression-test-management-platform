import { useEffect, useState } from 'react';
import type { TestCase, CreateTestCasePayload, TestCaseStatus } from '../types/regression';
import { createTestCase, updateTestCase } from '../api/regressionSets';
import { Button } from './Button';

interface TestCaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  regressionSetId: string;
  initialValues?: TestCase;
}

const STATUSES: TestCaseStatus[] = ['Pass', 'Fail', 'Not Executed'];

export const TestCaseFormModal = ({
  isOpen,
  onClose,
  onSuccess,
  regressionSetId,
  initialValues,
}: TestCaseFormModalProps) => {
  const [form, setForm] = useState<CreateTestCasePayload>({
    testCaseId: '',
    userType: '',
    platform: '',
    module: '',
    testScenario: '',
    testCase: '',
    preConditions: '',
    testData: '',
    testStep: '',
    expectedResult: '',
    actualResults: '',
    status: 'Not Executed',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialValues) {
      setForm({
        testCaseId: initialValues.testCaseId,
        userType: initialValues.userType,
        platform: initialValues.platform,
        module: initialValues.module,
        testScenario: initialValues.testScenario,
        testCase: initialValues.testCase,
        preConditions: initialValues.preConditions,
        testData: initialValues.testData,
        testStep: initialValues.testStep,
        expectedResult: initialValues.expectedResult,
        actualResults: initialValues.actualResults,
        status: initialValues.status,
      });
    } else {
      setForm({
        testCaseId: '',
        userType: '',
        platform: '',
        module: '',
        testScenario: '',
        testCase: '',
        preConditions: '',
        testData: '',
        testStep: '',
        expectedResult: '',
        actualResults: '',
        status: 'Not Executed',
      });
    }
    setError(null);
  }, [initialValues, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (
      !form.testCaseId.trim() ||
      !form.module.trim() ||
      !form.testScenario.trim() ||
      !form.testCase.trim() ||
      !form.expectedResult.trim()
    ) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      if (initialValues) {
        await updateTestCase(initialValues._id, form);
      } else {
        await createTestCase(regressionSetId, form);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save test case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 overflow-y-auto">
      <div className="w-full max-w-3xl my-8 rounded-2xl bg-white dark:bg-gray-900 shadow-soft dark:shadow-soft-dark p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          {initialValues ? 'Edit Test Case' : 'Add Test Case'}
        </h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test Case ID *
              </label>
              <input
                name="testCaseId"
                value={form.testCaseId}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                User Type
              </label>
              <input
                name="userType"
                value={form.userType}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Platform
              </label>
              <input
                name="platform"
                value={form.platform}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Module *
              </label>
              <input
                name="module"
                value={form.module}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test Scenario *
              </label>
              <textarea
                name="testScenario"
                value={form.testScenario}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test Case *
              </label>
              <textarea
                name="testCase"
                value={form.testCase}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pre Conditions
              </label>
              <textarea
                name="preConditions"
                value={form.preConditions}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test Data
              </label>
              <textarea
                name="testData"
                value={form.testData}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test Step
              </label>
              <textarea
                name="testStep"
                value={form.testStep}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expected Result *
              </label>
              <textarea
                name="expectedResult"
                value={form.expectedResult}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Actual Results
            </label>
            <textarea
              name="actualResults"
              value={form.actualResults ?? ''}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              className="px-4"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="px-4" loading={loading}>
              {initialValues ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};


