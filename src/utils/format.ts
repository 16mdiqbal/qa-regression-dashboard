export function formatMetric(v: number, isPercentage: boolean): string {
  const r = Math.round(v * 10) / 10;
  const s = r % 1 === 0 ? String(r) : r.toFixed(1);
  return isPercentage ? `${s}%` : s;
}

export function formatChange(abs: number, isPercentage: boolean): string {
  const r = Math.round(abs * 10) / 10;
  const s = r % 1 === 0 ? String(r) : r.toFixed(1);
  return isPercentage ? `${s} pts` : s;
}
