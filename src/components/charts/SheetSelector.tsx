import { sheetIcon, sheetDesc } from '../../utils/sheetMeta';
import { formatMetric } from '../../utils/format';

interface SheetSelectorProps {
  readonly sheets: string[];
  readonly activeSheet: string;
  readonly onChange: (name: string) => void;
  readonly labelMap?: Record<string, string>;
  readonly sheetValueCache?: Record<string, { value: number; isPercentage: boolean; sparkValues?: number[] }>;
}

export function SheetSelector({ sheets, activeSheet, onChange, labelMap, sheetValueCache = {} }: SheetSelectorProps) {
  const label = (name: string) => labelMap?.[name] ?? name;

  if (sheets.length > 5) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-faint)]">Report</span>
        <select
          value={activeSheet}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          style={{ fontFamily: 'var(--font-main)' }}
        >
          {sheets.map((name) => (
            <option key={name} value={name}>{label(name)}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${Math.min(sheets.length, 3)}, 1fr)` }}
    >
      {sheets.map((name) => {
        const on = name === activeSheet;
        const cached = sheetValueCache[name];
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={[
              'flex items-center gap-3 text-left cursor-pointer rounded-[16px] px-4 py-3.5 transition-all duration-150 relative overflow-hidden',
              'border bg-white',
              on
                ? 'border-[var(--accent)] shadow-[0_0_0_1px_var(--accent),var(--shadow-sm)]'
                : 'border-[var(--border)] hover:border-[var(--text-faint)]',
            ].join(' ')}
            style={{ fontFamily: 'var(--font-main)' }}
          >
            {on && (
              <span
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[16px]"
                style={{ background: 'var(--accent)' }}
              />
            )}
            <span
              className={[
                'flex w-9 h-9 items-center justify-center rounded-[10px] flex-shrink-0',
                on ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
              ].join(' ')}
              style={{ background: on ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg)' }}
            >
              {sheetIcon(name)}
            </span>
            <span className="flex flex-col min-w-0 flex-1">
              <span className="text-[14px] font-bold tracking-[-0.01em] text-[var(--text)] leading-tight">{label(name)}</span>
              <span className="text-[11.5px] text-[var(--text-faint)] mt-0.5 truncate">{sheetDesc(name)}</span>
            </span>
            {cached !== undefined && (
              <span className="text-[19px] font-extrabold tracking-[-0.02em] tabular-nums text-[var(--text)] leading-none flex-shrink-0">
                {formatMetric(cached.value, cached.isPercentage)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
