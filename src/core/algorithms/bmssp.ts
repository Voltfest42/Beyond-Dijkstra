/**
 * Duan, Mao, Mao, Shu and Yin (STOC 2025): "Breaking the Sorting Barrier for
 * Directed Single-Source Shortest Paths", as an educational implementation.
 *
 * Directed graphs with non-negative real weights. Three procedures, as in the paper:
 *
 *   findPivots(B, S)   k rounds of Bellman–Ford from the frontier S. Vertices a few
 *                      hops away are finished without any sorting; only roots of
 *                      big shortest-path trees (≥ k vertices) remain: the pivots.
 *   baseCase(B, {x})   level 0: a tiny Dijkstra from x that stops after k + 1 vertices.
 *   bmssp(l, B, S)     "bounded multi-source shortest paths": shrink S to pivots,
 *                      put them in the partial-sorting structure D, then repeatedly
 *                      pull the next batch of smallest ones and solve it one level down.
 *
 * Ties: the paper assumes all path lengths are different and breaks ties by
 * (length, number of hops, vertices). Here a vertex's label is (distance, hops,
 * vertex id), which gives the same total order on vertices and keeps the
 * predecessor edges a forest.
 *
 * Simplifications (documented on the site): the block structure D splits blocks
 * by sorting instead of linear-time median selection, finds blocks by binary
 * search over a sorted array instead of a balanced tree, and deletes lazily.
 * The constant-degree transformation is not applied: it only matters for the
 * running-time proof, not for correctness.
 */
import type { EdgeId, Graph, VertexId } from '../graph';
import type { PseudocodeLine } from '../pseudocode';
import { assertVertex, type RunOptions, type ShortestPaths, type Stats } from '../sssp';
import type { Emit } from '../trace';

/* ------------------------------------------------------------------ */
/* Labels and parameters                                               */
/* ------------------------------------------------------------------ */

/** A path length with the paper's tie-breaking: distance, then hop count, then vertex id. */
export interface Label {
  readonly d: number;
  readonly h: number;
  readonly v: VertexId;
}

export const INFINITE: Label = { d: Infinity, h: 0, v: 0 };

export function labelLess(a: Label, b: Label): boolean {
  return a.d < b.d || (a.d === b.d && (a.h < b.h || (a.h === b.h && a.v < b.v)));
}

export interface BmsspParams {
  /** Bellman–Ford rounds in FindPivots; also the base case's size. Paper: ⌊log^(1/3) n⌋. */
  k: number;
  /** Each level down, batches get 2^t times smaller. Paper: ⌊log^(2/3) n⌋. */
  t: number;
}

/** The paper's parameters (log base 2). On screen-sized graphs these are 1 or 2. */
export function paperParams(n: number): BmsspParams {
  const L = Math.log2(Math.max(n, 2));
  return { k: Math.max(1, Math.floor(L ** (1 / 3))), t: Math.max(1, Math.floor(L ** (2 / 3))) };
}

/** Recursion depth of the top call: ⌈log₂ n / t⌉. */
export function topLevel(n: number, t: number): number {
  return Math.ceil(Math.log2(Math.max(n, 1)) / t);
}

export const BMSSP_PSEUDOCODE: readonly PseudocodeLine[] = [
  { id: 'call', text: 'BMSSP(level l, bound B, S):', indent: 0 },
  { id: 'base', text: 'l = 0: tiny Dijkstra', indent: 1 },
  { id: 'pivots', text: 'k Bellman–Ford rounds', indent: 1 },
  { id: 'pivots2', text: 'keep pivots (big trees)', indent: 1 },
  { id: 'pull', text: 'repeat: pull a batch', indent: 1 },
  { id: 'recurse', text: 'BMSSP(l − 1, …, batch)', indent: 2 },
  { id: 'relax', text: 'relax what it finished', indent: 2 },
  { id: 'return', text: 'return finished vertices', indent: 1 },
];

/* ------------------------------------------------------------------ */
/* The partial-sorting structure D (Lemma 3.3)                         */
/* ------------------------------------------------------------------ */

interface Entry {
  v: VertexId;
  label: Label;
}

/**
 * Holds (vertex, label) pairs, keeping the smallest label per vertex, and hands
 * them out in batches of M smallest. It never sorts everything: blocks are
 * ordered relative to each other, but each block's contents stay unsorted.
 *
 *   D0: blocks added in front by batchPrepend (values smaller than everything in D).
 *   D1: blocks added by insert, each with an upper bound; split when they exceed M.
 */
export class BlockList {
  private readonly best = new Map<VertexId, Label>();
  private d0: Entry[][] = [];
  private d1: { upper: Label; items: Entry[] }[];
  readonly M: number;
  readonly bound: Label;
  private readonly less: (a: Label, b: Label) => boolean;

  constructor(M: number, bound: Label, less: (a: Label, b: Label) => boolean = labelLess) {
    this.M = M;
    this.bound = bound;
    this.less = less;
    this.d1 = [{ upper: bound, items: [] }];
  }

  /** Number of distinct vertices waiting. */
  get size(): number {
    return this.best.size;
  }

  /** Number of blocks (for the figure's "partly sorted" view). */
  get blocks(): number {
    return this.d0.length + this.d1.filter((b) => b.items.length > 0).length;
  }

  private valid = (e: Entry) => this.best.get(e.v) === e.label;

  insert(v: VertexId, label: Label): void {
    const current = this.best.get(v);
    if (current && !this.less(label, current)) return;
    this.best.set(v, label); // any older entry for v is now stale
    // First block whose upper bound is ≥ label (binary search over the sorted upper bounds).
    let lo = 0;
    let hi = this.d1.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.less(this.d1[mid].upper, label)) lo = mid + 1;
      else hi = mid;
    }
    const block = this.d1[lo];
    block.items.push({ v, label });
    if (block.items.length > this.M) this.split(lo);
  }

  private split(index: number): void {
    const block = this.d1[index];
    const items = block.items.filter(this.valid);
    if (items.length <= this.M) {
      block.items = items;
      return;
    }
    items.sort((a, b) => (this.less(a.label, b.label) ? -1 : 1));
    const half = Math.ceil(items.length / 2);
    const first = items.slice(0, half);
    block.items = items.slice(half);
    this.d1.splice(index, 0, { upper: first[first.length - 1].label, items: first });
  }

  /** Adds pairs whose labels are all smaller than everything already in D. */
  batchPrepend(entries: readonly Entry[]): void {
    const fresh = new Map<VertexId, Label>();
    for (const { v, label } of entries) {
      const current = fresh.get(v) ?? this.best.get(v);
      if (current && !this.less(label, current)) continue;
      fresh.set(v, label);
    }
    if (fresh.size === 0) return;
    const items: Entry[] = [];
    for (const [v, label] of fresh) {
      this.best.set(v, label);
      items.push({ v, label });
    }
    if (items.length <= this.M) {
      this.d0.unshift(items);
      return;
    }
    items.sort((a, b) => (this.less(a.label, b.label) ? -1 : 1));
    const size = Math.max(1, Math.ceil(this.M / 2));
    const chunks: Entry[][] = [];
    for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
    this.d0 = [...chunks, ...this.d0];
  }

  /**
   * Removes and returns (up to) the M smallest vertices, with a bound that
   * separates them from everything left: every returned label < bound ≤ every
   * remaining label. If nothing is left, the bound is D's own bound B.
   */
  pull(): { sources: VertexId[]; bound: Label } {
    if (this.best.size <= this.M) {
      const all = [...this.best].sort((a, b) => (this.less(a[1], b[1]) ? -1 : 1)).map(([v]) => v);
      this.best.clear();
      this.d0 = [];
      this.d1 = [{ upper: this.bound, items: [] }];
      return { sources: all, bound: this.bound };
    }

    // Collect a prefix of blocks from each side holding at least M live entries.
    const collected: Entry[] = [];
    let used0 = 0;
    for (let count = 0; used0 < this.d0.length && count < this.M; used0++) {
      this.d0[used0] = this.d0[used0].filter(this.valid);
      collected.push(...this.d0[used0]);
      count += this.d0[used0].length;
    }
    let used1 = 0;
    for (let count = 0; used1 < this.d1.length && count < this.M; used1++) {
      this.d1[used1].items = this.d1[used1].items.filter(this.valid);
      collected.push(...this.d1[used1].items);
      count += this.d1[used1].items.length;
    }

    collected.sort((a, b) => (this.less(a.label, b.label) ? -1 : 1));
    const taken = collected.slice(0, this.M);
    for (const e of taken) this.best.delete(e.v);

    // The separating bound: the smallest label still in D, which is either a
    // collected leftover or the minimum of the first untouched block on either side.
    let bound: Label = collected.length > this.M ? collected[this.M].label : this.bound;
    const firstLive = (items: Entry[]) => {
      let min: Label | null = null;
      for (const e of items) if (this.valid(e) && (!min || this.less(e.label, min))) min = e.label;
      return min;
    };
    for (let i = used0; i < this.d0.length; i++) {
      const min = firstLive(this.d0[i]);
      if (min) {
        if (this.less(min, bound)) bound = min;
        break;
      }
    }
    for (let i = used1; i < this.d1.length; i++) {
      const min = firstLive(this.d1[i].items);
      if (min) {
        if (this.less(min, bound)) bound = min;
        break;
      }
    }

    // Drop the taken entries from the touched blocks, and empty blocks (D1 keeps its last block).
    for (let i = 0; i < used0; i++) this.d0[i] = this.d0[i].filter(this.valid);
    this.d0 = this.d0.filter((b) => b.length > 0);
    for (let i = 0; i < used1; i++) this.d1[i].items = this.d1[i].items.filter(this.valid);
    this.d1 = this.d1.filter((b, i) => b.items.length > 0 || i === this.d1.length - 1);

    return { sources: taken.map((e) => e.v), bound };
  }
}

/* ------------------------------------------------------------------ */
/* The algorithm                                                       */
/* ------------------------------------------------------------------ */

interface CallResult {
  /** Every vertex with label < newBound that the call is responsible for is complete. */
  newBound: Label;
  completed: VertexId[];
}

/** Tiny binary heap of labels with lazy deletion, for the base case. */
class LabelHeap {
  private readonly items: Label[] = [];
  private readonly less: (a: Label, b: Label) => boolean;
  constructor(less: (a: Label, b: Label) => boolean) {
    this.less = less;
  }
  get size() {
    return this.items.length;
  }
  push(label: Label) {
    const a = this.items;
    a.push(label);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): Label {
    const a = this.items;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

/** Shared state of one run: the current labels and predecessor edges. */
export class BmsspRun {
  readonly dist: Float64Array;
  readonly hops: Int32Array;
  readonly predEdge: Int32Array;
  readonly k: number;
  readonly t: number;
  private readonly emit?: Emit;
  private readonly stats?: Stats;
  readonly g: Graph;

  constructor(g: Graph, params: BmsspParams, options: RunOptions = {}) {
    this.g = g;
    if (!Number.isInteger(params.k) || params.k < 1 || !Number.isInteger(params.t) || params.t < 1) {
      throw new RangeError('k and t must be positive integers');
    }
    for (let e = 0; e < g.m; e++) {
      if (g.edgeWeight[e] < 0) throw new RangeError('BMSSP needs non-negative edge weights');
    }
    this.k = params.k;
    this.t = params.t;
    this.emit = options.emit;
    this.stats = options.stats;
    this.dist = new Float64Array(g.n).fill(Infinity);
    this.hops = new Int32Array(g.n);
    this.predEdge = new Int32Array(g.n).fill(-1);
  }

  less = (a: Label, b: Label): boolean => {
    if (this.stats) this.stats.comparisons++;
    return labelLess(a, b);
  };

  label(v: VertexId): Label {
    return { d: this.dist[v], h: this.hops[v], v };
  }

  /** Makes v a source at distance d (the run's start, or a demo's starting frontier). */
  setSource(v: VertexId, d = 0): void {
    this.dist[v] = d;
    this.hops[v] = 0;
    this.predEdge[v] = -1;
    this.emit?.({ kind: 'source', v });
  }

  /** The label edge e would give its head, and whether it is at least as good as the current one. */
  private candidate(u: VertexId, e: EdgeId): { label: Label; ok: boolean } {
    const v = this.g.edgeTo[e];
    const label = { d: this.dist[u] + this.g.edgeWeight[e], h: this.hops[u] + 1, v };
    if (this.stats) this.stats.relaxations++;
    return { label, ok: !this.less(this.label(v), label) };
  }

  private apply(u: VertexId, e: EdgeId, label: Label): void {
    const v = label.v;
    // For the picture, "improved" means the distance dropped. Equal-distance updates
    // (fewer hops, or a different tie) still change the labels below.
    const improved = label.d < this.dist[v];
    this.dist[v] = label.d;
    this.hops[v] = label.h;
    this.predEdge[v] = e;
    this.emit?.({ kind: 'relax', edge: e, from: u, to: v, candidate: label.d, improved });
  }

  private reject(u: VertexId, e: EdgeId, label: Label): void {
    this.emit?.({ kind: 'relax', edge: e, from: u, to: label.v, candidate: label.d, improved: false });
  }

  /** Algorithm 1. Returns the pivots P ⊆ S and the set W of vertices touched. */
  findPivots(B: Label, S: readonly VertexId[]): { pivots: VertexId[]; work: VertexId[] } {
    const { g, k } = this;
    const emit = this.emit;
    const inWork = new Set(S);
    const work = [...S];
    let layer = [...S];
    emit?.({ kind: 'line', id: 'pivots' });

    for (let round = 1; round <= k && layer.length > 0; round++) {
      emit?.({ kind: 'phase', label: `FindPivots, round ${round} of ${k}` });
      const next = new Set<VertexId>();
      for (const u of layer) {
        for (let i = g.outStart[u]; i < g.outStart[u + 1]; i++) {
          const e = g.outEdges[i];
          const { label, ok } = this.candidate(u, e);
          if (!ok) {
            this.reject(u, e, label);
            continue;
          }
          this.apply(u, e, label);
          if (this.less(label, B)) {
            next.add(label.v);
            if (!inWork.has(label.v)) {
              inWork.add(label.v);
              work.push(label.v);
            }
          }
        }
      }
      layer = [...next];
      if (work.length > k * S.length) {
        // The search spread too far: keep every frontier vertex as a pivot.
        emit?.({ kind: 'line', id: 'pivots2' });
        emit?.({ kind: 'pivots', pivots: [...S], forest: [], work, sources: [...S], k, early: true });
        return { pivots: [...S], work };
      }
    }

    // The forest of tight predecessor edges inside W; pivots are frontier roots of trees with ≥ k vertices.
    const children = new Map<VertexId, VertexId[]>();
    const forest: EdgeId[] = [];
    const roots: VertexId[] = [];
    for (const v of work) {
      const e = this.predEdge[v];
      const u = e >= 0 ? g.edgeFrom[e] : -1;
      const tight =
        e >= 0 &&
        inWork.has(u) &&
        this.dist[v] === this.dist[u] + g.edgeWeight[e] &&
        this.hops[v] === this.hops[u] + 1;
      if (tight) {
        forest.push(e);
        const list = children.get(u);
        if (list) list.push(v);
        else children.set(u, [v]);
      } else {
        roots.push(v);
      }
    }
    const treeSize = (root: VertexId): number => {
      let size = 0;
      const stack = [root];
      while (stack.length) {
        const x = stack.pop()!;
        size++;
        for (const c of children.get(x) ?? []) stack.push(c);
      }
      return size;
    };
    const frontier = new Set(S);
    const pivots = roots.filter((r) => frontier.has(r) && treeSize(r) >= k);
    emit?.({ kind: 'line', id: 'pivots2' });
    emit?.({ kind: 'pivots', pivots, forest, work, sources: [...S], k, early: false });
    return { pivots, work };
  }

  /** Algorithm 2: a Dijkstra from the single vertex x that stops after k + 1 vertices. */
  baseCase(B: Label, S: readonly VertexId[]): CallResult {
    const { g, k } = this;
    if (S.length !== 1) throw new Error(`Base case needs exactly one source, got ${S.length}`);
    const x = S[0];
    const found: VertexId[] = [x];
    const inFound = new Set([x]);
    const popped = new Set<VertexId>();
    const heap = new LabelHeap(this.less);
    heap.push(this.label(x));
    this.emit?.({ kind: 'line', id: 'base' });

    while (heap.size > 0 && found.length < k + 1) {
      const top = heap.pop();
      const u = top.v;
      if (popped.has(u) || top.d !== this.dist[u] || top.h !== this.hops[u]) continue; // stale
      popped.add(u);
      if (!inFound.has(u)) {
        inFound.add(u);
        found.push(u);
      }
      for (let i = g.outStart[u]; i < g.outStart[u + 1]; i++) {
        const e = g.outEdges[i];
        const { label, ok } = this.candidate(u, e);
        if (ok && this.less(label, B)) {
          this.apply(u, e, label);
          heap.push(label);
        } else {
          this.reject(u, e, label);
        }
      }
    }

    if (found.length <= k) return { newBound: B, completed: found };
    let largest = this.label(found[0]);
    for (const v of found) if (this.less(largest, this.label(v))) largest = this.label(v);
    return { newBound: largest, completed: found.filter((v) => this.less(this.label(v), largest)) };
  }

  /** Algorithm 3. */
  bmssp(level: number, B: Label, S: readonly VertexId[]): CallResult {
    const { g, k, t } = this;
    const emit = this.emit;
    const limit = level === 0 ? k + 1 : k * 2 ** (level * t);
    emit?.({ kind: 'call', level, bound: B.d, sources: [...S], limit });
    emit?.({ kind: 'line', id: 'call' });

    if (level === 0) {
      const result = this.baseCase(B, S);
      this.finish(level, B, result);
      return result;
    }

    const { pivots, work } = this.findPivots(B, S);
    const D = new BlockList(2 ** ((level - 1) * t), B, this.less);
    for (const x of pivots) D.insert(x, this.label(x));

    const completed: VertexId[] = [];
    const inCompleted = new Set<VertexId>();
    let lastBound = B;
    if (pivots.length > 0) {
      lastBound = this.label(pivots[0]);
      for (const x of pivots) if (this.less(this.label(x), lastBound)) lastBound = this.label(x);
    }

    let guard = 0;
    while (completed.length < limit && D.size > 0) {
      if (++guard > 4 * g.n + 10) throw new Error('BMSSP made no progress');
      emit?.({ kind: 'line', id: 'pull' });
      const { sources, bound: Bi } = D.pull();
      emit?.({ kind: 'line', id: 'recurse' });
      const sub = this.bmssp(level - 1, Bi, sources);
      lastBound = sub.newBound;
      for (const v of sub.completed) {
        if (!inCompleted.has(v)) {
          inCompleted.add(v);
          completed.push(v);
        }
      }

      // Relax edges out of the newly completed vertices; new frontier goes back into D.
      const batch: Entry[] = [];
      let announced = false;
      for (const u of sub.completed) {
        for (let i = g.outStart[u]; i < g.outStart[u + 1]; i++) {
          const e = g.outEdges[i];
          if (emit && !announced) {
            emit({ kind: 'line', id: 'relax' });
            emit({ kind: 'phase', label: `Back at level ${level}: relaxing edges out of the newly completed vertices` });
            announced = true;
          }
          const { label, ok } = this.candidate(u, e);
          if (!ok) {
            this.reject(u, e, label);
            continue;
          }
          this.apply(u, e, label);
          if (!this.less(label, Bi) && this.less(label, B)) D.insert(label.v, label);
          else if (!this.less(label, sub.newBound) && this.less(label, Bi)) batch.push({ v: label.v, label });
        }
      }
      for (const x of sources) {
        const lx = this.label(x);
        if (!this.less(lx, sub.newBound) && this.less(lx, Bi)) batch.push({ v: x, label: lx });
      }
      D.batchPrepend(batch);
    }

    const newBound = this.less(lastBound, B) ? lastBound : B;
    for (const x of work) {
      if (!inCompleted.has(x) && this.less(this.label(x), newBound)) {
        inCompleted.add(x);
        completed.push(x);
      }
    }
    const result = { newBound, completed };
    this.finish(level, B, result);
    return result;
  }

  private finish(level: number, B: Label, result: CallResult): void {
    this.emit?.({ kind: 'line', id: 'return' });
    this.emit?.({
      kind: 'return',
      level,
      bound: result.newBound.d,
      partial: this.less(result.newBound, B),
      completed: result.completed,
    });
  }
}

/**
 * For the FindPivots figure: settle `source`, relax its edges so its
 * neighbours become the frontier, then run FindPivots on that frontier with no bound.
 */
export function findPivotsDemo(g: Graph, source: VertexId, k: number, emit?: Emit) {
  const run = new BmsspRun(g, { k, t: 1 }, { emit });
  run.setSource(source);
  emit?.({ kind: 'settle', v: source });
  const frontier: VertexId[] = [];
  for (let i = g.outStart[source]; i < g.outStart[source + 1]; i++) {
    const e = g.outEdges[i];
    const v = g.edgeTo[e];
    run.dist[v] = g.edgeWeight[e];
    run.hops[v] = 1;
    run.predEdge[v] = e;
    emit?.({ kind: 'relax', edge: e, from: source, to: v, candidate: g.edgeWeight[e], improved: true });
    frontier.push(v);
  }
  return { frontier, ...run.findPivots(INFINITE, frontier) };
}

/** Single-source shortest paths with the 2025 algorithm. Non-negative weights only. */
export function bmssp(g: Graph, source: VertexId, options: RunOptions & { params?: BmsspParams } = {}): ShortestPaths {
  assertVertex(g, source);
  const params = options.params ?? paperParams(g.n);
  const run = new BmsspRun(g, params, options);
  run.setSource(source);
  run.bmssp(topLevel(g.n, params.t), INFINITE, [source]);
  options.emit?.({ kind: 'done' });
  return { kind: 'paths', source, dist: run.dist, predEdge: run.predEdge };
}
