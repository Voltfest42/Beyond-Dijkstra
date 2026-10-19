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

export type Clock = () => number;
const browserClock: Clock = () => performance.now();

/**
 * The smallest step the clock can show. Browsers deliberately coarsen
 * performance.now() (Chrome to about 0.1 ms, Firefox and Safari to 1 ms,
 * privacy modes to as much as 100 ms), so a fast run can read as 0 ms.
 */
export function timerResolution(now: Clock = browserClock): number {
  let smallest = Infinity;
  const deadline = now() + 1000;
  for (let i = 0; i < 5; i++) {
    const a = now();
    let b = now();
    while (b === a) b = now(); // wait for the next tick
    smallest = Math.min(smallest, b - a);
    if (b > deadline) break;
  }
  return smallest;
}

/**
 * Average time per run. Repeats `run` until the clock has measured at least
 * `minMs`, so the clock's rounding is a small fraction of what is measured.
 */
export function timePerRun(run: () => void, minMs: number, now: Clock = browserClock): number {
  let runs = 0;
  const start = now();
  let elapsed: number;
  do {
    run();
    runs++;
    elapsed = now() - start;
  } while (elapsed < minMs);
  return elapsed / runs;
}

export interface RaceOptions {
  seed?: number;
  now?: Clock;
  /** The clock's resolution in ms (measure it once with timerResolution). */
  resolution?: number;
}

/**
 * A random sparse directed graph (3 edges per vertex, real weights) like the
 * ones in the published benchmarks. Each time is the best of 3 measurements
 * (filtering out garbage-collection pauses and other noise), and each
 * measurement repeats the run until it lasts at least 20 clock ticks (and at
 * least 30 ms), so the clock's rounding stays under about 5%.
 */
export function raceOnce(n: number, { seed = 1, now = browserClock, resolution = 0.001 }: RaceOptions = {}): RaceResult {
  const g = randomGraph({ n, m: 3 * n, minWeight: 0, maxWeight: 100, integer: false, seed, reachableFrom: 0 });
  const minMs = Math.max(30, 20 * resolution);
  // With a very coarse clock each measurement already takes long; one is enough.
  const measurements = resolution > 5 ? 1 : 3;

  let dijkstraMs = Infinity;
  let bmsspMs = Infinity;
  for (let i = 0; i < measurements; i++) {
    dijkstraMs = Math.min(dijkstraMs, timePerRun(() => dijkstra(g, 0), minMs, now));
    bmsspMs = Math.min(bmsspMs, timePerRun(() => bmssp(g, 0), minMs, now));
  }

  // Correctness and operation counts, measured outside the timed runs.
  const dStats = newStats();
  const bStats = newStats();
  const d = dijkstra(g, 0, { stats: dStats });
  const b = bmssp(g, 0, { stats: bStats });
  let agree = true;
  for (let v = 0; v < n; v++) if (d.dist[v] !== b.dist[v]) agree = false;

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
export type RaceMessage =
  | { kind: 'timer'; resolutionMs: number }
  | { kind: 'result'; result: RaceResult }
  | { kind: 'done' }
  | { kind: 'error'; message: string };
