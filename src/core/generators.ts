import { createGraph, type EdgeSpec, type Graph } from './graph';

/** Small, fast, seedable PRNG (mulberry32). Same seed → same graph, on every machine. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RandomGraphOptions {
  n: number;
  /** Total number of edges (including the spanning edges when `reachableFrom` is set). */
  m: number;
  minWeight?: number;
  maxWeight?: number;
  /** Integer weights (default) or real weights. */
  integer?: boolean;
  seed?: number;
  /** When set, a random tree of edges out of this vertex guarantees everything is reachable. */
  reachableFrom?: number;
}

/** A random sparse directed graph. Parallel edges and self-loops are avoided. */
export function randomGraph(options: RandomGraphOptions): Graph {
  const { n, m, minWeight = 1, maxWeight = 10, integer = true, seed = 1, reachableFrom } = options;
  const random = seededRandom(seed);
  const weight = () =>
    integer
      ? minWeight + Math.floor(random() * (maxWeight - minWeight + 1))
      : minWeight + random() * (maxWeight - minWeight);

  const maxEdges = n * (n - 1);
  const target = Math.min(m, maxEdges);
  const edges: EdgeSpec[] = [];
  const seen = new Set<number>();
  const add = (from: number, to: number) => {
    const key = from * n + to;
    if (from === to || seen.has(key)) return false;
    seen.add(key);
    edges.push({ from, to, weight: weight() });
    return true;
  };

  if (reachableFrom !== undefined && n > 1) {
    // Random spanning arborescence: attach each vertex (in random order) to an earlier one.
    const order = shuffle([...Array(n).keys()].filter((v) => v !== reachableFrom), random);
    const attached = [reachableFrom];
    for (const v of order) {
      add(attached[Math.floor(random() * attached.length)], v);
      attached.push(v);
    }
  }

  // Rejection sampling is fine for sparse graphs; fall back to a scan for dense requests.
  let attempts = 0;
  while (edges.length < target && attempts < target * 20) {
    attempts++;
    add(Math.floor(random() * n), Math.floor(random() * n));
  }
  for (let from = 0; from < n && edges.length < target; from++) {
    for (let to = 0; to < n && edges.length < target; to++) add(from, to);
  }

  return createGraph(n, edges);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
