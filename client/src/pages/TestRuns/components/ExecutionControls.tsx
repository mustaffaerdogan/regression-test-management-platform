import type { RunItemStatus } from '../../../types/testRun';
import { Button } from '../../../components/Button';

interface ExecutionControlsProps {
  disabled: boolean;
  onExecute: (status: RunItemStatus, actualResults: string) => void;
  actualResults: string;
  onChangeActualResults: (value: string) => void;
  saving: boolean;
}

export const ExecutionControls = ({
  disabled,
  onExecute,
  actualResults,
  onChangeActualResults,
  saving,
}: ExecutionControlsProps) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Actual Results
        </label>
        <textarea
          value={actualResults}
          onChange={(e) => onChangeActualResults(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={disabled || saving}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          className="px-4 py-2 rounded-full"
          disabled={disabled || saving}
          onClick={() => onExecute('Pass', actualResults)}
          loading={saving}
        >
          Pass
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="px-4 py-2 rounded-full"
          disabled={disabled || saving}
          onClick={() => onExecute('Fail', actualResults)}
          loading={saving}
        >
          Fail
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="px-4 py-2 rounded-full"
          disabled={disabled || saving}
          onClick={() => onExecute('Skipped', actualResults)}
          loading={saving}
        >
          Skip
        </Button>
      </div>
    </div>
  );
};

