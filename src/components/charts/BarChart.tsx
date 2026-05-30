import { useMemo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { sortDates, parseDMY } from '../../utils/date';
import { getFolderColor } from '../../config/chartColors';
import { EmptyState } from './EmptyState';
import type { SheetEntry } from '../../types';

interface BarChartProps {
  readonly entries: SheetEntry[];
  readonly folders: string[];
  readonly selectedFolder: string;
  readonly metricLabel: string;
  readonly isPercentage: boolean;
  readonly width: number;
  readonly height: number;
}

type GroupedRow = { date: string; [key: string]: string | number };
type SingleRow = { date: string; value: number };

function buildGroupedData(entries: SheetEntry[], folders: string[]): GroupedRow[] {
  const sorted = sortDates([...new Set(entries.map((e) => e.date))]);
  return sorted.map((date) => {
    const row: GroupedRow = { date };
    for (const folder of folders) {
      const entry = entries.find((e) => e.date === date && e.folderName === folder);
      if (entry) row[folder] = entry.value;
    }
    return row;
  });
}

function buildSingleFolderData(entries: SheetEntry[]): SingleRow[] {
  const sorted = sortDates([...new Set(entries.map((e) => e.date))]);
  return sorted.map((date) => ({
    date,
    value: entries.find((e) => e.date === date)?.value ?? 0,
  }));
}

function makeAllFoldersTooltip(isPercentage: boolean) {
  return function AllFoldersTooltipContent({
    active,
    payload,
    label,
  }: {
    readonly active?: boolean;
    readonly payload?: ReadonlyArray<unknown>;
    readonly label?: string | number;
  }) {
    if (!active || !payload?.length) return null;
    const d = parseDMY(String(label ?? ''));
    const displayLabel = d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm min-w-44">
        <p className="font-semibold text-gray-700 mb-2">{displayLabel}</p>
        {(payload as Array<{ name: string; value: number; fill: string }>).map((item) => (
          <div key={item.name} className="flex items-center gap-2 mb-0.5">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: item.fill }}
            />
            <span className="text-gray-600">{item.name}</span>
            <span className="ml-auto font-medium text-gray-900">
              {isPercentage ? `${item.value}%` : item.value}
            </span>
          </div>
        ))}
      </div>
    );
  };
}

function makeSingleFolderTooltip(isPercentage: boolean) {
  return function SingleFolderTooltipContent({
    active,
    payload,
    label,
  }: {
    readonly active?: boolean;
    readonly payload?: ReadonlyArray<unknown>;
    readonly label?: string | number;
  }) {
    if (!active || !payload?.length) return null;
    const item = payload[0] as { value: number };
    const d = parseDMY(String(label ?? ''));
    const displayLabel = d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm min-w-40">
        <p className="font-semibold text-gray-700 mb-1">{displayLabel}</p>
        <p className="text-gray-900 font-medium">
          {isPercentage ? `${item.value}%` : item.value}
        </p>
      </div>
    );
  };
}

function BarValueLabel(props: {
  readonly x?: number | string;
  readonly y?: number | string;
  readonly width?: number | string;
  readonly value?: string | number | boolean | null;
  readonly isPercentage?: boolean;
}): React.ReactElement | null {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  if (!props.value && props.value !== 0) return null;

  const label = props.isPercentage ? `${props.value}%` : String(props.value);
  const pillW = Math.max(label.length * 7 + 12, 34);
  const pillH = 18;
  const cx = x + width / 2;

  return (
    <g>
      <rect
        x={cx - pillW / 2}
        y={y - pillH - 5}
        width={pillW}
        height={pillH}
        rx={9}
        fill="#f1f5f9"
        stroke="#e2e8f0"
        strokeWidth={1}
      />
      <text
        x={cx}
        y={y - pillH / 2 - 5 + 4}
        textAnchor="middle"
        fontSize={11}
        fill="#475569"
        fontWeight="500"
      >
        {label}
      </text>
    </g>
  );
}

const sharedXAxisProps = {
  tickFormatter: (v: string) => {
    const d = parseDMY(v);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  },
  tick: { fontSize: 12, fill: '#94a3b8' },
  axisLine: { stroke: '#e2e8f0' },
  tickLine: false,
} as const;

function buildYAxis(isPercentage: boolean, metricLabel: string) {
  return (
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
  );
}

export function BarChart({ entries, folders, selectedFolder, metricLabel, isPercentage, width, height }: BarChartProps) {
  const AllFoldersTooltip = useMemo(() => makeAllFoldersTooltip(isPercentage), [isPercentage]);
  const SingleFolderTooltip = useMemo(() => makeSingleFolderTooltip(isPercentage), [isPercentage]);
  // Pass isPercentage through Recharts' label object so BarValueLabel receives it as a prop
  const barLabel = useMemo(
    () => ({ content: BarValueLabel, isPercentage }) as React.ComponentProps<typeof Bar>['label'],
    [isPercentage],
  );

  if (entries.length === 0) return <EmptyState />;

  const yAxis = buildYAxis(isPercentage, metricLabel);

  if (selectedFolder === 'ALL') {
    const data = buildGroupedData(entries, folders);
    return (
      <RechartsBarChart width={width} height={height} data={data} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="date" {...sharedXAxisProps} />
          {yAxis}
          <Tooltip content={AllFoldersTooltip} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
          {folders.map((folder) => (
            <Bar
              key={folder}
              dataKey={folder}
              fill={getFolderColor(folder)}
              maxBarSize={20}
              radius={[4, 4, 0, 0]}
            />
          ))}
      </RechartsBarChart>
    );
  }

  const data = buildSingleFolderData(entries);
  return (
    <RechartsBarChart width={width} height={height} data={data} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="date" {...sharedXAxisProps} />
        {yAxis}
        <Tooltip content={SingleFolderTooltip} />
        <Bar
          dataKey="value"
          fill={getFolderColor(selectedFolder)}
          radius={[4, 4, 0, 0]}
          maxBarSize={56}
          label={barLabel}
        />
    </RechartsBarChart>
  );
}
