import type { Graph, VertexId } from '../graph';
import { IndexedMinHeap } from '../heap';
import type { PseudocodeLine } from '../pseudocode';
import { assertVertex, type RunOptions, type ShortestPaths } from '../sssp';

export const DIJKSTRA_PSEUDOCODE: readonly PseudocodeLine[] = [
  { id: 'init', text: 'dist[s] ← 0, others ← ∞; queue ← {s}', indent: 0 },
  { id: 'loop', text: 'while the queue is not empty:', indent: 0 },
  { id: 'pop', text: 'u ← queued vertex with smallest dist', indent: 1 },
  { id: 'settle', text: 'settle u: dist[u] is now final', indent: 1 },
  { id: 'scan', text: 'for each edge u → v, weight w:', indent: 1 },
  { id: 'skip', text: 'if v is settled: skip it', indent: 2 },
  { id: 'relax', text: 'if dist[u] + w < dist[v]:', indent: 2 },
  { id: 'update', text: 'dist[v] ← dist[u] + w; queue v', indent: 3 },
  { id: 'done', text: 'done: all reachable vertices settled', indent: 0 },
];

/**
 * Textbook Dijkstra with a binary heap: O((n + m) log n).
 *
 * Deliberately the classic "settled set" version: once a vertex is settled it
 * is never updated again. That is exactly what makes it fail on negative edges,
 * which the negative-edges chapter demonstrates with this same function.
 */
export function dijkstra(g: Graph, source: VertexId, options: RunOptions = {}): ShortestPaths {
  assertVertex(g, source);
  const { emit, stats } = options;
  const { n, outStart, outEdges, edgeTo, edgeWeight } = g;

  const dist = new Float64Array(n).fill(Infinity);
  const predEdge = new Int32Array(n).fill(-1);
  const settled = new Uint8Array(n);
  const queue = new IndexedMinHeap(n, stats);

  dist[source] = 0;
  queue.pushOrDecrease(source, 0);
  if (emit) {
    emit({ kind: 'line', id: 'init' });
    emit({ kind: 'source', v: source });
    emit({ kind: 'queue', op: 'push', v: source, key: 0 });
  }

  while (queue.size > 0) {
    const u = queue.pop();
    settled[u] = 1;
    const du = dist[u];
    if (emit) {
      emit({ kind: 'line', id: 'pop' });
      emit({ kind: 'queue', op: 'pop', v: u, key: du });
      emit({ kind: 'line', id: 'settle' });
      emit({ kind: 'settle', v: u });
    }

    for (let i = outStart[u]; i < outStart[u + 1]; i++) {
      const e = outEdges[i];
      const v = edgeTo[e];
      const candidate = du + edgeWeight[e];
      if (stats) stats.relaxations++;

      if (settled[v]) {
        if (emit) {
          emit({ kind: 'line', id: 'skip' });
          emit({ kind: 'relax', edge: e, from: u, to: v, candidate, improved: false, targetSettled: true });
        }
        continue;
      }

      if (stats) stats.comparisons++;
      if (candidate < dist[v]) {
        dist[v] = candidate;
        predEdge[v] = e;
        const op = queue.pushOrDecrease(v, candidate);
        if (emit) {
          emit({ kind: 'line', id: 'update' });
          emit({ kind: 'relax', edge: e, from: u, to: v, candidate, improved: true });
          if (op !== 'none') emit({ kind: 'queue', op, v, key: candidate });
        }
      } else if (emit) {
        emit({ kind: 'line', id: 'relax' });
        emit({ kind: 'relax', edge: e, from: u, to: v, candidate, improved: false });
      }
    }
  }

  if (emit) {
    emit({ kind: 'line', id: 'done' });
    emit({ kind: 'done' });
  }
  return { kind: 'paths', source, dist, predEdge };
}
