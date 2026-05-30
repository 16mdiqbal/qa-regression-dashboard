import { useMemo } from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { sortDates, formatDMY, parseDMY } from '../../utils/date';
import { getFolderColor } from '../../config/chartColors';
import { EmptyState } from './EmptyState';
import type { SheetEntry } from '../../types';

interface AreaChartProps {
  readonly entries: SheetEntry[];
  readonly folders: string[];
  readonly metricLabel: string;
  readonly isPercentage: boolean;
  readonly width: number;
  readonly height: number;
}

type ChartRow = { date: string; [key: string]: string | number };

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  readonly active?: boolean;
  readonly payload?: TooltipPayloadItem[];
  readonly label?: string;
  readonly isPercentage: boolean;
}

function CustomTooltip({ active, payload, label, isPercentage }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm min-w-48">
      <p className="font-semibold text-gray-700 mb-2">{formatDMY(label)}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-gray-600">{p.dataKey}</span>
          </span>
          <span className="font-medium text-gray-900">
            {isPercentage ? `${p.value}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function makeTooltipContent(isPercentage: boolean) {
  return function TooltipContent({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: ReadonlyArray<unknown>;
    label?: string | number;
  }) {
    return (
      <CustomTooltip
        active={active}
        payload={payload as TooltipPayloadItem[]}
        label={label === undefined ? undefined : String(label)}
        isPercentage={isPercentage}
      />
    );
  };
}

function buildChartData(entries: SheetEntry[], folders: string[]): ChartRow[] {
  const map: Record<string, Record<string, SheetEntry>> = {};
  for (const e of entries) {
    map[e.date] ??= {};
    map[e.date][e.folderName] = e;
  }
  const dates = sortDates([...new Set(entries.map((e) => e.date))]);
  return dates.map((date) => {
    const row: ChartRow = { date };
    for (const folder of folders) {
      const entry = map[date]?.[folder];
      if (entry !== undefined) row[folder] = entry.value;
    }
    return row;
  });
}

export function AreaChart({ entries, folders, metricLabel, isPercentage, width, height }: AreaChartProps) {
  const rows = buildChartData(entries, folders);
  const TooltipContent = useMemo(() => makeTooltipContent(isPercentage), [isPercentage]);

  if (entries.length === 0) return <EmptyState />;

  const orderedFolders = [
    ...folders.filter((f) => f !== 'TOTAL'),
    ...folders.filter((f) => f === 'TOTAL'),
  ];

  return (
    <RechartsAreaChart width={width} height={height} data={rows} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tickFormatter={(v: string) => {
            const d = parseDMY(v);
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          }}
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={{ stroke: '#e2e8f0' }}
          tickLine={false}
        />
        <YAxis
          domain={isPercentage ? [0, 100] : [0, 'auto']}
          tickFormatter={(v: number) => (isPercentage ? `${v}%` : String(v))}
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={52}
          label={{
            value: metricLabel,
            angle: -90,
            position: 'insideLeft',
            offset: 12,
            style: { textAnchor: 'middle', fontSize: 11, fill: '#94a3b8' },
          }}
        />
        <Tooltip content={TooltipContent} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
        />
        {orderedFolders.map((folder) => (
          <Area
            key={folder}
            type="monotone"
            dataKey={folder}
            stroke={getFolderColor(folder)}
            strokeWidth={folder === 'TOTAL' ? 2.5 : 1.75}
            fill={getFolderColor(folder)}
            fillOpacity={0.08}
            dot={{ r: 3, fill: getFolderColor(folder), strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
    </RechartsAreaChart>
  );
}
