import { useState, useEffect } from 'react';
import { ChartTypeSelector } from '../filters/ChartTypeSelector';
import { FolderSelector } from '../filters/FolderSelector';
import { DateSelector } from '../filters/DateSelector';
import { DeadlinePicker } from '../filters/DeadlinePicker';
import { KpaTargetInput } from '../filters/KpaTargetInput';
import { useFilter } from '../../context/FilterContext';
import type { SheetEntry } from '../../types';

interface SidebarProps {
  readonly folders: string[];
  readonly dates: string[];
  readonly lastUpdated: Date | null;
  readonly isRegressionSheet: boolean;
  readonly entries?: SheetEntry[];
  readonly isPercentage?: boolean;
}

function formatRelativeTime(date: Date, now: number): string {
  const diffMin = Math.floor((now - date.getTime()) / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function Sidebar({ folders, dates, lastUpdated, isRegressionSheet, entries = [], isPercentage = false }: SidebarProps) {
  const { chartType, setChartType, selectedFolder, selectedDates, resetFilters } = useFilter();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const activeFilterCount =
    Number(chartType !== 'trend') +
    Number(selectedFolder !== 'ALL') +
    Number(selectedDates.length !== dates.length);

  const hasActiveFilters = activeFilterCount > 0;
  const isForecast = chartType === 'forecast';

  return (
    <aside
      className="w-64 shrink-0 flex flex-col h-full"
      style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        fontFamily: 'var(--font-main)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 pt-4 pb-3"
        style={{ borderBottom: '1px solid color-mix(in srgb, var(--border) 70%, transparent)' }}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.13em]" style={{ color: 'var(--text-muted)' }}>
          Filters
        </span>
        {hasActiveFilters && (
          <span
            className="w-[17px] h-[17px] rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none"
            style={{ background: 'var(--accent)' }}
          >
            {activeFilterCount}
          </span>
        )}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto flex items-center gap-1 text-[11.5px] font-semibold transition-colors"
            style={{ color: 'var(--text-faint)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-main)' }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = 'var(--text-faint)'; }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0120 12M19.419 15A8 8 0 014 12" />
            </svg>
            Reset
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        {/* View section */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: 'var(--text-faint)' }}>View</p>
          <ChartTypeSelector />
        </div>

        {isRegressionSheet && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: 'var(--text-faint)' }}>Analysis</p>
            <button
              type="button"
              onClick={() => setChartType(isForecast ? 'trend' : 'forecast')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-bold transition-colors border"
              style={
                isForecast
                  ? { background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)', borderColor: 'color-mix(in srgb, var(--accent) 32%, transparent)', fontFamily: 'var(--font-main)' }
                  : { color: 'var(--text-muted)', borderColor: 'transparent', fontFamily: 'var(--font-main)' }
              }
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l4-8 4 4 4-6 4 4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5h6v6" strokeDasharray="2 1" />
              </svg>
              KPA Forecast
              {/* Toggle switch */}
              <span className="ml-auto flex-shrink-0">
                <span
                  className="relative inline-block w-[34px] h-[19px] rounded-full transition-colors"
                  style={{ background: isForecast ? 'var(--accent)' : 'color-mix(in srgb, var(--text-faint) 40%, transparent)' }}
                >
                  <span
                    className="absolute top-[2px] w-[15px] h-[15px] rounded-full bg-white shadow-sm transition-transform"
                    style={{ left: isForecast ? '17px' : '2px' }}
                  />
                </span>
              </span>
            </button>
            {isForecast && (
              <div className="ml-2 pl-3 flex flex-col gap-4 mt-1" style={{ borderLeft: '2px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
                <KpaTargetInput />
                <DeadlinePicker />
              </div>
            )}
          </div>
        )}

        {/* Teams section */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: 'var(--text-faint)' }}>Teams</p>
          <FolderSelector folders={folders} entries={entries} isPercentage={isPercentage} />
        </div>

        {/* Date range section */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: 'var(--text-faint)' }}>Date range</p>
          <DateSelector dates={dates} />
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 flex items-center gap-2 text-[11.5px]"
        style={{ borderTop: '1px solid color-mix(in srgb, var(--border) 70%, transparent)', color: 'var(--text-faint)' }}
      >
        <span
          className="w-[7px] h-[7px] rounded-full flex-shrink-0"
          style={{ background: '#10b981', boxShadow: '0 0 0 3px color-mix(in srgb,#10b981 22%,transparent)' }}
        />
        {lastUpdated ? (
          <span>Updated {formatRelativeTime(lastUpdated, now)}</span>
        ) : (
          <span>Not yet refreshed</span>
        )}
      </div>
    </aside>
  );
}
