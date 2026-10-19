import { createGraph, edgesOf, reweighted, type Graph, type VertexId } from '../graph';
import type { RunOptions, SsspResult } from '../sssp';
import { bellmanFord } from './bellmanFord';
import { dijkstra } from './dijkstra';

/**
 * Potentials (also called prices). Give every vertex a number φ(v) and
 * replace each edge weight with
 *
 *   w'(u → v) = w(u → v) + φ(u) − φ(v).
 *
 * Along any path from s to t the middle terms cancel, so every s → t path
 * changes by exactly φ(s) − φ(t): the shortest path stays the shortest.
 */
export function reweightedWeights(g: Graph, phi: ArrayLike<number>): Float64Array {
  const w = new Float64Array(g.m);
  for (let e = 0; e < g.m; e++) w[e] = g.edgeWeight[e] + phi[g.edgeFrom[e]] - phi[g.edgeTo[e]];
  return w;
}

/** Bellman–Ford from a virtual source joined to every vertex by a 0-weight edge. */
function fromVirtualSource(g: Graph): SsspResult {
  const virtual = g.n;
  const edges = [...edgesOf(g), ...Array.from({ length: g.n }, (_, v) => ({ from: virtual, to: v, weight: 0 }))];
  // The original edges keep their ids, so a reported cycle refers to edges of g.
  return bellmanFord(createGraph(g.n + 1, edges), virtual);
}

/**
 * Johnson's potential (1977): φ(v) = distance from the virtual source. Then
 * w' ≥ 0 on every edge, because dist(v) ≤ dist(u) + w(u → v). Returns null if
 * the graph has a negative cycle anywhere.
 *
 * The catch, and why the 2022 breakthrough matters: computing this potential
 * is itself a negative-weight shortest-path problem.
 */
export function johnsonPotential(g: Graph): Float64Array | null {
  const result = fromVirtualSource(g);
  return result.kind === 'paths' ? result.dist.slice(0, g.n) : null;
}

/** Johnson's algorithm for one source: a potential from Bellman–Ford, then Dijkstra on the reweighted graph. */
export function johnson(g: Graph, source: VertexId, options: RunOptions = {}): SsspResult {
  const virtual = fromVirtualSource(g);
  if (virtual.kind === 'negative-cycle') return { kind: 'negative-cycle', source, cycle: virtual.cycle };

  const phi = virtual.dist.slice(0, g.n);
  const w = reweightedWeights(g, phi);
  const inner = dijkstra(
    reweighted(g, (e) => w[e]),
    source,
    options,
  );
  const dist = inner.dist.map((d, v) => (d === Infinity ? Infinity : d - phi[source] + phi[v]));
  return { kind: 'paths', source, dist, predEdge: inner.predEdge };
}
