import type { RegressionEntry, TeamForecast } from '../types';
import { parseDMY, formatDMY } from './date';

export const FORECAST_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function projectedMonthLabels(fromDate: Date, deadline: Date): string[] {
  const labels: string[] = [];
  const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 1);
  while (cursor <= deadline) {
    labels.push(`${FORECAST_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return labels;
}

export function computeForecast(entries: RegressionEntry[], deadline: Date, kpaTarget: number): TeamForecast[] {
  const teams = [...new Set(entries.map((e) => e.folderName))].filter((t) => t !== 'TOTAL');

  return teams.flatMap((team): TeamForecast[] => {
    const teamEntries = entries
      .filter((e) => e.folderName === team)
      .sort((a, b) => parseDMY(a.date).getTime() - parseDMY(b.date).getTime());

    const latest = teamEntries.at(-1);
    if (!latest) return [];
    const currentRate = latest.value;
    const totalScenarios = latest.regression;
    // Derive from the authoritative Score% (col E) rather than trusting col C directly,
    // since the sheet's own formula may not match automated/regression exactly.
    const currentAutomated = Math.round((currentRate / 100) * totalScenarios);

    const historical = teamEntries.map((e) => ({ label: formatDMY(e.date), rate: e.value }));

    const latestDate = parseDMY(latest.date);
    const monthLabels = projectedMonthLabels(latestDate, deadline);
    const monthsLeft = monthLabels.length;

    const targetAutomated = Math.ceil((kpaTarget / 100) * totalScenarios);
    const remaining = targetAutomated - currentAutomated;

    if (currentRate >= kpaTarget || remaining <= 0) {
      return [{
        team,
        currentRate,
        currentAutomated,
        totalScenarios,
        requiredPerMonth: 0,
        status: 'achieved' as const,
        historical,
        projected: monthLabels.map((label) => ({ label, rate: currentRate, automated: currentAutomated })),
      }];
    }
    const requiredPerMonth = Math.ceil(remaining / monthsLeft);

    // Compare recent monthly gain vs required monthly gain to determine status.
    // Use last 4 intervals (≈1 month of weekly data) as the recent trend window.
    const lookback = Math.max(0, teamEntries.length - 5);
    const windowStart = teamEntries[lookback];
    const windowSize = teamEntries.length - 1 - lookback;
    const recentMonthlyGainPct = windowSize > 0
      ? ((currentRate - windowStart.value) / windowSize) * 4
      : 0;
    const requiredMonthlyGainPct = (kpaTarget - currentRate) / monthsLeft;
    const status = recentMonthlyGainPct >= requiredMonthlyGainPct ? 'on-track' as const : 'needs-acceleration' as const;

    const projected = monthLabels.map((label, i) => {
      const projAutomated = Math.min(currentAutomated + requiredPerMonth * (i + 1), targetAutomated);
      return {
        label,
        rate: Number.parseFloat(((projAutomated / totalScenarios) * 100).toFixed(1)),
        automated: projAutomated,
      };
    });

    return [{ team, currentRate, currentAutomated, totalScenarios, requiredPerMonth, status, historical, projected }];
  });
}
