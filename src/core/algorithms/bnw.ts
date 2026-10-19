/**
 * Bernstein, Nanongkai and Wulff-Nilsen (FOCS 2022): negative-weight single
 * source shortest paths in near-linear time, as an educational implementation.
 *
 * Structure, following the paper:
 *
 *   bnw (SPmain)          scale weights by 2n, then halve the allowed negativity
 *                         B → B/2 → … → 1 with one ScaleDown call per round,
 *                         finish with Dijkstra.
 *   scaleDown(G, Δ, B)    returns heights φ with every edge of G^B non-negative,
 *                         where G^B adds B to each negative edge (so in G itself
 *                         every edge ends up ≥ −B). Four phases:
 *     0. low-diameter decomposition of G^B with negatives treated as 0
 *     1. recurse inside the clusters (with Δ/2)
 *     2. fix the edges between clusters, which form a DAG
 *     3. fix the remaining (cut) edges with the Dijkstra/Bellman–Ford hybrid
 *
 * Simplifications, all documented in the site's "What's simplified" notes:
 *   - The decomposition carves balls of random (geometric) radius around random
 *     centres in a random direction. The paper first classifies vertices as
 *     in-light/out-light and recurses inside balls to guarantee tightness in both
 *     directions. Correctness never depends on the decomposition (Phase 3 is
 *     exact); only the running-time guarantee does.
 *   - Negative cycles are found by the hybrid's round limit rather than the
 *     paper's Las Vegas wrapper.
 */
import { stronglyConnectedComponents } from '../analysis';
import { createGraph, type EdgeId, type EdgeSpec, type Graph, type VertexId } from '../graph';
import { IndexedMinHeap } from '../heap';
import { seededRandom } from '../generators';
import { assertVertex, type SsspResult } from '../sssp';
import { dijkstra } from './dijkstra';
import { hybrid } from './hybrid';

/* ------------------------------------------------------------------ */
/* Low-diameter decomposition                                          */
/* ------------------------------------------------------------------ */

export interface Ball {
  center: VertexId;
  direction: 'out' | 'in';
  radius: number;
  vertices: VertexId[];
}

export interface Decomposition {
  /** Edges removed so that every strongly connected piece lies inside one ball. */
  cut: Set<EdgeId>;
  balls: Ball[];
}

/**
 * Carves the graph into balls of random radius. Repeatedly: pick a random
 * remaining vertex and a random direction, draw a radius from a geometric
 * distribution (mean about D / (rate · ln n)), take every remaining vertex
 * within that distance, and cut the edges leaving the ball in that direction.
 * A short edge is rarely cut, because a random radius rarely ends inside it.
 *
 * `weights` must be non-negative.
 */
export function lowDiameterDecomposition(
  g: Graph,
  weights: ArrayLike<number>,
  diameter: number,
  random: () => number,
  rate = 1,
): Decomposition {
  const { n } = g;
  const remaining = new Uint8Array(n).fill(1);
  const inBall = new Uint8Array(n);
  const cut = new Set<EdgeId>();
  const balls: Ball[] = [];
  const p = Math.min(1, (rate * Math.log(n + 1)) / Math.max(diameter, 1e-9));
  let left = n;

  while (left > 0) {
    const candidates: VertexId[] = [];
    for (let v = 0; v < n; v++) if (remaining[v]) candidates.push(v);
    const center = candidates[Math.floor(random() * candidates.length)];
    const direction = random() < 0.5 ? 'out' : 'in';
    const radius = geometric(p, random);
    const vertices = boundedSearch(g, weights, center, direction, radius, remaining);

    for (const v of vertices) inBall[v] = 1;
    for (const v of vertices) {
      // Cut the edges leaving the ball (out-balls) or entering it (in-balls), within the remaining graph.
      if (direction === 'out') {
        for (let i = g.outStart[v]; i < g.outStart[v + 1]; i++) {
          const e = g.outEdges[i];
          const w = g.edgeTo[e];
          if (remaining[w] && !inBall[w]) cut.add(e);
        }
      } else {
        for (let i = g.inStart[v]; i < g.inStart[v + 1]; i++) {
          const e = g.inEdges[i];
          const w = g.edgeFrom[e];
          if (remaining[w] && !inBall[w]) cut.add(e);
        }
      }
    }
    for (const v of vertices) {
      remaining[v] = 0;
      inBall[v] = 0;
      left--;
    }
    balls.push({ center, direction, radius, vertices });
  }
  return { cut, balls };
}

/** Number of failures before the first success, each trial succeeding with probability p. */
function geometric(p: number, random: () => number): number {
  if (p >= 1) return 0;
  return Math.floor(Math.log(1 - random()) / Math.log(1 - p));
}

/** Remaining vertices within `radius` of `center`, following edges forwards ('out') or backwards ('in'). */
function boundedSearch(
  g: Graph,
  weights: ArrayLike<number>,
  center: VertexId,
  direction: 'out' | 'in',
  radius: number,
  remaining: Uint8Array,
): VertexId[] {
  const dist = new Map<VertexId, number>([[center, 0]]);
  const done = new Set<VertexId>();
  const heap = new IndexedMinHeap(g.n);
  heap.pushOrDecrease(center, 0);
  const found: VertexId[] = [];
  while (heap.size > 0) {
    const u = heap.pop();
    const du = dist.get(u)!;
    if (du > radius) break;
    done.add(u);
    found.push(u);
    const start = direction === 'out' ? g.outStart : g.inStart;
    const list = direction === 'out' ? g.outEdges : g.inEdges;
    for (let i = start[u]; i < start[u + 1]; i++) {
      const e = list[i];
      const w = direction === 'out' ? g.edgeTo[e] : g.edgeFrom[e];
      if (!remaining[w] || done.has(w)) continue;
      const d = du + weights[e];
      if (d < (dist.get(w) ?? Infinity)) {
        dist.set(w, d);
        heap.pushOrDecrease(w, d);
      }
    }
  }
  return found;
}

/* ------------------------------------------------------------------ */
/* ScaleDown                                                           */
/* ------------------------------------------------------------------ */

export interface BnwStats {
  scaleDownCalls: number;
  maxDepth: number;
  /** Rounds of the hybrid summed over every Phase 3. */
  hybridRounds: number;
  cutEdges: number;
}

export interface BnwContext {
  random: () => number;
  stats: BnwStats;
  /** Ball-radius rate for the decomposition (see lowDiameterDecomposition). */
  lddRate: number;
}

/** A graph being worked on, with each edge's id in the original input graph. */
export interface WorkGraph {
  g: Graph;
  orig: Int32Array;
}

export interface ScaleDownParams {
  /** Upper bound on η (negative edges per shortest path) in G^B. */
  delta: number;
  /** Allowed negativity: every input edge is ≥ −2B, every output edge ≥ −B. */
  B: number;
  /** Override the decomposition diameter (default (Δ/2)·B). Halved at each recursion level. */
  diameter?: number;
  depth: number;
}

export type ScaleDownResult =
  | { kind: 'heights'; phi: Float64Array }
  | { kind: 'negative-cycle'; cycle: EdgeId[] };

/** What happened in each phase of one ScaleDown call, for the walkthrough figure. */
export interface ScaleDownReport {
  clusters?: VertexId[][];
  cut?: EdgeId[];
  balls?: Ball[];
  /** Heights after phases 1, 2 and 3. */
  phi1?: Float64Array;
  phi2?: Float64Array;
  phi3?: Float64Array;
  /** Recursive calls and depth reached inside Phase 1. */
  innerCalls?: number;
  innerDepth?: number;
  /** Rounds the hybrid needed in Phase 3. */
  cleanupRounds?: number;
}

export function scaleDown(
  work: WorkGraph,
  params: ScaleDownParams,
  ctx: BnwContext,
  report?: ScaleDownReport,
): ScaleDownResult {
  const { g } = work;
  const { n, m, edgeFrom, edgeTo, edgeWeight } = g;
  const { delta, B, depth } = params;
  ctx.stats.scaleDownCalls++;
  ctx.stats.maxDepth = Math.max(ctx.stats.maxDepth, depth);

  // G^B: every negative edge made B less negative.
  const wB = new Float64Array(m);
  for (let e = 0; e < m; e++) wB[e] = edgeWeight[e] < 0 ? edgeWeight[e] + B : edgeWeight[e];

  let phi2 = new Float64Array(n);
  const diameter = params.diameter ?? (delta / 2) * B;

  if (delta > 2 && n > 1 && diameter >= 1) {
    // Phase 0: cluster, treating negative edges as 0.
    const nonNegative = wB.map((w) => Math.max(0, w));
    const { cut, balls } = lowDiameterDecomposition(g, nonNegative, diameter, ctx.random, ctx.lddRate);
    ctx.stats.cutEdges += cut.size;
    const clusters = stronglyConnectedComponents(g, (e) => !cut.has(e));
    if (report) Object.assign(report, { clusters, cut: [...cut].sort((a, b) => a - b), balls });

    // Phase 1: recurse inside the clusters (all of them at once, as one disconnected graph).
    const callsBefore = ctx.stats.scaleDownCalls;
    const { sub, toParent } = insideClusters(work, clusters);
    const inner = scaleDown(
      sub,
      {
        delta: delta / 2,
        B,
        diameter: params.diameter === undefined ? undefined : params.diameter / 2,
        depth: depth + 1,
      },
      ctx,
    );
    if (inner.kind === 'negative-cycle') return inner;
    const phi1 = new Float64Array(n);
    inner.phi.forEach((h, i) => (phi1[toParent[i]] = h));
    if (report) {
      report.phi1 = phi1;
      report.innerCalls = ctx.stats.scaleDownCalls - callsBefore;
      report.innerDepth = ctx.stats.maxDepth - depth;
    }

    // Phase 2: the uncut edges between clusters go forwards in topological order.
    const reweighted = new Float64Array(m);
    for (let e = 0; e < m; e++) reweighted[e] = wB[e] + phi1[edgeFrom[e]] - phi1[edgeTo[e]];
    const psi = fixDagEdges(g, reweighted, cut, clusters);
    phi2 = phi1.map((h, v) => h + psi[v]);
    if (report) report.phi2 = phi2;
  } else if (report) {
    report.clusters = [[...Array(n).keys()]];
    report.cut = [];
    report.balls = [];
    report.phi1 = new Float64Array(n);
    report.phi2 = new Float64Array(n);
  }

  // Phase 3: only cut edges can still be negative; the hybrid finishes the job.
  const cleanup = elimNeg(work, (e) => wB[e] + phi2[edgeFrom[e]] - phi2[edgeTo[e]], ctx);
  if (cleanup.kind === 'negative-cycle') return cleanup;
  const phi3 = phi2.map((h, v) => h + cleanup.dist[v]);
  if (report) {
    report.phi3 = phi3;
    report.cleanupRounds = cleanup.rounds;
  }
  return { kind: 'heights', phi: phi3 };
}

/** The union of the subgraphs induced by each cluster, renumbered, with its map back to G's vertices. */
function insideClusters(work: WorkGraph, clusters: VertexId[][]): { sub: WorkGraph; toParent: Int32Array } {
  const { g, orig } = work;
  const local = new Int32Array(g.n);
  const clusterOf = new Int32Array(g.n);
  const toParent = new Int32Array(g.n);
  let next = 0;
  clusters.forEach((cluster, c) => {
    for (const v of cluster) {
      local[v] = next;
      toParent[next] = v;
      clusterOf[v] = c;
      next++;
    }
  });
  const edges: EdgeSpec[] = [];
  const subOrig: number[] = [];
  for (let e = 0; e < g.m; e++) {
    const u = g.edgeFrom[e];
    const v = g.edgeTo[e];
    if (clusterOf[u] !== clusterOf[v]) continue;
    edges.push({ from: local[u], to: local[v], weight: g.edgeWeight[e] });
    subOrig.push(orig[e]);
  }
  return { sub: { g: createGraph(g.n, edges), orig: Int32Array.from(subOrig) }, toParent };
}

/**
 * Phase 2. Clusters are listed in topological order, and every uncut edge
 * between clusters goes forwards. Let M_j be the most negative such edge
 * entering cluster j (or 0), and give cluster j height M_1 + … + M_j. An edge
 * from cluster a to a later cluster b then gains −(M_{a+1} + … + M_b) ≥ −M_b,
 * which is enough to make it non-negative. Edges inside a cluster don't change.
 */
export function fixDagEdges(
  g: Graph,
  weights: ArrayLike<number>,
  cut: ReadonlySet<EdgeId>,
  clusters: readonly VertexId[][],
): Float64Array {
  const clusterOf = new Int32Array(g.n);
  clusters.forEach((cluster, c) => cluster.forEach((v) => (clusterOf[v] = c)));
  const most = new Float64Array(clusters.length);
  for (let e = 0; e < g.m; e++) {
    if (cut.has(e)) continue;
    const a = clusterOf[g.edgeFrom[e]];
    const b = clusterOf[g.edgeTo[e]];
    if (a === b) continue;
    if (a > b) throw new Error('Uncut edge goes backwards between clusters: not a DAG');
    most[b] = Math.min(most[b], weights[e]);
  }
  const heightOfCluster = new Float64Array(clusters.length);
  let total = 0;
  for (let c = 0; c < clusters.length; c++) {
    total += most[c];
    heightOfCluster[c] = total;
  }
  return Float64Array.from({ length: g.n }, (_, v) => heightOfCluster[clusterOf[v]]);
}

/**
 * Phase 3 (ElimNeg): distances from a virtual source with a 0-weight edge to
 * every vertex, computed by the hybrid. Distances make every edge non-negative.
 */
function elimNeg(
  work: WorkGraph,
  weight: (e: EdgeId) => number,
  ctx: BnwContext,
): { kind: 'dist'; dist: Float64Array; rounds: number } | { kind: 'negative-cycle'; cycle: EdgeId[] } {
  const { g, orig } = work;
  const virtual = g.n;
  const edges: EdgeSpec[] = [];
  for (let e = 0; e < g.m; e++) edges.push({ from: g.edgeFrom[e], to: g.edgeTo[e], weight: weight(e) });
  for (let v = 0; v < g.n; v++) edges.push({ from: virtual, to: v, weight: 0 });
  const result = hybrid(createGraph(g.n + 1, edges), virtual);
  ctx.stats.hybridRounds += result.rounds;
  // Cycles can't use the virtual source's edges (nothing enters it), so ids < m map straight back.
  if (result.kind === 'negative-cycle') return { kind: 'negative-cycle', cycle: result.cycle.map((e) => orig[e]) };
  return { kind: 'dist', dist: result.dist.slice(0, g.n), rounds: result.rounds };
}

/* ------------------------------------------------------------------ */
/* The full algorithm (SPmain)                                         */
/* ------------------------------------------------------------------ */

export interface ScalingRound {
  /** After this round every (scaled, reweighted) edge is ≥ −bound. */
  bound: number;
  /** The most negative edge actually left after this round. */
  minEdge: number;
}

export interface BnwInfo extends BnwStats {
  /** Weights are multiplied by this (2n) before scaling. */
  scaleFactor: number;
  scalingRounds: ScalingRound[];
}

export type BnwResult = SsspResult & { info: BnwInfo };

export interface BnwOptions {
  seed?: number;
  lddRate?: number;
}

/**
 * Integer weights only (the scaling argument needs them). Reports a negative
 * cycle anywhere in the graph, like Johnson's algorithm.
 */
export function bnw(g: Graph, source: VertexId, { seed = 1, lddRate = 1 }: BnwOptions = {}): BnwResult {
  assertVertex(g, source);
  const { n, m, edgeFrom, edgeTo, edgeWeight } = g;
  for (let e = 0; e < m; e++) {
    if (!Number.isInteger(edgeWeight[e])) throw new RangeError('bnw needs integer edge weights');
  }
  const stats: BnwStats = { scaleDownCalls: 0, maxDepth: 0, hybridRounds: 0, cutEdges: 0 };
  const ctx: BnwContext = { random: seededRandom(seed), stats, lddRate };
  const scaleFactor = 2 * n;
  const info: BnwInfo = { ...stats, scaleFactor, scalingRounds: [] };
  const finish = (result: SsspResult): BnwResult => ({ ...result, info: { ...info, ...stats } });

  let mostNegative = 0;
  for (let e = 0; e < m; e++) mostNegative = Math.min(mostNegative, edgeWeight[e]);
  if (mostNegative === 0) return finish(dijkstra(g, source));

  // Scale by 2n: afterwards, adding up to n − 1 to a path can't change which path is shortest.
  const scaled = Float64Array.from(edgeWeight, (w) => w * scaleFactor);
  let B = 1;
  while (B < -mostNegative * scaleFactor) B *= 2;

  const phi = new Float64Array(n);
  const current = new Float64Array(m);
  const reweight = () => {
    for (let e = 0; e < m; e++) current[e] = scaled[e] + phi[edgeFrom[e]] - phi[edgeTo[e]];
  };

  for (let bound = B / 2; bound >= 1; bound /= 2) {
    reweight();
    const work: WorkGraph = {
      g: createGraph(
        n,
        Array.from({ length: m }, (_, e) => ({ from: edgeFrom[e], to: edgeTo[e], weight: current[e] })),
      ),
      orig: Int32Array.from({ length: m }, (_, e) => e),
    };
    const result = scaleDown(work, { delta: n, B: bound, depth: 0 }, ctx);
    if (result.kind === 'negative-cycle') return finish({ kind: 'negative-cycle', source, cycle: result.cycle });
    for (let v = 0; v < n; v++) phi[v] += result.phi[v];
    reweight();
    info.scalingRounds.push({ bound, minEdge: Math.min(0, ...current) });
  }

  // Every edge is now ≥ −1 in scaled units; +1 makes them all non-negative.
  const finalGraph = createGraph(
    n,
    Array.from({ length: m }, (_, e) => ({ from: edgeFrom[e], to: edgeTo[e], weight: current[e] + 1 })),
  );
  const tree = dijkstra(finalGraph, source);

  // Shortest paths in the final graph are shortest in the original; measure them there.
  const dist = new Float64Array(n).fill(Infinity);
  dist[source] = 0;
  const known = new Uint8Array(n);
  known[source] = 1;
  for (let v = 0; v < n; v++) {
    if (tree.dist[v] === Infinity || known[v]) continue;
    const chain: VertexId[] = [];
    let x = v;
    while (!known[x]) {
      chain.push(x);
      x = edgeFrom[tree.predEdge[x]];
    }
    for (let i = chain.length - 1; i >= 0; i--) {
      const y = chain[i];
      const e = tree.predEdge[y];
      dist[y] = dist[edgeFrom[e]] + edgeWeight[e];
      known[y] = 1;
    }
  }
  return finish({ kind: 'paths', source, dist, predEdge: tree.predEdge });
}
