export function parseDMY(date: string): Date {
  const [d, m, y] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function sortDates(dates: string[]): string[] {
  return [...dates].sort((a, b) => parseDMY(a).getTime() - parseDMY(b).getTime());
}

export function formatDMY(date: string): string {
  const d = parseDMY(date);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
