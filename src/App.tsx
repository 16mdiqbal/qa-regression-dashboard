/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { fetchSheetNames, fetchSheetData, invalidateTokenCache } from './services/sheetsService';
import { FilterProvider } from './context/FilterContext';
import { Dashboard } from './components/layout/Dashboard';
import { LandingPage } from './components/layout/LandingPage';
import { PinModal } from './components/settings/PinModal';
import { loadConfig, isConfigEncrypted } from './config/runtimeConfig';
import { sortDates } from './utils/date';
import { latestTotal } from './utils/entries';
import type { SheetData, SheetEntry } from './types';

function buildSparkValues(entries: SheetEntry[]): number[] {
  const dates = sortDates([...new Set(entries.map((e) => e.date))]);
  return dates.map((d) => {
    return (
      entries.find((e) => e.date === d && e.folderName === 'TOTAL')?.value ??
      entries.find((e) => e.date === d)?.value ??
      0
    );
  });
}

function cacheEntry(data: SheetData): { value: number; isPercentage: boolean; sparkValues?: number[] } | null {
  const v = latestTotal(data.entries)?.value;
  if (v === undefined) return null;
  return { value: v, isPercentage: data.isPercentage, sparkValues: buildSparkValues(data.entries) };
}

function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [sheets, setSheets] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState('');
  const [pendingSheetName, setPendingSheetName] = useState('');
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [needsPin, setNeedsPin] = useState(() => isConfigEncrypted() && loadConfig() === null);

  // Cache latest value + sparkline history for all sheets (metric tabs + landing cards)
  const [sheetValueCache, setSheetValueCache] = useState<Record<string, { value: number; isPercentage: boolean; sparkValues?: number[] }>>({});

  useEffect(() => {
    if (needsPin) return;
    setInitLoading(true);
    setError(null);
    (async () => {
      try {
        const names = await fetchSheetNames();
        setSheets(names);
        const first = names[0] ?? '';
        const firstData = await fetchSheetData(first);
        setSheetData(firstData);
        setActiveSheetName(first);
        setLastUpdated(new Date());
        const entry = cacheEntry(firstData);
        if (entry) setSheetValueCache((c) => ({ ...c, [first]: entry }));
        // Pre-fetch all other sheets in the background so landing cards show sparklines + values
        for (const name of names.slice(1)) {
          fetchSheetData(name).then((d) => {
            const e = cacheEntry(d);
            if (e) setSheetValueCache((c) => ({ ...c, [name]: e }));
          }).catch(() => {/* ignore */});
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setInitLoading(false);
      }
    })();
  }, [fetchKey, needsPin]);

  function reinitialize() {
    invalidateTokenCache();
    setSheetData(null);
    setSheets([]);
    setActiveSheetName('');
    setSheetValueCache({});
    setView('landing');
    setFetchKey((k) => k + 1);
  }

  function handlePinSuccess() {
    setNeedsPin(false);
    setFetchKey((k) => k + 1);
  }

  async function loadSheet(name: string): Promise<boolean> {
    if (name === activeSheetName) return true;
    if (name === pendingSheetName) return false;
    setPendingSheetName(name);
    setSheetLoading(true);
    try {
      const newData = await fetchSheetData(name);
      setSheetData(newData);
      setActiveSheetName(name);
      setLastUpdated(new Date());
      setPendingSheetName('');
      const e = cacheEntry(newData);
      if (e) setSheetValueCache((c) => ({ ...c, [name]: e }));
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPendingSheetName('');
      return false;
    } finally {
      setSheetLoading(false);
    }
  }

  function handleSheetChange(name: string) {
    void loadSheet(name);
  }

  async function handleOpenDashboard(name: string) {
    if (name !== activeSheetName) {
      const loaded = await loadSheet(name);
      if (!loaded) return;
    }
    setView('dashboard');
  }

  if (needsPin) {
    return <PinModal onUnlocked={handlePinSuccess} onCleared={handlePinSuccess} />;
  }

  if (initLoading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-gray-200 animate-spin" style={{ borderTopColor: 'var(--accent)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-main)' }}>Loading dashboard data…</p>
        </div>
      </div>
    );
  }

  if (error || !sheetData) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="rounded-[16px] px-8 py-6 text-sm max-w-md text-center" style={{ background: 'color-mix(in srgb,#ef4444 8%,white)', border: '1px solid color-mix(in srgb,#ef4444 25%,transparent)' }}>
          <p className="font-bold text-red-700 mb-1">Failed to load data</p>
          <p className="text-red-500">{error ?? 'No data returned'}</p>
        </div>
      </div>
    );
  }

  const availableDates = sortDates([...new Set(sheetData.entries.map((e) => e.date))]);
  const displayActiveSheet = pendingSheetName || activeSheetName;
  const labelMap = Object.fromEntries(
    (loadConfig()?.sheetMappings ?? []).map((m) => [m.sheetName, m.reportLabel]),
  );

  if (view === 'landing') {
    return (
      <LandingPage
        sheets={sheets}
        activeSheetName={displayActiveSheet}
        sheetData={sheetData}
        lastUpdated={lastUpdated}
        sheetLoading={sheetLoading}
        labelMap={labelMap}
        sheetValueCache={sheetValueCache}
        onSelectDashboard={handleSheetChange}
        onOpenDashboard={handleOpenDashboard}
        onConfigSaved={reinitialize}
      />
    );
  }

  return (
    <FilterProvider key={activeSheetName} availableDates={availableDates}>
      <Dashboard
        sheetData={sheetData}
        sheets={sheets}
        displayActiveSheet={displayActiveSheet}
        onSheetChange={handleSheetChange}
        sheetLoading={sheetLoading}
        lastUpdated={lastUpdated}
        onConfigSaved={reinitialize}
        labelMap={labelMap}
        sheetValueCache={sheetValueCache}
        onHome={() => setView('landing')}
      />
    </FilterProvider>
  );
}

export default App;
