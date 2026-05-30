import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { RegressionEntry, TeamForecast } from '../../types';
import { computeForecast } from '../../utils/forecast';
import { getFolderColor } from '../../config/chartColors';
import { useFilter } from '../../context/FilterContext';

interface Props {
  readonly regressionEntries: RegressionEntry[];
  readonly width: number;
  readonly height: number;
}

type ChartRow = Record<string, number | string | boolean | undefined>;

function buildChartData(forecasts: TeamForecast[]): ChartRow[] {
  if (forecasts.length === 0) return [];

  const rows: ChartRow[] = [];
  const histLen = forecasts[0].historical.length;

  for (let i = 0; i < histLen; i++) {
    const row: ChartRow = { label: forecasts[0].historical[i].label, isProjected: false };
    for (const f of forecasts) {
      row[`${f.team}_hist`] = f.historical[i]?.rate;
    }
    // Duplicate last historical point into projected series as connection anchor
    if (i === histLen - 1) {
      for (const f of forecasts) {
        row[`${f.team}_proj`] = f.historical[i]?.rate;
      }
    }
    rows.push(row);
  }

  const projLen = forecasts[0].projected.length;
  for (let i = 0; i < projLen; i++) {
    const row: ChartRow = { label: forecasts[0].projected[i].label, isProjected: true };
    for (const f of forecasts) {
      row[`${f.team}_proj`] = f.projected[i]?.rate;
    }
    rows.push(row);
  }

  return rows;
}

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
}

function ForecastTooltip({
  active,
  payload,
  label,
}: {
  readonly active?: boolean;
  readonly payload?: TooltipPayloadEntry[];
  readonly label?: string;
}) {
  if (!active || !payload?.length) return null;

  const isProjected = payload.some((p) => p.dataKey.endsWith('_proj'));

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="font-semibold text-gray-800">{label}</span>
        {isProjected && (
          <span className="bg-indigo-100 text-indigo-600 rounded px-1 py-0.5 text-[10px] font-medium">
            Projected
          </span>
        )}
      </div>
      {payload.map((p) => {
        const team = p.dataKey.replace(/_hist$|_proj$/, '');
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-3 py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-gray-600">{team}</span>
            </div>
            <span className="font-semibold text-gray-800">{p.value.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function ForecastChart({ regressionEntries, width, height }: Props) {
  const { forecastDeadline, kpaTarget } = useFilter();
  const forecasts = useMemo(
    () => computeForecast(regressionEntries, forecastDeadline, kpaTarget),
    [regressionEntries, forecastDeadline, kpaTarget],
  );
  const chartData = useMemo(() => buildChartData(forecasts), [forecasts]);

  if (regressionEntries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-gray-400">No regression data available for forecast.</p>
      </div>
    );
  }

  const allRates = forecasts.flatMap((f) => [...f.historical.map((h) => h.rate), ...f.projected.map((p) => p.rate)]);
  const yMin = Math.max(0, Math.floor(Math.min(...allRates) / 10) * 10 - 5);

  const chartHeight = Math.max(height - 30, 220);

  return (
    <div className="w-full h-full flex flex-col gap-1">
      <div className="flex items-center gap-4 flex-wrap px-1">
        <span className="text-xs text-gray-500 flex items-center gap-1.5">
          <span className="inline-block w-6 border-t-2 border-gray-500" />{' '}Historical
        </span>
        <span className="text-xs text-gray-500 flex items-center gap-1.5">
          <span className="inline-block w-6 border-t-2 border-dashed border-gray-500" />{' '}Projected (required pace)
        </span>
        <span className="text-xs text-orange-500 flex items-center gap-1.5">
          <span className="inline-block w-6 border-t-2 border-dashed border-orange-400" />{' '}KPA target {kpaTarget}%
        </span>
      </div>

      <ComposedChart width={width} height={chartHeight} data={chartData} margin={{ top: 8, right: 24, bottom: 48, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            angle={-45}
            textAnchor="end"
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[yMin, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<ForecastTooltip />} />
          <ReferenceLine
            y={kpaTarget}
            stroke="#f97316"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: `KPA ${kpaTarget}%`, position: 'insideTopRight', fontSize: 10, fill: '#f97316', dy: -4 }}
          />
          {forecasts.map((f) => {
            const color = getFolderColor(f.team);
            return [
              <Line
                key={`${f.team}_hist`}
                dataKey={`${f.team}_hist`}
                stroke={color}
                strokeWidth={1.75}
                dot={{ r: 2, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                connectNulls
                legendType="none"
                name={f.team}
              />,
              <Line
                key={`${f.team}_proj`}
                dataKey={`${f.team}_proj`}
                stroke={color}
                strokeWidth={1.75}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
                legendType="none"
                name={f.team}
              />,
            ];
          })}
      </ComposedChart>
    </div>
  );
}
