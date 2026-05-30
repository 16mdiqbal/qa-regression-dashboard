import { sortDates } from './date';
import type { SheetEntry } from '../types';

export function latestTotal(entries: SheetEntry[]): SheetEntry | null {
  const latestDate = sortDates([...new Set(entries.map((e) => e.date))]).at(-1);
  if (!latestDate) return null;
  return entries.find((e) => e.date === latestDate && e.folderName === 'TOTAL')
    ?? entries.find((e) => e.date === latestDate)
    ?? null;
}
