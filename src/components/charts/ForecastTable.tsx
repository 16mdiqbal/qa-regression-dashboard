import { useMemo } from 'react';
import type { RegressionEntry, TeamForecast } from '../../types';
import { computeForecast, FORECAST_MONTHS } from '../../utils/forecast';
import { getFolderColor } from '../../config/chartColors';
import { useFilter } from '../../context/FilterContext';

interface Props {
  readonly regressionEntries: RegressionEntry[];
}

function sparklineColor(first: number, last: number): string {
  if (last > first) return '#10b981';
  if (last < first) return '#f59e0b';
  return '#94a3b8';
}

function Sparkline({ rates }: { readonly rates: number[] }) {
  if (rates.length < 2) return null;
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const range = max - min || 1;
  const W = 40; const H = 14;
  const pts = rates
    .map((v, i) => `${(i / (rates.length - 1)) * W},${H - ((v - min) / range) * H}`)
    .join(' ');
  const color = sparklineColor(rates[0], rates.at(-1) ?? rates[0]);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="inline-block align-middle shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STATUS_CONFIG = {
  achieved: { label: 'Achieved ✓', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'on-track': { label: 'On Track', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'needs-acceleration': { label: 'Needs Acceleration', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
} satisfies Record<TeamForecast['status'], { label: string; bg: string; text: string; border: string }>;

export function ForecastTable({ regressionEntries }: Props) {
  const { forecastDeadline, kpaTarget } = useFilter();
  const forecasts = useMemo(
    () => computeForecast(regressionEntries, forecastDeadline, kpaTarget),
    [regressionEntries, forecastDeadline, kpaTarget],
  );

  if (forecasts.length === 0) return null;

  const projectedMonths = forecasts[0].projected.map((p) => p.label);
  const deadlineLabel = `${FORECAST_MONTHS[forecastDeadline.getMonth()]} ${forecastDeadline.getFullYear()}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-md flex flex-col max-h-[480px]">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">KPA Pace Plan</span>
          <span className="text-gray-300 select-none">·</span>
          <span className="text-sm text-gray-500">Monthly automation rate targets to reach {kpaTarget}%</span>
        </div>
        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-0.5">
          Deadline: {deadlineLabel}
        </span>
      </div>

      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wider text-[10px] sticky left-0 bg-gray-50 whitespace-nowrap">
                Team
              </th>
              <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">
                Current %
              </th>
              <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">
                Total Scenarios
              </th>
              <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">
                Need to Automate
              </th>
              <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">
                Pace / Month
              </th>
              {projectedMonths.map((m) => (
                <th key={m} className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">
                  {m}
                </th>
              ))}
              <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {forecasts.map((f) => {
              const cfg = STATUS_CONFIG[f.status];
              const targetAutomated = Math.ceil((kpaTarget / 100) * f.totalScenarios);
              const remainingScenarios = Math.max(0, targetAutomated - f.currentAutomated);

              return (
                <tr key={f.team} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-2.5 sticky left-0 bg-white">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: getFolderColor(f.team) }}
                      />
                      <span className="font-medium text-gray-800">{f.team}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Sparkline rates={f.historical.slice(-5).map((h) => h.rate)} />
                      <span className={`font-semibold ${f.currentRate >= kpaTarget ? 'text-emerald-600' : 'text-gray-800'}`}>
                        {f.currentRate.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-600">
                    {f.totalScenarios.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-600">
                    {f.status === 'achieved' ? (
                      <span className="text-emerald-600">—</span>
                    ) : (
                      <span className="text-amber-600 font-medium">+{remainingScenarios}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {f.status === 'achieved' ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <span className="font-semibold text-indigo-600">+{f.requiredPerMonth}/mo</span>
                    )}
                  </td>
                  {f.projected.map((p, i) => {
                    const isHit = p.rate >= kpaTarget;
                    const wasAlreadyHit = i > 0 && f.projected[i - 1].rate >= kpaTarget;
                    return (
                      <td key={p.label} className="px-3 py-2.5 text-right tabular-nums">
                        {isHit && !wasAlreadyHit ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 font-semibold text-[11px] whitespace-nowrap">
                            {p.rate.toFixed(1)}% ✓
                          </span>
                        ) : (
                          <span className={isHit ? 'text-emerald-600 font-semibold' : 'text-gray-600'}>
                            {p.rate.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center gap-4 text-[10px] text-gray-400 shrink-0">
        <span>Pace = scenarios to automate per month at constant required rate</span>
        <span className="text-gray-200">|</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-px text-[9px] font-semibold">✓</span>
          = first month hitting {kpaTarget}%
        </span>
      </div>
    </div>
  );
}
