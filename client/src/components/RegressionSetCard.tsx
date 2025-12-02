import type { RegressionSet } from '../types/regression';
import { Button } from './Button';

interface RegressionSetCardProps {
  regressionSet: RegressionSet;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const formatDate = (value?: string): string => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export const RegressionSetCard = ({ regressionSet, onView, onEdit, onDelete }: RegressionSetCardProps) => {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-soft dark:shadow-soft-dark p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {regressionSet.name}
          </h3>
          {regressionSet.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {regressionSet.description}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
            Created: {formatDate(regressionSet.createdAt)}
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
          {regressionSet.platform}
        </span>
      </div>
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex gap-2">
          {onView && (
            <Button type="button" onClick={onView} className="text-sm px-3 py-1.5">
              Open
            </Button>
          )}
          {onEdit && (
            <Button
              type="button"
              variant="secondary"
              onClick={onEdit}
              className="text-sm px-3 py-1.5"
            >
              Edit
            </Button>
          )}
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};


