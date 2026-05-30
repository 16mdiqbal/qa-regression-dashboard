export function R(n: number): number {
  return Math.round(n * 100) / 100;
}

export function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M${R(pts[0][0])},${R(pts[0][1])} L${R(pts[1][0])},${R(pts[1][1])}`;
  }
  let d = `M${R(pts[0][0])},${R(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.16;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C${R(c1x)},${R(c1y)} ${R(c2x)},${R(c2y)} ${R(p2[0])},${R(p2[1])}`;
  }
  return d;
}
