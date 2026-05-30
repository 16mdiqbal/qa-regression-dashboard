import { useMemo, useState } from 'react';
import { SettingsModal } from '../settings/SettingsModal';
import { MiniSpark } from '../charts/MiniSpark';
import { MultiSpark } from '../charts/MultiSpark';
import { isLiveConfig } from '../../config/runtimeConfig';
import { formatDMY, sortDates } from '../../utils/date';
import { formatMetric, formatChange } from '../../utils/format';
import { sheetIcon, sheetDesc } from '../../utils/sheetMeta';
import { smoothPath } from '../../utils/svgPath';
import { latestTotal } from '../../utils/entries';
import { getFolderColor } from '../../config/chartColors';
import type { SheetData, SheetEntry } from '../../types';

interface LandingPageProps {
  readonly sheets: string[];
  readonly activeSheetName: string;
  readonly sheetData: SheetData;
  readonly lastUpdated: Date | null;
  readonly sheetLoading: boolean;
  readonly labelMap: Record<string, string>;
  readonly sheetValueCache?: Record<string, { value: number; isPercentage: boolean; sparkValues?: number[] }>;
  readonly onSelectDashboard: (name: string) => void;
  readonly onOpenDashboard: (name: string) => void | Promise<void>;
  readonly onConfigSaved: () => void;
}

// ── smooth path helper (Catmull-Rom) ──────────────────────────────────────────

function wavePath(amp: number, yMid: number, phase: number, w: number, periods: number): string {
  const pts: [number, number][] = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w;
    const y = yMid + Math.sin((i / n) * Math.PI * periods + phase) * amp;
    pts.push([x, y]);
  }
  return smoothPath(pts);
}

// ── static helpers ────────────────────────────────────────────────────────────

function previousTotal(entries: SheetEntry[]): SheetEntry | null {
  const dates = sortDates([...new Set(entries.map((e) => e.date))]);
  const previousDate = dates.at(-2);
  if (!previousDate) return null;
  return entries.find((e) => e.date === previousDate && e.folderName === 'TOTAL')
    ?? entries.find((e) => e.date === previousDate)
    ?? null;
}

function latestDateLabel(entries: SheetEntry[]): string {
  const d = sortDates([...new Set(entries.map((e) => e.date))]).at(-1);
  return d ? formatDMY(d) : '-';
}

function formatRelative(date: Date | null): string {
  if (!date) return 'Not refreshed yet';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildTotalSparkValues(entries: SheetEntry[]): number[] {
  const dates = sortDates([...new Set(entries.map((e) => e.date))]);
  return dates.map((d) => {
    const total = entries.find((e) => e.date === d && e.folderName === 'TOTAL');
    return total?.value ?? entries.find((e) => e.date === d)?.value ?? 0;
  });
}

function buildFolderSeries(
  entries: SheetEntry[],
  folderNames: string[],
  colorFn: (f: string) => string,
): { values: number[]; color: string }[] {
  const dates = sortDates([...new Set(entries.map((e) => e.date))]);
  return folderNames.map((f) => ({
    color: colorFn(f),
    values: dates.map((d) => entries.find((e) => e.date === d && e.folderName === f)?.value ?? 0),
  }));
}

// ── Animated hero waves ───────────────────────────────────────────────────────

const WAVES = [
  { c: '#6366f1', amp: 70, mid: 190, ph: 0.2, per: 2.1, sw: 3 },
  { c: '#10b981', amp: 54, mid: 250, ph: 1.6, per: 2.6, sw: 3 },
  { c: '#ef4444', amp: 46, mid: 320, ph: 3.0, per: 2.2, sw: 2.5 },
  { c: '#8b5cf6', amp: 38, mid: 150, ph: 2.2, per: 3.0, sw: 2 },
] as const;

function HeroWaves() {
  const W = 760, H = 460;
  return (
    <svg
      className="absolute inset-y-0 right-0 h-full"
      style={{ width: '68%', pointerEvents: 'none' }}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hwfade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="1" />
          <stop offset="38%" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <mask id="hwmask">
          <rect x="0" y="0" width={W} height={H} fill="#fff" />
          <rect x="0" y="0" width={W} height={H} fill="url(#hwfade)" />
        </mask>
      </defs>
      <g mask="url(#hwmask)">
        {WAVES.map((wv, i) => (
          <path
            key={i}
            className="hero-wave"
            d={wavePath(wv.amp, wv.mid, wv.ph, W, wv.per)}
            fill="none"
            stroke={wv.c}
            strokeWidth={wv.sw}
            strokeLinecap="round"
            opacity={0.85}
            style={{ animationDelay: `${i * 1.3}s` }}
          />
        ))}
      </g>
    </svg>
  );
}

// ── Dashboard card ────────────────────────────────────────────────────────────

interface DashCardProps {
  name: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  sparkValues?: number[];
  latestValue?: number;
  isPercentage?: boolean;
  change?: number | null;
  higherIsBetter?: boolean;
}

function DashCard({ name, label, selected, onSelect, sparkValues, latestValue, isPercentage = false, change, higherIsBetter = true }: DashCardProps) {
  const trendGood = change == null || change === 0 ? null : (higherIsBetter ? change > 0 : change < 0);
  const arrow = !change || change === 0 ? '' : change > 0 ? '↑' : '↓';
  const deltaTxt = !change || change === 0 ? '' : `${arrow}${formatChange(Math.abs(change), !!isPercentage)}`;
  const sparkColor = sparkValues
    ? (trendGood === false ? '#ef4444' : getFolderColor('CoreApp'))
    : '#6366f1';

  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left cursor-pointer rounded-[18px] px-[18px] py-[18px] flex flex-col gap-2 transition-all duration-150 overflow-hidden relative"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: selected ? '0 0 0 1px var(--accent), var(--shadow-sm)' : undefined,
        color: 'var(--text)',
        fontFamily: 'var(--font-main)',
      }}
    >
      {/* Top row: icon + delta */}
      <div className="flex items-center justify-between">
        <span
          className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center"
          style={{ background: selected ? 'color-mix(in srgb,var(--accent) 16%,transparent)' : 'var(--bg)', color: selected ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          {sheetIcon(name)}
        </span>
        {change != null && (
          <span
            className="text-[12px] font-bold px-2.5 py-1 rounded-full tabular-nums"
            style={
              trendGood === true
                ? { background: 'color-mix(in srgb,#10b981 16%,transparent)', color: '#059669' }
                : trendGood === false
                ? { background: 'color-mix(in srgb,#ef4444 16%,transparent)', color: '#dc2626' }
                : { background: 'var(--bg)', color: 'var(--text-faint)' }
            }
          >
            {deltaTxt}
          </span>
        )}
      </div>

      {/* Sparkline */}
      {sparkValues && sparkValues.length >= 2 ? (
        <div className="mx-[-4px]">
          <MiniSpark values={sparkValues} color={sparkColor} w={260} h={48} />
        </div>
      ) : (
        <div
          className="h-12 rounded-lg mx-[-4px]"
          style={{ background: 'linear-gradient(135deg, color-mix(in srgb,var(--accent) 8%,transparent), transparent)' }}
        />
      )}

      {/* Footer: name + value */}
      <div className="flex items-end justify-between gap-2 mt-0.5">
        <div className="flex flex-col min-w-0">
          <span className="text-[15px] font-bold tracking-[-0.01em]">{label}</span>
          <span className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-faint)' }}>{sheetDesc(name)}</span>
        </div>
        {latestValue !== undefined && (
          <span className="text-[26px] font-extrabold tracking-[-0.02em] tabular-nums flex-shrink-0">
            {formatMetric(latestValue, isPercentage)}
          </span>
        )}
      </div>
    </button>
  );
}

// ── Main LandingPage ──────────────────────────────────────────────────────────

export function LandingPage({
  sheets,
  activeSheetName,
  sheetData,
  lastUpdated,
  sheetLoading,
  labelMap,
  sheetValueCache = {},
  onSelectDashboard,
  onOpenDashboard,
  onConfigSaved,
}: LandingPageProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isLive = isLiveConfig();

  const latest = useMemo(() => latestTotal(sheetData.entries), [sheetData.entries]);
  const previous = useMemo(() => previousTotal(sheetData.entries), [sheetData.entries]);
  const sparkValues = useMemo(() => buildTotalSparkValues(sheetData.entries), [sheetData.entries]);
  const activeLabel = labelMap[activeSheetName] ?? activeSheetName;
  const teamCount = new Set(sheetData.entries.map((e) => e.folderName).filter((n) => n !== 'TOTAL')).size;
  const change = latest && previous ? latest.value - previous.value : null;
  const higherIsBetter = !/failure|count/i.test(sheetData.metricLabel);
  const trendGood = change == null || change === 0 ? null : (higherIsBetter ? change > 0 : change < 0);
  const arrow = !change || change === 0 ? '' : change > 0 ? '↑' : '↓';
  const deltaTxt = !change || change === 0 ? 'No change' : `${arrow} ${formatChange(Math.abs(change), sheetData.isPercentage)}`;
  const latestDate = latest?.date ?? '';

  const folders = [...new Set(sheetData.entries.map((e) => e.folderName))].filter((f) => f !== 'TOTAL');
  const previewFolders = useMemo(() => {
    const dates = sortDates([...new Set(sheetData.entries.map((e) => e.date))]);
    const lastDate = dates.at(-1);
    if (!lastDate) return folders.slice(0, 3);
    return [...folders]
      .sort((a, b) => {
        const aVal = sheetData.entries.find((e) => e.date === lastDate && e.folderName === a)?.value ?? (higherIsBetter ? Infinity : -Infinity);
        const bVal = sheetData.entries.find((e) => e.date === lastDate && e.folderName === b)?.value ?? (higherIsBetter ? Infinity : -Infinity);
        return higherIsBetter ? aVal - bVal : bVal - aVal;
      })
      .slice(0, 3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetData.entries, higherIsBetter]);
  const folderSeries = useMemo(
    () => buildFolderSeries(sheetData.entries, previewFolders, getFolderColor),
    [sheetData.entries, previewFolders],
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-main)' }}>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConfigSaved={onConfigSaved}
      />

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          padding: '14px clamp(16px,3vw,36px)',
          fontFamily: 'var(--font-main)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 17 8 11 13 14 21 5" />
              <line x1="3" y1="20" x2="21" y2="20" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-extrabold tracking-[-0.02em] leading-tight" style={{ color: 'var(--text)' }}>
              QA Regression Dashboard
            </h1>
            <p className="text-[12px] leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {sheets.length} dashboards · {teamCount} QA folders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            className="w-[38px] h-[38px] flex items-center justify-center rounded-[10px] border transition-all"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onOpenDashboard(activeSheetName)}
            className="inline-flex items-center gap-2 h-[38px] px-4 rounded-[10px] text-[13.5px] font-bold transition-all"
            style={{ background: 'var(--ink)', color: 'var(--ink-text)', fontFamily: 'var(--font-main)', whiteSpace: 'nowrap' }}
          >
            Open dashboard
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </header>

      <div
        className="flex flex-col gap-6"
        style={{ padding: 'clamp(16px,2.4vw,28px) clamp(16px,3vw,36px) 40px', maxWidth: '1320px', margin: '0 auto' }}
      >
        {/* ── Hero ── */}
        <section
          className="relative overflow-hidden rounded-[24px] flex items-center"
          style={{
            background: 'var(--ink)',
            minHeight: '300px',
            padding: 'clamp(28px,4vw,52px)',
          }}
        >
          <HeroWaves />
          <div className="relative z-10 max-w-[620px]">
            {/* Mock data pill */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold border"
              style={{
                background: 'rgba(245,158,11,0.16)',
                color: '#fcd34d',
                borderColor: 'rgba(245,158,11,0.3)',
              }}
            >
              <span className="w-[7px] h-[7px] rounded-full bg-[#f59e0b]" />
              {isLive ? 'Google Sheets connected' : 'Mock data mode'}
            </span>

            <h2
              className="font-extrabold leading-[0.98] mt-4"
              style={{
                fontSize: 'clamp(40px,6vw,72px)',
                letterSpacing: '-0.03em',
                color: '#fff',
              }}
            >
              Quality at<br />a Glance
            </h2>
            <p
              className="mt-4 leading-[1.5]"
              style={{ fontSize: 'clamp(15px,1.5vw,18px)', color: 'var(--ink-faint)', maxWidth: '480px' }}
            >
              {activeLabel} is ready with the latest quality signal from {latestDateLabel(sheetData.entries)}.
            </p>
            <div className="flex items-center gap-4 mt-7 flex-wrap">
              <button
                type="button"
                onClick={() => onOpenDashboard(activeSheetName)}
                className="inline-flex items-center gap-2 rounded-[12px] bg-white text-[15px] font-bold transition-all hover:-translate-y-0.5"
                style={{ padding: '13px 22px', color: '#0d1017', fontFamily: 'var(--font-main)', whiteSpace: 'nowrap' }}
              >
                View {activeLabel}
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
              <span className="text-[13px] whitespace-nowrap" style={{ color: 'var(--ink-faint)' }}>
                Refreshed {formatRelative(lastUpdated)}
              </span>
            </div>
          </div>
        </section>

        {/* ── Dashboard cards ── */}
        <div>
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.13em]" style={{ color: 'var(--text-faint)' }}>Dashboards</span>
            <span className="text-[13px]" style={{ color: 'var(--text-faint)' }}>Select a report to preview · open it full-screen anytime</span>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {sheets.map((name) => {
              const isActive = name === activeSheetName;
              const lbl = labelMap[name] ?? name;
              const cached = sheetValueCache[name];
              const cardValue = isActive && latest ? latest.value : cached?.value;
              const cardPct = isActive ? sheetData.isPercentage : (cached?.isPercentage ?? false);
              const cardSpark = isActive ? sparkValues : cached?.sparkValues;
              const lowerIsBetterCard = /failure|count/i.test(name);
              return (
                <DashCard
                  key={name}
                  name={name}
                  label={lbl}
                  selected={isActive}
                  onSelect={() => onSelectDashboard(name)}
                  sparkValues={cardSpark}
                  latestValue={cardValue}
                  isPercentage={cardPct}
                  change={isActive ? change : null}
                  higherIsBetter={!lowerIsBetterCard}
                />
              );
            })}
          </div>
        </div>

        {/* ── Preview split ── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {/* Main preview card (span 2) */}
          <div
            className="col-span-2 rounded-[18px] border px-[22px] py-5 flex flex-col gap-5"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.13em]" style={{ color: 'var(--text-faint)' }}>Selected dashboard</span>
                <h3 className="text-[22px] font-extrabold tracking-[-0.02em] mt-1.5" style={{ color: 'var(--text)' }}>{activeLabel}</h3>
              </div>
              <button
                type="button"
                onClick={() => onOpenDashboard(activeSheetName)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-bold flex-shrink-0 transition-all"
                style={{ background: 'var(--ink)', color: 'var(--ink-text)', fontFamily: 'var(--font-main)' }}
              >
                Open full dashboard
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>

            {/* Body: dark stat card + sparkline chart */}
            <div className="grid gap-4" style={{ gridTemplateColumns: '230px minmax(0, 1fr)' }}>
              {/* Dark stat card */}
              <div className="rounded-[16px] p-5 flex flex-col" style={{ background: 'var(--ink)', color: 'var(--ink-text)' }}>
                <span className="text-[10.5px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--ink-faint)' }}>Latest total</span>
                <div className="text-[56px] font-extrabold tracking-[-0.03em] leading-none mt-2.5 tabular-nums">
                  {latest ? formatMetric(latest.value, sheetData.isPercentage) : '—'}
                </div>
                <div className="text-[12.5px] mt-2.5" style={{ color: 'var(--ink-faint)' }}>
                  {sheetData.metricLabel} · {latestDateLabel(sheetData.entries)}
                </div>
                <div className="mt-auto pt-4">
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[12px] font-bold"
                    style={
                      trendGood === true
                        ? { background: 'color-mix(in srgb,#10b981 24%,transparent)', color: '#6ee7b7', borderColor: 'transparent' }
                        : trendGood === false
                        ? { background: 'color-mix(in srgb,#ef4444 24%,transparent)', color: '#fca5a5', borderColor: 'transparent' }
                        : { background: 'rgba(255,255,255,0.1)', color: 'var(--ink-faint)', borderColor: 'rgba(255,255,255,0.15)' }
                    }
                  >
                    {deltaTxt} vs previous
                  </span>
                </div>
              </div>

              {/* Trend snapshot */}
              <div
                className="rounded-[16px] p-4 flex flex-col min-w-0"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>Trend snapshot</span>
                  {sheetLoading && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-200 border-t-[var(--accent)] animate-spin" />
                  )}
                  {/* Folder color dots */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {previewFolders.map((f) => (
                      <span key={f} className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-faint)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: getFolderColor(f), border: `2px solid ${getFolderColor(f)}` }} />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-h-[180px]">
                  {folderSeries.length > 0 ? (
                    <MultiSpark series={folderSeries} w={400} h={180} />
                  ) : (
                    <div className="h-[180px] rounded-lg" style={{ background: 'var(--surface)' }} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rail (span 1) */}
          <div className="flex flex-col gap-4">
            {/* Report card */}
            <div
              className="rounded-[18px] border overflow-hidden flex flex-col"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)', padding: '20px' }}
            >
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-faint)' }}>Current report</span>
              <h4 className="text-[19px] font-extrabold tracking-[-0.02em] mt-2" style={{ color: 'var(--text)' }}>{activeLabel}</h4>
              <p className="text-[13px] leading-[1.5] mt-2" style={{ color: 'var(--text-muted)' }}>{sheetDesc(activeSheetName)}</p>
              <div className="mt-4 mx-[-6px] -mb-1">
                <MiniSpark values={sparkValues.length >= 2 ? sparkValues : [0, 1]} color="var(--accent)" w={300} h={70} />
              </div>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-[16px] px-[18px] py-[18px] flex flex-col gap-1"
                style={{ background: 'color-mix(in srgb,#6366f1 12%,var(--surface))', border: '1px solid color-mix(in srgb,#6366f1 22%,transparent)' }}
              >
                <span className="text-[28px] font-extrabold tracking-[-0.02em] tabular-nums text-[#4f46e5]">{sheets.length}</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#6366f1]">Dashboards</span>
              </div>
              <div
                className="rounded-[16px] px-[18px] py-[18px] flex flex-col gap-1"
                style={{ background: 'color-mix(in srgb,#10b981 12%,var(--surface))', border: '1px solid color-mix(in srgb,#10b981 22%,transparent)' }}
              >
                <span className="text-[28px] font-extrabold tracking-[-0.02em] tabular-nums text-[#059669]">{teamCount}</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#10b981]">QA folders</span>
              </div>
              <div
                className="rounded-[16px] px-[18px] py-[18px] flex flex-col gap-1"
                style={{ background: 'color-mix(in srgb,#f59e0b 13%,var(--surface))', border: '1px solid color-mix(in srgb,#f59e0b 24%,transparent)' }}
              >
                <span className="text-[19px] font-extrabold tracking-[-0.02em] tabular-nums text-[#d97706]">{latestDate ? formatDMY(latestDate) : '-'}</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#f59e0b]">Latest</span>
              </div>
              <div
                className="rounded-[16px] px-[18px] py-[18px] flex flex-col gap-1"
                style={{ background: 'color-mix(in srgb,#3b82f6 12%,var(--surface))', border: '1px solid color-mix(in srgb,#3b82f6 22%,transparent)' }}
              >
                <span className="text-[19px] font-extrabold tracking-[-0.02em] tabular-nums text-[#2563eb]">{isLive ? 'Live' : 'Mock'}</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#3b82f6]">Source</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
