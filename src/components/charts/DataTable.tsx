import { useState } from 'react';
import { parseDMY, formatDMY } from '../../utils/date';
import { getFolderColor } from '../../config/chartColors';
import { EmptyState } from './EmptyState';
import type { SheetEntry } from '../../types';

type SortKey = 'date' | 'folderName' | 'value';
type SortDir = 'asc' | 'desc';

function sortedEntries(entries: SheetEntry[], key: SortKey, dir: SortDir): SheetEntry[] {
  return [...entries].sort((a, b) => {
    let cmp: number;
    if (key === 'date') {
      cmp = parseDMY(a.date).getTime() - parseDMY(b.date).getTime();
    } else if (key === 'folderName') {
      cmp = a.folderName.localeCompare(b.folderName);
    } else {
      cmp = a.value - b.value;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

function SortIcon({ active, dir }: { readonly active: boolean; readonly dir: SortDir }) {
  if (active) {
    const path =
      dir === 'asc'
        ? 'M5 15l7-7 7 7'
        : 'M19 9l-7 7-7-7';
    return (
      <svg className="w-3 h-3 text-indigo-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
      </svg>
    );
  }
  return (
    <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

const COLUMNS: Array<{ key: SortKey; label: (metric: string) => string }> = [
  { key: 'date',       label: () => 'Date' },
  { key: 'folderName', label: () => 'Folder' },
  { key: 'value',      label: (m) => m },
];

interface DataTableProps {
  readonly entries: SheetEntry[];
  readonly metricLabel: string;
  readonly isPercentage: boolean;
}

export function DataTable({ entries, metricLabel, isPercentage }: DataTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  if (entries.length === 0) return <EmptyState />;

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const rows = sortedEntries(entries, sortKey, sortDir);

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-100">
          <tr>
            {COLUMNS.map(({ key, label }) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-800 select-none"
              >
                <span className="flex items-center gap-1">
                  {label(metricLabel)}
                  <SortIcon active={sortKey === key} dir={sortDir} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((entry, i) => (
            <tr
              key={`${entry.date}-${entry.folderName}`}
              className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}
            >
              <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                {formatDMY(entry.date)}
              </td>
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getFolderColor(entry.folderName) }}
                  />
                  <span className="text-gray-800 font-medium">{entry.folderName}</span>
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-900 font-medium tabular-nums">
                {isPercentage ? `${entry.value}%` : entry.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
