import { smoothPath } from '../../utils/svgPath';

interface MiniSparkProps {
  readonly values: number[];
  readonly color?: string;
  readonly w?: number;
  readonly h?: number;
  readonly light?: boolean;
}

export function MiniSpark({ values, color = '#6366f1', w = 96, h = 30, light = false }: MiniSparkProps) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts: [number, number][] = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - 3 - ((v - min) / range) * (h - 6),
  ]);
  const line = smoothPath(pts);
  const area = `${line} L${w},${h} L0,${h} Z`;
  const gradId = `sp-${color.replace('#', '')}-${light ? 'l' : 'd'}`;
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={light ? 0.45 : 0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.6} fill={color} />
    </svg>
  );
}
