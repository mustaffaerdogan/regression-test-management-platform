interface DateRangeFilterProps {
  value: '7d' | '30d' | '90d';
  onChange: (value: '7d' | '30d' | '90d') => void;
}

export const DateRangeFilter = ({ value, onChange }: DateRangeFilterProps) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
        Date range
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as '7d' | '30d' | '90d')}
        className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
      </select>
    </div>
  );
};


