import { useState } from 'react';
import { importTestCasesCsv, type ImportCsvResponse } from '../../../api/regressionSets';
import { Button } from '../../../components/Button';

interface ImportCsvModalProps {
  open: boolean;
  onClose: () => void;
  regressionSetId: string;
  onImported: () => void;
}

export const ImportCsvModal = ({
  open,
  onClose,
  regressionSetId,
  onImported,
}: ImportCsvModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportCsvResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await importTestCasesCsv(regressionSetId, file);
      setResult(response.data ?? null);
      onImported(); // refresh test case table
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Import Test Cases (CSV)
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload a CSV file containing multiple test cases. Required columns: Test Case ID, Module,
          Expected Result.
        </p>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        {!result && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-900 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-300"
              />
              {file && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Selected: {file.name}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={loading || !file} className="min-w-[120px]">
                {loading ? 'Importing...' : 'Import CSV'}
              </Button>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-3">
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-200">
              <strong>{result.importedCount}</strong> test cases imported successfully.
            </div>

            {result.skipped && result.skipped.length > 0 && (
              <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-yellow-700 dark:text-yellow-200 text-sm max-h-40 overflow-auto">
                <strong>Skipped ({result.skipped.length}):</strong>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {result.skipped.map((s, i) => (
                    <li key={i}>
                      Row {s.row}: {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


