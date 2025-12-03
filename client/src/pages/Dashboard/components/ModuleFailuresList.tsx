import type { ModuleFailure } from '../../../types/dashboard';

interface ModuleFailuresListProps {
  modules: ModuleFailure[];
  loading: boolean;
}

export const ModuleFailuresList = ({ modules, loading }: ModuleFailuresListProps) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 animate-pulse">
        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={idx} className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!modules.length) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Top Failing Modules
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">No failing modules yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Top Failing Modules
      </h3>
      <ul className="space-y-2 text-sm">
        {modules.map((mod) => (
          <li
            key={mod.module}
            className="flex items-center justify-between text-gray-900 dark:text-gray-100"
          >
            <span className="truncate">{mod.module}</span>
            <span className="ml-4 text-xs font-medium text-red-600 dark:text-red-400">
              {mod.failures} failures
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};


