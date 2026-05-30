import { useMemo } from 'react';
import { useFilter } from '../../context/FilterContext';
import { getFolderColor } from '../../config/chartColors';
import { formatMetric } from '../../utils/format';
import { sortDates } from '../../utils/date';
import type { SheetEntry } from '../../types';

interface FolderSelectorProps {
  readonly folders: string[];
  readonly entries?: SheetEntry[];
  readonly isPercentage?: boolean;
}

export function FolderSelector({ folders, entries = [], isPercentage = false }: FolderSelectorProps) {
  const { selectedFolder, setSelectedFolder } = useFilter();

  const latestValues = useMemo(() => {
    const latestDate = sortDates([...new Set(entries.map((e) => e.date))]).at(-1);
    if (!latestDate) return {} as Record<string, number>;
    return Object.fromEntries(
      entries.filter((e) => e.date === latestDate).map((e) => [e.folderName, e.value]),
    );
  }, [entries]);

  const items: { id: string; label: string }[] = [
    { id: 'ALL', label: 'All teams' },
    ...folders.map((f) => ({ id: f, label: f })),
  ];

  return (
    <div className="flex flex-col gap-0.5">
      {items.map(({ id, label }) => {
        const on = selectedFolder === id;
        const value = id !== 'ALL' ? latestValues[id] : undefined;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setSelectedFolder(id)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-left transition-all w-full border"
            style={{
              fontFamily: 'var(--font-main)',
              background: on ? 'color-mix(in srgb,var(--accent) 10%,transparent)' : 'transparent',
              borderColor: on ? 'color-mix(in srgb,var(--accent) 30%,transparent)' : 'transparent',
              color: 'var(--text)',
            }}
          >
            {id === 'ALL' ? (
              <span
                className="w-[18px] h-[18px] rounded-[6px] flex items-center justify-center flex-shrink-0"
                style={{
                  background: on ? 'color-mix(in srgb,var(--accent) 18%,transparent)' : 'var(--bg)',
                  color: on ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2 2 7l10 5 10-5z" /><path d="M2 12l10 5 10-5" /><path d="M2 17l10 5 10-5" />
                </svg>
              </span>
            ) : (
              <span
                className="w-[9px] h-[9px] rounded-full flex-shrink-0"
                style={{ background: getFolderColor(id) }}
              />
            )}

            <span className="flex-1 text-[13px] font-semibold">{label}</span>

            {value !== undefined && (
              <span className="text-[12px] font-bold tabular-nums" style={{ color: 'var(--text-faint)' }}>
                {formatMetric(value, isPercentage)}
              </span>
            )}

            {on && (
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)', flexShrink: 0 }}>
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
