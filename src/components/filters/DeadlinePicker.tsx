import { useState } from 'react';
import { useFilter } from '../../context/FilterContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function DeadlinePicker() {
  const { forecastDeadline, setForecastDeadline } = useFilter();

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed

  const selectedYear = forecastDeadline.getFullYear();
  const selectedMonth = forecastDeadline.getMonth(); // 0-indexed

  const [isOpen, setIsOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(selectedYear);

  function selectMonth(monthIndex: number) {
    setForecastDeadline(new Date(displayYear, monthIndex + 1, 0));
    setIsOpen(false);
  }

  function isMonthDisabled(monthIndex: number): boolean {
    if (displayYear < currentYear) return true;
    if (displayYear === currentYear && monthIndex < currentMonth) return true;
    return false;
  }

  const canGoPrevYear = displayYear > currentYear;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        KPI Deadline
      </p>

      {/* Trigger button — shows selected value, toggles picker */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
      >
        <span className="font-medium">{MONTHS[selectedMonth]} {selectedYear}</span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible picker panel */}
      {isOpen && (
        <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-md">
          {/* Year navigation */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50 border-b border-gray-100">
            <button
              type="button"
              disabled={!canGoPrevYear}
              onClick={() => setDisplayYear((y) => y - 1)}
              className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                canGoPrevYear
                  ? 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
                  : 'text-gray-200 cursor-not-allowed'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="text-sm font-semibold text-gray-700 tabular-nums">{displayYear}</span>

            <button
              type="button"
              onClick={() => setDisplayYear((y) => y + 1)}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1 p-2">
            {MONTHS.map((name, i) => {
              const disabled = isMonthDisabled(i);
              const selected = displayYear === selectedYear && i === selectedMonth;
              let btnClass: string;
              if (selected) {
                btnClass = 'bg-indigo-600 text-white';
              } else if (disabled) {
                btnClass = 'text-gray-300 cursor-not-allowed';
              } else {
                btnClass = 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700';
              }
              return (
                <button
                  key={name}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectMonth(i)}
                  className={`rounded px-1.5 py-1 text-xs font-medium transition-colors ${btnClass}`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
