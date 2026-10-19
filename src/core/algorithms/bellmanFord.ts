import type { EdgeId, Graph, VertexId } from '../graph';
import type { PseudocodeLine } from '../pseudocode';
import { assertVertex, type RunOptions, type SsspResult } from '../sssp';

export const BELLMAN_FORD_PSEUDOCODE: readonly PseudocodeLine[] = [
  { id: 'init', text: 'dist[s] ← 0, every other dist ← ∞', indent: 0 },
  { id: 'round', text: 'repeat n − 1 rounds:', indent: 0 },
  { id: 'relax', text: 'for each edge u → v with weight w: if dist[u] + w < dist[v]:', indent: 1 },
  { id: 'update', text: 'dist[v] ← dist[u] + w', indent: 2 },
  { id: 'early', text: 'if nothing changed this round: stop early, all distances are final', indent: 1 },
  { id: 'check', text: 'one extra round: if any edge can still improve a distance:', indent: 0 },
  { id: 'cycle', text: 'there is a negative cycle, so report it', indent: 1 },
  { id: 'done', text: 'done', indent: 0 },
];

/**
 * Bellman–Ford: relax every edge, round after round. After round i, every
 * vertex whose shortest path has at most i edges is correct, so n − 1 rounds
 * suffice, and an improvement in round n proves a negative cycle. O(nm).
 *
 * Only cycles reachable from the source are detected; unreachable parts of
 * the graph cannot affect the source's distances.
 */
export function bellmanFord(g: Graph, source: VertexId, options: RunOptions = {}): SsspResult {
  assertVertex(g, source);
  const { emit, stats } = options;
  const { n, m, edgeFrom, edgeTo, edgeWeight } = g;

  const dist = new Float64Array(n).fill(Infinity);
  const predEdge = new Int32Array(n).fill(-1);
  dist[source] = 0;
  if (emit) {
    emit({ kind: 'line', id: 'init' });
    emit({ kind: 'source', v: source });
  }

  for (let round = 1; round <= n; round++) {
    const checking = round === n;
    if (emit) {
      emit({ kind: 'line', id: checking ? 'check' : 'round' });
      emit({ kind: 'round', round });
      emit({
        kind: 'phase',
        label: checking ? 'Final check: can any edge still improve a distance?' : `Round ${round} of ${n - 1}`,
      });
    }

    let changed = false;
    for (let e = 0; e < m; e++) {
      if (stats) stats.relaxations++;
      const u = edgeFrom[e];
      if (dist[u] === Infinity) continue; // nothing to propagate yet
      const v = edgeTo[e];
      const candidate = dist[u] + edgeWeight[e];
      if (stats) stats.comparisons++;

      if (candidate < dist[v]) {
        dist[v] = candidate;
        predEdge[v] = e;
        changed = true;
        if (emit) {
          emit({ kind: 'line', id: checking ? 'cycle' : 'update' });
          emit({ kind: 'relax', edge: e, from: u, to: v, candidate, improved: true });
        }
        if (checking) {
          const cycle = extractCycle(g, predEdge, v);
          if (emit) {
            emit({ kind: 'negative-cycle', cycle });
            emit({ kind: 'phase', label: 'Negative cycle found: shortest paths are undefined' });
            emit({ kind: 'done' });
          }
          return { kind: 'negative-cycle', source, cycle };
        }
      } else if (emit) {
        emit({ kind: 'line', id: 'relax' });
        emit({ kind: 'relax', edge: e, from: u, to: v, candidate, improved: false });
      }
    }

    if (!changed) {
      if (emit && !checking) emit({ kind: 'line', id: 'early' });
      if (emit) {
        emit({ kind: 'phase', label: checking ? 'Nothing improved: no negative cycle' : 'Nothing changed: done early' });
      }
      break;
    }
  }

  if (emit) {
    emit({ kind: 'line', id: 'done' });
    emit({ kind: 'done' });
  }
  return { kind: 'paths', source, dist, predEdge };
}

/**
 * After an improvement in round n, walking n predecessor edges back from the
 * improved vertex is guaranteed to land on a cycle of the predecessor graph,
 * and that cycle has negative weight. Returns its edges in walking order.
 */
function extractCycle(g: Graph, predEdge: Int32Array, start: VertexId): EdgeId[] {
  let x = start;
  for (let i = 0; i < g.n; i++) x = stepBack(g, predEdge, x);

  const cycle: EdgeId[] = [];
  let v = x;
  do {
    cycle.push(predEdge[v]);
    v = stepBack(g, predEdge, v);
  } while (v !== x);
  return cycle.reverse();
}

function stepBack(g: Graph, predEdge: Int32Array, v: VertexId): VertexId {
  const e = predEdge[v];
  if (e < 0) throw new Error(`Predecessor chain ended at vertex ${v} while looking for a negative cycle`);
  return g.edgeFrom[e];
}
