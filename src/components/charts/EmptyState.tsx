import { useFilter } from '../../context/FilterContext';

export function EmptyState() {
  const { resetFilters } = useFilter();

  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 4h18l-7 8v5l-4-2V12L3 4z"
          />
          <line x1="16" y1="16" x2="20" y2="20" strokeLinecap="round" />
          <line x1="20" y1="16" x2="16" y2="20" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-600">No data found</p>
        <p className="text-xs text-gray-400 mt-1 max-w-xs">
          No entries match your current filters. Try adjusting the date range or folder selection.
        </p>
      </div>
      <button
        type="button"
        onClick={resetFilters}
        className="mt-1 flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0120 12M19.419 15A8 8 0 014 12"
          />
        </svg>
        Clear filters
      </button>
    </div>
  );
}
