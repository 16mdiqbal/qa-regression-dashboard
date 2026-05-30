import { useEffect, useRef, useState } from 'react';
import { useFilter } from '../../context/FilterContext';
import { TrendLineChart } from './TrendLineChart';
import { BarChart } from './BarChart';
import { AreaChart } from './AreaChart';
import { ForecastChart } from './ForecastChart';
import type { SheetEntry, RegressionEntry } from '../../types';

interface ChartRendererProps {
  readonly entries: SheetEntry[];
  readonly folders: string[];
  readonly selectedFolder: string;
  readonly metricLabel: string;
  readonly isPercentage: boolean;
  readonly regressionEntries?: RegressionEntry[];
}

export function ChartRenderer({
  entries,
  folders,
  selectedFolder,
  metricLabel,
  isPercentage,
  regressionEntries = [],
}: ChartRendererProps) {
  const { chartType } = useFilter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        setContainerSize(
          rect.width > 0 && rect.height > 0
            ? { width: Math.max(rect.width, 280), height: Math.max(rect.height, 240) }
            : null,
        );
      });
    };

    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [chartType]);

  return (
    <div ref={containerRef} key={chartType} className="chart-fade-in h-full min-h-[240px] w-full min-w-0">
      {containerSize ? (
        <div style={{ width: containerSize.width, height: containerSize.height }}>
          {chartType === 'forecast' ? (
            <ForecastChart
              regressionEntries={regressionEntries}
              width={containerSize.width}
              height={containerSize.height}
            />
          ) : chartType === 'trend' ? (
            <TrendLineChart
              entries={entries}
              folders={folders}
              metricLabel={metricLabel}
              isPercentage={isPercentage}
              width={containerSize.width}
              height={containerSize.height}
            />
          ) : chartType === 'bar' ? (
            <BarChart
              entries={entries}
              folders={folders}
              selectedFolder={selectedFolder}
              metricLabel={metricLabel}
              isPercentage={isPercentage}
              width={containerSize.width}
              height={containerSize.height}
            />
          ) : (
            <AreaChart
              entries={entries}
              folders={folders}
              metricLabel={metricLabel}
              isPercentage={isPercentage}
              width={containerSize.width}
              height={containerSize.height}
            />
          )}
        </div>
      ) : (
        <div className="flex h-full min-h-[240px] items-center justify-center text-xs font-medium text-gray-400">
          Loading chart...
        </div>
      )}
    </div>
  );
}
