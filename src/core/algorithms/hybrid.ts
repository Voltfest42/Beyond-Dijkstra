import type { Graph, VertexId } from '../graph';
import { IndexedMinHeap } from '../heap';
import type { PseudocodeLine } from '../pseudocode';
import { assertVertex, type RunOptions, type SsspResult } from '../sssp';
import { bellmanFord } from './bellmanFord';

export const HYBRID_PSEUDOCODE: readonly PseudocodeLine[] = [
  { id: 'init', text: 'dist[s] ← 0, others ← ∞; queue ← {s}', indent: 0 },
  { id: 'round', text: 'repeat until the queue is empty:', indent: 0 },
  { id: 'pop', text: 'Dijkstra pass: pop vertices smallest-first', indent: 1 },
  { id: 'relax', text: 'relax their non-negative edges', indent: 2 },
  { id: 'neg', text: 'Bellman–Ford pass: for each vertex popped,', indent: 1 },
  { id: 'negrelax', text: 'relax its negative edges', indent: 2 },
  { id: 'requeue', text: 'improved vertices go back in the queue', indent: 1 },
  { id: 'done', text: 'done: every distance is final', indent: 0 },
];

export type HybridResult = SsspResult & { rounds: number };

/**
 * The Dijkstra / Bellman–Ford hybrid at the heart of the 2022 algorithm
 * (Bernstein, Nanongkai and Wulff-Nilsen call it ElimNeg).
 *
 * Each round runs a Dijkstra pass that ignores negative edges, then one
 * Bellman–Ford pass over the negative edges leaving every vertex that pass
 * popped. Improved vertices are queued for the next round. If every vertex
 * has a shortest path with at most η negative edges, it finishes within
 * η + 1 rounds (sometimes fewer: the in-place Bellman–Ford pass can chain
 * negative edges), so it is fast precisely when η is small.
 *
 * With a negative cycle the rounds would never end. Without one, η ≤ n − 1,
 * so starting round n + 1 proves a cycle, which Bellman–Ford then extracts.
 */
export function hybrid(g: Graph, source: VertexId, options: RunOptions = {}): HybridResult {
  assertVertex(g, source);
  const { emit, stats } = options;
  const { n, outStart, outEdges, edgeTo, edgeWeight } = g;

  const dist = new Float64Array(n).fill(Infinity);
  const predEdge = new Int32Array(n).fill(-1);
  const queue = new IndexedMinHeap(n, stats);
  const popped: VertexId[] = [];

  dist[source] = 0;
  queue.pushOrDecrease(source, 0);
  if (emit) {
    emit({ kind: 'line', id: 'init' });
    emit({ kind: 'source', v: source });
    emit({ kind: 'queue', op: 'push', v: source, key: 0 });
  }

  const relaxEdge = (u: VertexId, e: number, line: string) => {
    const v = edgeTo[e];
    const candidate = dist[u] + edgeWeight[e];
    if (stats) {
      stats.relaxations++;
      stats.comparisons++;
    }
    if (candidate < dist[v]) {
      dist[v] = candidate;
      predEdge[v] = e;
      const op = queue.pushOrDecrease(v, candidate);
      if (emit) {
        emit({ kind: 'line', id: line });
        emit({ kind: 'relax', edge: e, from: u, to: v, candidate, improved: true });
        if (op !== 'none') emit({ kind: 'queue', op, v, key: candidate });
      }
    } else if (emit) {
      emit({ kind: 'line', id: line });
      emit({ kind: 'relax', edge: e, from: u, to: v, candidate, improved: false });
    }
  };

  let rounds = 0;
  while (queue.size > 0) {
    if (rounds === n) {
      const proof = bellmanFord(g, source);
      if (proof.kind !== 'negative-cycle') throw new Error('Hybrid exceeded n rounds without a negative cycle');
      if (emit) {
        emit({ kind: 'negative-cycle', cycle: proof.cycle });
        emit({ kind: 'phase', label: `Still improving after ${n} rounds: there is a negative cycle` });
        emit({ kind: 'done' });
      }
      return { ...proof, rounds };
    }
    rounds++;
    if (emit) {
      emit({ kind: 'line', id: 'round' });
      emit({ kind: 'round', round: rounds });
      emit({ kind: 'phase', label: `Round ${rounds}, Dijkstra pass` });
    }

    // Dijkstra pass over the non-negative edges.
    popped.length = 0;
    while (queue.size > 0) {
      const u = queue.pop();
      popped.push(u);
      if (emit) {
        emit({ kind: 'line', id: 'pop' });
        emit({ kind: 'queue', op: 'pop', v: u, key: dist[u] });
      }
      for (let i = outStart[u]; i < outStart[u + 1]; i++) {
        const e = outEdges[i];
        if (edgeWeight[e] >= 0) relaxEdge(u, e, 'relax');
      }
    }

    // One Bellman–Ford pass over the negative edges out of everything just popped.
    let announced = false;
    for (const u of popped) {
      for (let i = outStart[u]; i < outStart[u + 1]; i++) {
        const e = outEdges[i];
        if (edgeWeight[e] >= 0) continue;
        if (emit && !announced) {
          emit({ kind: 'line', id: 'neg' });
          emit({ kind: 'phase', label: `Round ${rounds}, Bellman–Ford pass over negative edges` });
          announced = true;
        }
        relaxEdge(u, e, 'negrelax');
      }
    }
  }

  if (emit) {
    emit({ kind: 'line', id: 'done' });
    emit({ kind: 'done' });
  }
  return { kind: 'paths', source, dist, predEdge, rounds };
}
