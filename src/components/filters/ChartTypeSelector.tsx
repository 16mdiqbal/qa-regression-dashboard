import { useFilter, type ChartType } from '../../context/FilterContext';

const OPTIONS: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  {
    value: 'trend',
    label: 'Trend',
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 17 8 11 13 14 21 5" />
      </svg>
    ),
  },
  {
    value: 'area',
    label: 'Area',
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 15l5-6 4 3 5-7 4 5 M3 15v5h18v-5" />
      </svg>
    ),
  },
  {
    value: 'bar',
    label: 'Bar',
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 20V10 M10 20V5 M15 20V13 M20 20V8" />
      </svg>
    ),
  },
];

export function ChartTypeSelector() {
  const { chartType, setChartType } = useFilter();

  return (
    <div
      className="flex rounded-[11px] p-[3px] gap-[2px]"
      style={{ background: 'var(--bg)' }}
    >
      {OPTIONS.map(({ value, label, icon }) => {
        const on = chartType === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setChartType(value)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-[7px] rounded-[8px] text-[12.5px] font-semibold transition-all"
            style={
              on
                ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--shadow-sm)', fontFamily: 'var(--font-main)' }
                : { color: 'var(--text-muted)', fontFamily: 'var(--font-main)' }
            }
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
