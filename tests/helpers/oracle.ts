import type { EdgeSpec } from '../../src/core/graph';

/**
 * Ground truth via Floyd–Warshall: a completely independent algorithm, so a
 * shared bug between Dijkstra and Bellman–Ford can't hide.
 */
export function referenceShortestPaths(
  n: number,
  edges: readonly EdgeSpec[],
  source: number,
): { negativeCycleReachable: true } | { negativeCycleReachable: false; dist: number[] } {
  const d = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : Infinity)));
  for (const { from, to, weight } of edges) d[from][to] = Math.min(d[from][to], weight);
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      if (d[i][k] === Infinity) continue;
      for (let j = 0; j < n; j++) {
        if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
      }
    }
  }
  for (let v = 0; v < n; v++) {
    if (d[source][v] < Infinity && d[v][v] < 0) return { negativeCycleReachable: true };
  }
  return { negativeCycleReachable: false, dist: d[source] };
}
