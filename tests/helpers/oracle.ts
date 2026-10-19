import type { EdgeSpec } from '../../src/core/graph';

/**
 * η: the largest, over reachable vertices v, of the fewest negative edges on
 * any shortest s → v path. Computed by Bellman–Ford on (distance, negative
 * edges) pairs compared lexicographically. Only meaningful without a
 * reachable negative cycle.
 */
export function maxNegativeEdgesOnShortestPaths(n: number, edges: readonly EdgeSpec[], source: number): number {
  const dist = new Array<number>(n).fill(Infinity);
  const neg = new Array<number>(n).fill(Infinity);
  dist[source] = 0;
  neg[source] = 0;
  for (let round = 0; round < n; round++) {
    for (const { from, to, weight } of edges) {
      if (dist[from] === Infinity) continue;
      const d = dist[from] + weight;
      const k = neg[from] + (weight < 0 ? 1 : 0);
      if (d < dist[to] || (d === dist[to] && k < neg[to])) {
        dist[to] = d;
        neg[to] = k;
      }
    }
  }
  return Math.max(0, ...neg.filter(Number.isFinite));
}

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
