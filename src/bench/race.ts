import { bmssp } from '../core/algorithms/bmssp';
import { dijkstra } from '../core/algorithms/dijkstra';
import { randomGraph } from '../core/generators';
import { newStats } from '../core/sssp';

/** One race at one graph size: Dijkstra against the 2025 algorithm on the same graph. */
export interface RaceResult {
  n: number;
  m: number;
  dijkstraMs: number;
  bmsspMs: number;
  dijkstraComparisons: number;
  bmsspComparisons: number;
  /** Both found exactly the same distances. */
  agree: boolean;
}

/**
 * A random sparse directed graph (3 edges per vertex, real weights) like the
 * ones in the published benchmarks. Times are the best of `repeats` runs, which
 * filters out garbage-collection pauses and other noise.
 */
export function raceOnce(n: number, seed = 1, repeats = 3): RaceResult {
  const g = randomGraph({ n, m: 3 * n, minWeight: 0, maxWeight: 100, integer: false, seed, reachableFrom: 0 });
  let dijkstraMs = Infinity;
  let bmsspMs = Infinity;
  const dStats = newStats();
  const bStats = newStats();
  let agree = true;

  for (let r = 0; r < repeats; r++) {
    let t = performance.now();
    const d = dijkstra(g, 0);
    dijkstraMs = Math.min(dijkstraMs, performance.now() - t);

    t = performance.now();
    const b = bmssp(g, 0);
    bmsspMs = Math.min(bmsspMs, performance.now() - t);

    if (r === 0) {
      for (let v = 0; v < n; v++) if (d.dist[v] !== b.dist[v]) agree = false;
    }
  }
  // Operation counts, measured once outside the timed runs.
  dijkstra(g, 0, { stats: dStats });
  bmssp(g, 0, { stats: bStats });

  return {
    n,
    m: g.m,
    dijkstraMs,
    bmsspMs,
    dijkstraComparisons: dStats.comparisons,
    bmsspComparisons: bStats.comparisons,
    agree,
  };
}

export const RACE_SIZES = [1_000, 3_000, 10_000, 30_000, 100_000, 300_000] as const;

/** Messages between the race page and its worker. */
export type RaceRequest = { sizes: readonly number[] };
export type RaceMessage = { kind: 'result'; result: RaceResult } | { kind: 'done' } | { kind: 'error'; message: string };
