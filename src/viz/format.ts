/** Distances as people write them: ∞ for unreachable, integers without decimals, else 2 decimals. */
export function formatDist(d: number): string {
  if (d === Infinity) return '∞';
  if (d === -Infinity) return '−∞';
  const rounded = Number.isInteger(d) ? String(d) : d.toFixed(2).replace(/\.?0+$/, '');
  return rounded.replace('-', '−');
}

/** Edge weights with an explicit minus sign so negative edges stand out. */
export function formatWeight(w: number): string {
  return formatDist(w);
}

/** 1,284 → 1.3K; 2,500,000 → 2.5M. */
export function compactNumber(v: number): string {
  if (v >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${+(v / 1000).toFixed(1)}K`;
  return String(+v.toFixed(1));
}
