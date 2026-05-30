import { useMemo, useRef, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ChartRenderer } from '../charts/ChartRenderer';
import { DataTable } from '../charts/DataTable';
import { ForecastTable } from '../charts/ForecastTable';
import { SheetSelector } from '../charts/SheetSelector';
import { KpiCards } from '../charts/KpiCards';
import { SettingsModal } from '../settings/SettingsModal';
import { useFilter } from '../../context/FilterContext';
import { computeForecast } from '../../utils/forecast';
import { sortDates, formatDMY } from '../../utils/date';
import { getFolderColor } from '../../config/chartColors';
import type { SheetData, SheetEntry } from '../../types';

function exportToPng(containerRef: React.RefObject<HTMLDivElement | null>, sheetName: string): void {
  const svg = containerRef.current?.querySelector('svg');
  if (!svg) return;
  const { width, height } = svg.getBoundingClientRect();
  const scale = 2;
  const svgString = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) { URL.revokeObjectURL(url); return; }
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${sheetName.replace(/\s+/g, '-').toLowerCase()}-chart.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  img.src = url;
}

function exportToCsv(entries: SheetEntry[], metricLabel: string, sheetName: string): void {
  const dateOrder = sortDates([...new Set(entries.map((e) => e.date))]);
  const rows = dateOrder.flatMap((date) =>
    entries
      .filter((e) => e.date === date)
      .sort((a, b) => a.folderName.localeCompare(b.folderName))
      .map((e) => `${formatDMY(e.date)},${e.folderName},${e.value}`),
  );
  const csv = [`Date,Folder,${metricLabel}`, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sheetName.replace(/\s+/g, '-').toLowerCase()}-export.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

interface DashboardProps {
  readonly sheetData: SheetData;
  readonly sheets: string[];
  readonly displayActiveSheet: string;
  readonly onSheetChange: (name: string) => void;
  readonly sheetLoading: boolean;
  readonly lastUpdated: Date | null;
  readonly onConfigSaved: () => void;
  readonly labelMap: Record<string, string>;
  readonly onHome: () => void;
  readonly sheetValueCache?: Record<string, { value: number; isPercentage: boolean; sparkValues?: number[] }>;
}

function nowLabel(date: Date | null): string {
  if (!date) return '';
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

export function Dashboard({
  sheetData,
  sheets,
  displayActiveSheet,
  onSheetChange,
  sheetLoading,
  lastUpdated,
  onConfigSaved,
  labelMap,
  onHome,
  sheetValueCache = {},
}: DashboardProps) {
  const { selectedFolder, selectedDates, chartType, forecastDeadline, kpiTarget } = useFilter();
  const isRegressionSheet = /regression/i.test(sheetData.name);
  const regressionEntries = sheetData.regressionEntries ?? [];
  const filteredRegressionEntries =
    selectedFolder === 'ALL' || selectedFolder === 'TOTAL'
      ? regressionEntries
      : regressionEntries.filter((e) => e.folderName === selectedFolder);

  const needsAccelerationCount = useMemo(() => {
    if (chartType !== 'forecast' || !isRegressionSheet) return 0;
    return computeForecast(filteredRegressionEntries, forecastDeadline, kpiTarget)
      .filter((f) => f.status === 'needs-acceleration').length;
  }, [chartType, isRegressionSheet, filteredRegressionEntries, forecastDeadline, kpiTarget]);

  const chartBodyRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 900));
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const folders = useMemo(
    () => [...new Set(sheetData.entries.map((e) => e.folderName))].filter((f) => f !== 'TOTAL'),
    [sheetData.entries],
  );
  const dates = useMemo(
    () => sortDates([...new Set(sheetData.entries.map((e) => e.date))]),
    [sheetData.entries],
  );

  const dateSet = new Set(selectedDates);
  const rangeEntries = sheetData.entries.filter((e) => dateSet.has(e.date));

  const filteredEntries =
    selectedFolder === 'ALL'
      ? rangeEntries
      : rangeEntries.filter((e) => e.folderName === selectedFolder);

  const activeFolders = selectedFolder === 'ALL' ? folders : [selectedFolder];

  const sortedSelected = sortDates(selectedDates);
  let dateRangeLabel: string;
  if (sortedSelected.length === 0) {
    dateRangeLabel = '—';
  } else if (sortedSelected.length === 1) {
    dateRangeLabel = formatDMY(sortedSelected[0]);
  } else {
    dateRangeLabel = `${formatDMY(sortedSelected.at(0) ?? '')} – ${formatDMY(sortedSelected.at(-1) ?? '')}`;
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg)', fontFamily: 'var(--font-main)' }}>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConfigSaved={onConfigSaved}
      />
      <Header onOpenSettings={() => setSettingsOpen(true)} onHome={onHome} refreshedAt={nowLabel(lastUpdated)} />

      {/* Body: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar container */}
        <div className="relative shrink-0 h-full">
          <div className={`${sidebarOpen ? 'w-64' : 'w-0'} h-full transition-all duration-200 overflow-hidden`}>
            <Sidebar
              folders={folders}
              dates={dates}
              lastUpdated={lastUpdated}
              isRegressionSheet={isRegressionSheet}
              entries={rangeEntries}
              isPercentage={sheetData.isPercentage}
            />
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen((s) => !s)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="absolute right-0 top-14 z-20 translate-x-1/2 w-6 h-6 rounded-full shadow-sm flex items-center justify-center transition-colors hover:bg-gray-50"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <svg
              className={`w-2.5 h-2.5 transition-transform duration-200 ${sidebarOpen ? '' : 'rotate-180'}`}
              style={{ color: 'var(--text-faint)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Main content */}
        <main
          className={`flex-1 flex flex-col gap-4 min-w-0 ${chartType === 'forecast' ? 'overflow-y-auto' : 'overflow-hidden'}`}
          style={{ padding: 'clamp(12px, 2vw, 16px) clamp(16px, 3vw, 32px) 28px' }}
        >
          {/* Metric tabs — inside main so left edge aligns with content */}
          <SheetSelector
            sheets={sheets}
            activeSheet={displayActiveSheet}
            onChange={onSheetChange}
            labelMap={labelMap}
            sheetValueCache={sheetValueCache}
          />

          <KpiCards
            entries={rangeEntries}
            selectedFolder={selectedFolder}
            metricLabel={sheetData.metricLabel}
            isPercentage={sheetData.isPercentage}
          />

          {/* Chart card */}
          <div
            className={[
              'rounded-[16px] border flex flex-col',
              chartType === 'forecast' ? 'h-[380px] shrink-0' : 'flex-1 min-h-0',
            ].join(' ')}
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}
          >
            {sheetLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.7)' }}>
                <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-[var(--accent)] animate-spin" />
              </div>
            )}

            {/* Chart card header */}
            <div
              className="px-[18px] py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between shrink-0 border-b"
              style={{ borderColor: 'color-mix(in srgb, var(--border) 60%, transparent)' }}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-[14.5px] font-bold tracking-[-0.01em]" style={{ color: 'var(--text)' }}>
                  {sheetData.name}
                </span>
                <span style={{ color: 'var(--text-faint)' }}>·</span>
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  {chartType === 'forecast' ? `Projection to ${kpiTarget}%` : sheetData.metricLabel}
                </span>
                {needsAccelerationCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'color-mix(in srgb, #f59e0b 18%, transparent)', color: '#d97706', border: '1px solid color-mix(in srgb, #f59e0b 30%, transparent)' }}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {needsAccelerationCount} behind pace
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {selectedFolder !== 'ALL' && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5" style={{ color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getFolderColor(selectedFolder) }} />
                    {selectedFolder}
                  </span>
                )}
                <span className="text-[12px] tabular-nums" style={{ color: 'var(--text-faint)' }}>{dateRangeLabel}</span>

                {/* Chart / Table toggle */}
                {chartType !== 'forecast' && (
                  <div className="flex rounded-[9px] overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => setViewMode('chart')}
                      title="Chart view"
                      className="flex items-center gap-1 px-2.5 py-1 text-[12px] transition-colors"
                      style={
                        viewMode === 'chart'
                          ? { background: 'var(--accent)', color: '#fff' }
                          : { background: 'var(--surface)', color: 'var(--text-faint)' }
                      }
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      <span className="hidden sm:inline">Chart</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      title="Table view"
                      className="flex items-center gap-1 px-2.5 py-1 text-[12px] transition-colors border-l"
                      style={
                        viewMode === 'table'
                          ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--border)' }
                          : { background: 'var(--surface)', color: 'var(--text-faint)', borderColor: 'var(--border)' }
                      }
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 6v12M3 6h18v12H3z" />
                      </svg>
                      <span className="hidden sm:inline">Table</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => exportToPng(chartBodyRef, sheetData.name)}
                  title="Download chart as PNG"
                  className="w-[32px] h-[30px] rounded-[9px] flex items-center justify-center transition-colors"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-faint)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => exportToCsv(filteredEntries, sheetData.metricLabel, sheetData.name)}
                  title="Download CSV"
                  className="w-[32px] h-[30px] rounded-[9px] flex items-center justify-center transition-colors"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-faint)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>

            <div ref={chartBodyRef} className="flex-1 p-4 min-h-0">
              {viewMode === 'chart' ? (
                <ChartRenderer
                  entries={filteredEntries}
                  folders={activeFolders}
                  selectedFolder={selectedFolder}
                  metricLabel={sheetData.metricLabel}
                  isPercentage={sheetData.isPercentage}
                  regressionEntries={filteredRegressionEntries}
                />
              ) : (
                <DataTable
                  entries={filteredEntries}
                  metricLabel={sheetData.metricLabel}
                  isPercentage={sheetData.isPercentage}
                />
              )}
            </div>
          </div>

          {chartType === 'forecast' && isRegressionSheet && (
            <ForecastTable regressionEntries={filteredRegressionEntries} />
          )}
        </main>
      </div>
    </div>
  );
}
