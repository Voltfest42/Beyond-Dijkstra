import type { Stats } from './sssp';

/**
 * Binary min-heap over vertex ids 0..n-1 with decrease-key, the classic
 * priority queue for Dijkstra. Equal keys are ordered by vertex id so runs are
 * deterministic, which matters when a figure replays a trace.
 */
export class IndexedMinHeap {
  private readonly heap: Int32Array;
  /** pos[v] is v's index in `heap`, or -1 when v is not in the heap. */
  private readonly pos: Int32Array;
  private readonly key: Float64Array;
  private count = 0;
  private readonly stats?: Stats;

  constructor(n: number, stats?: Stats) {
    this.heap = new Int32Array(n);
    this.pos = new Int32Array(n).fill(-1);
    this.key = new Float64Array(n);
    this.stats = stats;
  }

  get size(): number {
    return this.count;
  }

  has(v: number): boolean {
    return this.pos[v] >= 0;
  }

  keyOf(v: number): number {
    return this.key[v];
  }

  /** Inserts v, or lowers its key if it is already queued with a larger one. */
  pushOrDecrease(v: number, key: number): 'push' | 'decrease' | 'none' {
    if (this.stats) this.stats.queueOps++;
    if (this.pos[v] < 0) {
      this.key[v] = key;
      this.heap[this.count] = v;
      this.pos[v] = this.count;
      this.count++;
      this.siftUp(this.count - 1);
      return 'push';
    }
    if (key < this.key[v]) {
      this.key[v] = key;
      this.siftUp(this.pos[v]);
      return 'decrease';
    }
    return 'none';
  }

  /** Removes and returns the vertex with the smallest key. */
  pop(): number {
    if (this.count === 0) throw new Error('pop() on an empty heap');
    if (this.stats) this.stats.queueOps++;
    const top = this.heap[0];
    this.count--;
    this.pos[top] = -1;
    if (this.count > 0) {
      const last = this.heap[this.count];
      this.heap[0] = last;
      this.pos[last] = 0;
      this.siftDown(0);
    }
    return top;
  }

  private less(a: number, b: number): boolean {
    if (this.stats) this.stats.comparisons++;
    const ka = this.key[a];
    const kb = this.key[b];
    return ka < kb || (ka === kb && a < b);
  }

  private siftUp(i: number): void {
    const v = this.heap[i];
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const p = this.heap[parent];
      if (!this.less(v, p)) break;
      this.heap[i] = p;
      this.pos[p] = i;
      i = parent;
    }
    this.heap[i] = v;
    this.pos[v] = i;
  }

  private siftDown(i: number): void {
    const v = this.heap[i];
    for (;;) {
      const left = 2 * i + 1;
      if (left >= this.count) break;
      const right = left + 1;
      const child = right < this.count && this.less(this.heap[right], this.heap[left]) ? right : left;
      const c = this.heap[child];
      if (!this.less(c, v)) break;
      this.heap[i] = c;
      this.pos[c] = i;
      i = child;
    }
    this.heap[i] = v;
    this.pos[v] = i;
  }
}
