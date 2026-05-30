import { smoothPath } from '../../utils/svgPath';

interface SparkSeries {
  values: number[];
  color: string;
}

interface MultiSparkProps {
  readonly series: SparkSeries[];
  readonly w?: number;
  readonly h?: number;
}

export function MultiSpark({ series, w = 400, h = 180 }: MultiSparkProps) {
  const valid = series.filter((s) => s.values.length >= 2);
  if (!valid.length) return null;

  const allValues = valid.flatMap((s) => s.values);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const toPoints = (values: number[]): [number, number][] =>
    values.map((v, i) => [
      (i / (values.length - 1)) * w,
      h - 4 - ((v - min) / range) * (h - 8),
    ]);

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      {valid.map(({ values, color }, i) => {
        const pts = toPoints(values);
        const line = smoothPath(pts);
        const last = pts[pts.length - 1];
        return (
          <g key={i}>
            <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
            <circle cx={last[0]} cy={last[1]} r={2.6} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}
