import { useMemo } from 'react';
import { MiniSpark } from './MiniSpark';
import { sortDates, formatDMY } from '../../utils/date';
import { formatMetric, formatChange } from '../../utils/format';
import { getFolderColor } from '../../config/chartColors';
import type { SheetEntry } from '../../types';

interface KpiCardsProps {
  readonly entries: SheetEntry[];
  readonly selectedFolder: string;
  readonly metricLabel: string;
  readonly isPercentage: boolean;
}

function resolveValue(entries: SheetEntry[], date: string, folder: string): number {
  const exact = entries.find((e) => e.date === date && e.folderName === folder);
  if (exact) return exact.value;
  const dateEntries = entries.filter((e) => e.date === date);
  if (dateEntries.length === 0) return 0;
  return dateEntries.reduce((s, e) => s + e.value, 0) / dateEntries.length;
}

function buildSparkValues(entries: SheetEntry[], folder: string, dates: string[]): number[] {
  return dates.map((d) => resolveValue(entries, d, folder));
}

export function KpiCards({ entries, selectedFolder, metricLabel, isPercentage }: KpiCardsProps) {
  if (entries.length === 0) return null;

  const sortedDates = useMemo(
    () => sortDates([...new Set(entries.map((e) => e.date))]),
    [entries],
  );

  const latestDate = sortedDates.at(-1) ?? '';
  const prevDate = sortedDates.at(-2);

  const lowerIsBetter = /failure|count/i.test(metricLabel);
  const higherIsBetter = !lowerIsBetter;

  const focusFolder = selectedFolder === 'ALL' ? 'TOTAL' : selectedFolder;
  const latestValue = resolveValue(entries, latestDate, focusFolder);
  const prevValue = prevDate ? resolveValue(entries, prevDate, focusFolder) : undefined;
  const change = prevValue !== undefined ? latestValue - prevValue : undefined;
  let trendGood: boolean | null = null;
  if (change !== undefined && change !== 0) {
    trendGood = higherIsBetter ? change > 0 : change < 0;
  }

  const sparkValues = useMemo(
    () => buildSparkValues(entries, focusFolder, sortedDates),
    [entries, focusFolder, sortedDates],
  );
  const sparkColor = trendGood === false ? '#f87171' : '#34d399';

  const teams = [...new Set(entries.map((e) => e.folderName))].filter((f) => f !== 'TOTAL');
  const best = useMemo(() => {
    if (teams.length === 0) return null;
    return teams.reduce<{ name: string; v: number } | null>((b, t) => {
      const v = resolveValue(entries, latestDate, t);
      if (!b) return { name: t, v };
      return (higherIsBetter ? v > b.v : v < b.v) ? { name: t, v } : b;
    }, null);
  }, [entries, latestDate, higherIsBetter, teams]);

  const worst = useMemo(() => {
    if (teams.length === 0) return null;
    return teams.reduce<{ name: string; v: number } | null>((b, t) => {
      const v = resolveValue(entries, latestDate, t);
      if (!b) return { name: t, v };
      return (higherIsBetter ? v < b.v : v > b.v) ? { name: t, v } : b;
    }, null);
  }, [entries, latestDate, higherIsBetter, teams]);

  const arrow = !change || change === 0 ? '' : change > 0 ? '↑' : '↓';
  const deltaTxt = !change || change === 0 ? 'No change' : `${arrow} ${formatChange(Math.abs(change), isPercentage)}`;
  const deltaClass = trendGood === true ? 'good' : trendGood === false ? 'bad' : 'flat';

  const deltaPillClasses = {
    good: 'bg-[color-mix(in_srgb,#10b981_24%,transparent)] text-[#6ee7b7]',
    bad: 'bg-[color-mix(in_srgb,#ef4444_24%,transparent)] text-[#fca5a5]',
    flat: 'bg-white/10 text-[var(--ink-faint)]',
  };

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: '1.35fr 1fr 1fr 1fr' }}
    >
      {/* Hero dark card */}
      <div
        className="rounded-[16px] px-[18px] py-[18px] relative overflow-hidden flex flex-col min-h-[132px]"
        style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
            {selectedFolder === 'ALL' ? 'Overall latest' : `${selectedFolder} latest`}
          </span>
          <span className={`text-[11.5px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${deltaPillClasses[deltaClass]}`}>
            {deltaTxt}
          </span>
        </div>
        <div className="text-[52px] font-extrabold tracking-[-0.03em] leading-none mt-2 tabular-nums">
          {formatMetric(latestValue, isPercentage)}
        </div>
        <div className="text-[12px] mt-1.5" style={{ color: 'var(--ink-faint)' }}>
          {metricLabel} · {latestDate ? formatDMY(latestDate) : '—'}
        </div>
        <div className="absolute right-0 bottom-0 left-0 opacity-90 pointer-events-none">
          <MiniSpark values={sparkValues} color={sparkColor} w={240} h={46} light />
        </div>
      </div>

      {/* vs previous */}
      <div
        className={[
          'bg-white rounded-[16px] px-[18px] py-[18px] relative flex flex-col min-h-[132px]',
          trendGood === true
            ? 'border-l-4 border-l-[#10b981] border border-[var(--border)]'
            : trendGood === false
            ? 'border-l-4 border-l-[#ef4444] border border-[var(--border)]'
            : 'border border-[var(--border)]',
        ].join(' ')}
      >
        <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">vs previous week</span>
        <div
          className={[
            'text-[26px] font-extrabold tracking-[-0.02em] mt-2 tabular-nums',
            trendGood === true ? 'text-[#10b981]' : trendGood === false ? 'text-[#ef4444]' : 'text-[var(--text)]',
          ].join(' ')}
        >
          {deltaTxt}
        </div>
        {prevValue !== undefined && prevDate ? (
          <>
            <div className="text-[12.5px] font-semibold text-[var(--text-muted)] mt-1.5 tabular-nums">
              {formatMetric(prevValue, isPercentage)}
              <span className="mx-1 text-[var(--text-faint)]">→</span>
              {formatMetric(latestValue, isPercentage)}
            </div>
            <div className="text-[11px] text-[var(--text-faint)] mt-auto pt-1.5 tabular-nums">
              {formatDMY(prevDate)} → {formatDMY(latestDate)}
            </div>
          </>
        ) : (
          <p className="text-xs text-[var(--text-faint)] mt-2">No prior period</p>
        )}
      </div>

      {/* Top performer */}
      <div className="bg-white rounded-[16px] border border-[var(--border)] px-[18px] py-[18px] relative flex flex-col min-h-[132px]">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">
          {higherIsBetter ? 'Top performer' : 'Lowest count'}
        </span>
        {best ? (
          <>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: getFolderColor(best.name) }} />
              <span className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--text)]">{best.name}</span>
            </div>
            <div className="text-[12.5px] font-semibold text-[var(--text-muted)] mt-1.5 tabular-nums">
              {formatMetric(best.v, isPercentage)}
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--text-faint)] mt-2">—</p>
        )}
        <div className="absolute top-[18px] right-[18px] w-[30px] h-[30px] rounded-[9px] flex items-center justify-center bg-[color-mix(in_srgb,#10b981_14%,transparent)] text-[#059669]">
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
            <path d="M5 6H3v2a4 4 0 0 0 4 4" />
            <path d="M19 6h2v2a4 4 0 0 1-4 4" />
          </svg>
        </div>
      </div>

      {/* Needs attention */}
      <div className="bg-white rounded-[16px] border border-[var(--border)] px-[18px] py-[18px] relative flex flex-col min-h-[132px]">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--text-faint)]">Needs attention</span>
        {worst ? (
          <>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: getFolderColor(worst.name) }} />
              <span className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--text)]">{worst.name}</span>
            </div>
            <div className="text-[12.5px] font-semibold text-[var(--text-muted)] mt-1.5 tabular-nums">
              {formatMetric(worst.v, isPercentage)} · {higherIsBetter ? 'below pack' : 'highest'}
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--text-faint)] mt-2">—</p>
        )}
        <div className="absolute top-[18px] right-[18px] w-[30px] h-[30px] rounded-[9px] flex items-center justify-center bg-[color-mix(in_srgb,#f59e0b_16%,transparent)] text-[#d97706]">
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
