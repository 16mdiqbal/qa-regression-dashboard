import { useState } from 'react';
import { useFilter } from '../../context/FilterContext';
import { formatDMY, parseDMY, sortDates } from '../../utils/date';

interface DateSelectorProps {
  readonly dates: string[];
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function sod(dt: Date): Date {
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}


// ── Preset builder ────────────────────────────────────────────────────────────
function buildPresets(sorted: string[]) {
  return [
    { label: 'All', dates: sorted },
    { label: '8w', dates: sorted.slice(Math.max(0, sorted.length - 8)) },
    { label: '4w', dates: sorted.slice(Math.max(0, sorted.length - 4)) },
  ];
}

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((d) => s.has(d));
}

// ── Calendar component ────────────────────────────────────────────────────────
interface CalendarProps {
  availDates: string[];   // sorted snapshot date strings
  selectedDates: string[];
  onChange: (dates: string[]) => void;
}

function Calendar({ availDates, selectedDates, onChange }: CalendarProps) {
  const sorted = availDates; // already sorted by parent
  const snapTimestamps = new Set(availDates.map((s) => parseDMY(s).getTime()));
  const minDt = sorted.length ? sod(parseDMY(sorted[0])) : new Date();
  const maxDt = sorted.length ? sod(parseDMY(sorted[sorted.length - 1])) : new Date();
  const minMonth = new Date(minDt.getFullYear(), minDt.getMonth(), 1);
  const maxMonth = new Date(maxDt.getFullYear(), maxDt.getMonth(), 1);

  const sortedSel = sortDates(selectedDates);
  const startDt = sortedSel.length ? sod(parseDMY(sortedSel[0])) : minDt;
  const endDt   = sortedSel.length ? sod(parseDMY(sortedSel[sortedSel.length - 1])) : maxDt;

  const [view, setView] = useState(() => new Date(startDt.getFullYear(), startDt.getMonth(), 1));
  const [pending, setPending] = useState<Date | null>(null);

  function nearestSnap(dt: Date): string | null {
    let best: string | null = null;
    let bestD = Infinity;
    for (const s of sorted) {
      const d = Math.abs(sod(parseDMY(s)).getTime() - dt.getTime());
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  function pick(dt: Date) {
    const snap = nearestSnap(dt);
    if (!snap) return;
    if (!pending) {
      setPending(dt);
      // select just this snapshot temporarily
      onChange(sorted.filter((s) => s === snap));
    } else {
      const a = pending < dt ? pending : dt;
      const b = pending < dt ? dt : pending;
      const snapA = nearestSnap(a);
      const snapB = nearestSnap(b);
      const newSel = sorted.filter((s) => {
        const d = sod(parseDMY(s));
        const da = snapA ? sod(parseDMY(snapA)) : minDt;
        const db = snapB ? sod(parseDMY(snapB)) : maxDt;
        return d >= da && d <= db;
      });
      onChange(newSel.length ? newSel : sorted);
      setPending(null);
    }
  }

  const year = view.getFullYear();
  const month = view.getMonth();
  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const canPrev = view > minMonth;
  const canNext = view < maxMonth;

  const snapCount = sorted.filter((s) => {
    const d = sod(parseDMY(s));
    return d >= startDt && d <= endDt;
  }).length;

  return (
    <div
      className="rounded-[14px] p-3 mt-1"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => setView(new Date(year, month - 1, 1))}
          className="w-7 h-7 rounded-[8px] flex items-center justify-center transition-colors disabled:opacity-30"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)' }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
          {MONTH_FULL[month]} <b style={{ color: 'var(--text)', fontWeight: 700 }}>{year}</b>
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="w-7 h-7 rounded-[8px] flex items-center justify-center transition-colors disabled:opacity-30"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)' }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Day-of-week row */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d, i) => (
          <span key={i} className="text-center text-[10px] font-bold" style={{ color: 'var(--text-faint)' }}>{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7" style={{ gap: '3px 0' }}>
        {cells.map((d, i) => {
          if (d === null) return <span key={i} className="invisible" style={{ height: '30px' }} />;
          const dt = sod(new Date(year, month, d));
          const inData = dt >= minDt && dt <= maxDt;
          const inSpan = dt >= startDt && dt <= endDt;
          const isStart = +dt === +startDt;
          const isEnd = +dt === +endDt;
          const isSnap = snapTimestamps.has(new Date(year, month, d).getTime());
          const dow = dt.getDay();
          const capL = inSpan && (isStart || dow === 0 || d === 1);
          const capR = inSpan && (isEnd || dow === 6 || d === daysInMonth);

          return (
            <div
              key={i}
              className="relative flex items-center justify-center"
              style={{
                height: '30px',
                background: inSpan ? 'color-mix(in srgb, var(--accent) 13%, transparent)' : 'transparent',
                borderTopLeftRadius: capL ? '10px' : '0',
                borderBottomLeftRadius: capL ? '10px' : '0',
                borderTopRightRadius: capR ? '10px' : '0',
                borderBottomRightRadius: capR ? '10px' : '0',
              }}
            >
              <button
                type="button"
                disabled={!inData}
                onClick={() => inData && pick(dt)}
                className="relative z-10 w-[26px] h-[26px] flex items-center justify-center rounded-[8px] text-[12.5px] font-semibold transition-colors"
                style={{
                  fontFamily: 'var(--font-main)',
                  color: (isStart || isEnd) ? '#fff' : inData ? 'var(--text)' : 'transparent',
                  background: (isStart || isEnd)
                    ? 'var(--accent)'
                    : 'transparent',
                  boxShadow: (isStart || isEnd) ? '0 3px 9px -2px color-mix(in srgb,var(--accent) 60%,transparent)' : 'none',
                  opacity: inData ? 1 : 0.25,
                  cursor: inData ? 'pointer' : 'default',
                }}
              >
                {d}
              </button>
              {isSnap && !isStart && !isEnd && (
                <span
                  className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full z-10"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="mt-2.5 pt-2 text-center text-[11.5px]"
        style={{ borderTop: '1px solid color-mix(in srgb,var(--border) 70%,transparent)', color: 'var(--text-muted)' }}
      >
        {pending
          ? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Now pick an end date…</span>
          : <span><b style={{ color: 'var(--accent)' }}>{snapCount}</b> {snapCount === 1 ? 'snapshot' : 'snapshots'} selected</span>
        }
      </div>
    </div>
  );
}

// ── DateSelector (exported) ───────────────────────────────────────────────────
export function DateSelector({ dates }: DateSelectorProps) {
  const { selectedDates, setSelectedDates } = useFilter();
  const [calOpen, setCalOpen] = useState(false);

  const sorted = sortDates(dates);
  const presets = buildPresets(sorted);

  let activePreset: string | null = null;
  for (const p of presets) {
    if (setsEqual(selectedDates, p.dates)) { activePreset = p.label; break; }
  }

  const sortedSel = sortDates(selectedDates);
  const fromLabel = sortedSel.length ? formatDMY(sortedSel[0]) : '—';
  const toLabel   = sortedSel.length ? formatDMY(sortedSel[sortedSel.length - 1]) : '—';
  const rangeLabel = fromLabel === toLabel ? fromLabel : `${fromLabel} → ${toLabel}`;

  return (
    <div className="flex flex-col gap-2">
      {/* Presets */}
      <div className="flex gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => { setSelectedDates(p.dates); setCalOpen(false); }}
            className="flex-1 text-[12px] font-semibold py-1.5 rounded-[8px] transition-colors"
            style={
              activePreset === p.label
                ? { background: 'var(--ink)', color: 'var(--ink-text)', border: '1px solid var(--ink)', fontFamily: 'var(--font-main)' }
                : { background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-main)' }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Collapsible calendar trigger */}
      <button
        type="button"
        onClick={() => setCalOpen((o) => !o)}
        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-[10px] transition-all"
        style={{
          border: `1px solid ${calOpen ? 'color-mix(in srgb,var(--accent) 40%,var(--border))' : 'var(--border)'}`,
          background: calOpen ? 'color-mix(in srgb,var(--accent) 7%,var(--surface))' : 'var(--surface)',
          fontFamily: 'var(--font-main)',
        }}
      >
        <span
          className="w-[26px] h-[26px] rounded-[7px] flex items-center justify-center flex-shrink-0"
          style={{
            background: calOpen ? 'color-mix(in srgb,var(--accent) 16%,transparent)' : 'var(--bg)',
            color: calOpen ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </span>
        <span className="flex-1 text-left text-[13px] font-bold tabular-nums" style={{ color: 'var(--text)' }}>
          {rangeLabel}
        </span>
        <svg
          width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
          strokeLinecap="round" strokeLinejoin="round"
          style={{ color: 'var(--text-faint)', transform: calOpen ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.18s', flexShrink: 0 }}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {calOpen && (
        <Calendar
          availDates={sorted}
          selectedDates={selectedDates}
          onChange={(next) => { setSelectedDates(next); }}
        />
      )}
    </div>
  );
}
