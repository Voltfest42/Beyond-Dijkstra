import type { EdgeId, Graph, VertexId } from './graph';
import type { Emit } from './trace';

/** Successful single-source shortest paths: a distance and a tree edge per vertex. */
export interface ShortestPaths {
  kind: 'paths';
  source: VertexId;
  /** dist[v] is Infinity when v is unreachable. */
  dist: Float64Array;
  /** The last edge on the chosen shortest path to v, or -1 (source / unreachable). */
  predEdge: Int32Array;
}

/** A negative cycle reachable from the source, given as edges in walking order. */
export interface NegativeCycle {
  kind: 'negative-cycle';
  source: VertexId;
  cycle: EdgeId[];
}

export type SsspResult = ShortestPaths | NegativeCycle;

/** Cheap operation counters, used by the counters panel and the race. */
export interface Stats {
  /** Edges examined for a possible improvement. */
  relaxations: number;
  /** Priority-queue insertions, extractions and decrease-keys. */
  queueOps: number;
  /** Comparisons between distance values (the currency of the comparison-addition model). */
  comparisons: number;
}

export function newStats(): Stats {
  return { relaxations: 0, queueOps: 0, comparisons: 0 };
}

export interface RunOptions {
  /** Receives trace events for visualization. Leave undefined to run at full speed. */
  emit?: Emit;
  /** Incremented in place when provided. */
  stats?: Stats;
}

export function assertVertex(g: Graph, v: VertexId): void {
  if (!Number.isInteger(v) || v < 0 || v >= g.n) throw new RangeError(`Vertex ${v} is not in the graph`);
}

/** Vertices on the shortest path from the source to `target`, or null if unreachable. */
export function pathTo(g: Graph, result: ShortestPaths, target: VertexId): VertexId[] | null {
  if (result.dist[target] === Infinity) return null;
  const path = [target];
  let v = target;
  for (let guard = 0; v !== result.source; guard++) {
    const e = result.predEdge[v];
    if (e < 0 || guard > g.n) throw new Error(`Broken predecessor chain at vertex ${v}`);
    v = g.edgeFrom[e];
    path.push(v);
  }
  return path.reverse();
}

export function cycleWeight(g: Graph, cycle: readonly EdgeId[]): number {
  let total = 0;
  for (const e of cycle) total += g.edgeWeight[e];
  return total;
}
