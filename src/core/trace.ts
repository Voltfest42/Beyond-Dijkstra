import type { EdgeId, Graph, VertexId } from './graph';

/**
 * Algorithms describe what they do as a stream of trace events. The UI records
 * the stream once and rebuilds the picture at any step from it, so stepping
 * backwards is as cheap as stepping forwards.
 */
export type TraceEvent =
  /** The source starts at distance 0. */
  | { kind: 'source'; v: VertexId }
  /**
   * Edge `edge` (from → to) was examined. `candidate` is dist[from] + weight.
   * When `improved` is true, dist[to] becomes `candidate` and the edge becomes to's tree edge.
   * `targetSettled` marks Dijkstra ignoring an edge into an already-final vertex.
   */
  | {
      kind: 'relax';
      edge: EdgeId;
      from: VertexId;
      to: VertexId;
      candidate: number;
      improved: boolean;
      targetSettled?: boolean;
    }
  | { kind: 'queue'; op: 'push' | 'decrease'; v: VertexId; key: number }
  | { kind: 'queue'; op: 'pop'; v: VertexId; key: number }
  /** v's distance is final. */
  | { kind: 'settle'; v: VertexId }
  /** Highlight a pseudocode line (ids are defined next to each algorithm). */
  | { kind: 'line'; id: string }
  /** A caption for what is happening, e.g. "Round 3 of 7". */
  | { kind: 'phase'; label: string }
  /** Start of a Bellman–Ford-style round. */
  | { kind: 'round'; round: number }
  | { kind: 'negative-cycle'; cycle: EdgeId[] }
  /** A recursive call starts (BMSSP): find everything below `bound` reachable through `sources`. */
  | { kind: 'call'; level: number; bound: number; sources: VertexId[]; limit: number }
  /** FindPivots finished: the frontier `sources` shrank to `pivots`; `work` is everything it touched. */
  | { kind: 'pivots'; pivots: VertexId[]; forest: EdgeId[]; work: VertexId[]; sources: VertexId[]; k: number; early: boolean }
  /** The innermost call returns: `completed` are final, and every distance below `bound` is now known. */
  | { kind: 'return'; level: number; bound: number; partial: boolean; completed: VertexId[] }
  | { kind: 'done' };

/** One recursive call, as shown in a recursion-tree panel. */
export interface CallRecord {
  level: number;
  bound: number;
  sources: VertexId[];
  /** Smallest distance among the sources when the call started. */
  lower: number;
  parent: number | null;
  depth: number;
  done: boolean;
  /** Set on return. */
  newBound?: number;
  partial?: boolean;
  completed?: number;
}

export type Emit = (event: TraceEvent) => void;

export function recordTrace<R>(run: (emit: Emit) => R): { events: TraceEvent[]; result: R } {
  const events: TraceEvent[] = [];
  const result = run((event) => events.push(event));
  return { events, result };
}

export type VertexStatus = 'unvisited' | 'frontier' | 'settled';

/** Everything a figure needs to draw one moment of a run. */
export interface VisualState {
  /** How many events have been applied. */
  step: number;
  dist: number[];
  predEdge: number[];
  status: VertexStatus[];
  /** Frontier / priority-queue contents: vertex → key. */
  queue: Map<VertexId, number>;
  /** Vertices in the order they were settled. */
  settledOrder: VertexId[];
  /** The vertex being processed (last popped or relaxed from). */
  current: VertexId | null;
  /** The edge examined by the latest event, and whether that improved anything. */
  activeEdge: EdgeId | null;
  activeEdgeImproved: boolean | null;
  /** Set when Dijkstra ignores a shorter route into a settled vertex. */
  ignoredImprovement: { edge: EdgeId; candidate: number } | null;
  line: string | null;
  phase: string | null;
  round: number | null;
  /** Relaxations performed so far (edges examined with a finite start distance). */
  relaxations: number;
  negativeCycle: EdgeId[] | null;
  /** Recursive calls in the order they started, and the indices of the ones still running. */
  calls: CallRecord[];
  callStack: number[];
  /** The latest FindPivots result inside the running call, if any. */
  pivots: VertexId[] | null;
  forest: EdgeId[] | null;
  workSet: VertexId[] | null;
  done: boolean;
}

export function initialState(n: number): VisualState {
  return {
    step: 0,
    dist: new Array<number>(n).fill(Infinity),
    predEdge: new Array<number>(n).fill(-1),
    status: new Array<VertexStatus>(n).fill('unvisited'),
    queue: new Map(),
    settledOrder: [],
    current: null,
    activeEdge: null,
    activeEdgeImproved: null,
    ignoredImprovement: null,
    line: null,
    phase: null,
    round: null,
    relaxations: 0,
    negativeCycle: null,
    calls: [],
    callStack: [],
    pivots: null,
    forest: null,
    workSet: null,
    done: false,
  };
}

export function cloneState(s: VisualState): VisualState {
  return {
    ...s,
    dist: s.dist.slice(),
    predEdge: s.predEdge.slice(),
    status: s.status.slice(),
    queue: new Map(s.queue),
    settledOrder: s.settledOrder.slice(),
    ignoredImprovement: s.ignoredImprovement && { ...s.ignoredImprovement },
    negativeCycle: s.negativeCycle && s.negativeCycle.slice(),
    calls: s.calls.map((c) => ({ ...c })),
    callStack: s.callStack.slice(),
  };
}

/** Applies one event to the state, mutating it in place. */
export function applyEvent(s: VisualState, event: TraceEvent): void {
  s.step++;
  // Highlights last until the next action. Bookkeeping that belongs to the same
  // action (the queue update after a relaxation, captions, line markers) keeps them.
  if (startsNewAction(event)) {
    s.activeEdge = null;
    s.activeEdgeImproved = null;
    s.ignoredImprovement = null;
  }

  switch (event.kind) {
    case 'source':
      s.dist[event.v] = 0;
      s.current = event.v;
      if (s.status[event.v] === 'unvisited') s.status[event.v] = 'frontier';
      break;
    case 'relax':
      s.relaxations++;
      s.current = event.from;
      s.activeEdge = event.edge;
      s.activeEdgeImproved = event.improved;
      if (event.improved) {
        s.dist[event.to] = event.candidate;
        s.predEdge[event.to] = event.edge;
        // "Frontier" = has a tentative distance but isn't final yet.
        if (s.status[event.to] === 'unvisited') s.status[event.to] = 'frontier';
      } else if (event.targetSettled && event.candidate < s.dist[event.to]) {
        s.ignoredImprovement = { edge: event.edge, candidate: event.candidate };
      }
      break;
    case 'queue':
      if (event.op === 'pop') {
        s.queue.delete(event.v);
        s.current = event.v;
      } else {
        s.queue.set(event.v, event.key);
        if (s.status[event.v] === 'unvisited') s.status[event.v] = 'frontier';
      }
      break;
    case 'settle':
      s.status[event.v] = 'settled';
      s.settledOrder.push(event.v);
      break;
    case 'line':
      s.line = event.id;
      break;
    case 'phase':
      s.phase = event.label;
      break;
    case 'round':
      s.round = event.round;
      break;
    case 'negative-cycle':
      s.negativeCycle = event.cycle.slice();
      break;
    case 'call': {
      const parent = s.callStack.length ? s.callStack[s.callStack.length - 1] : null;
      s.calls.push({
        level: event.level,
        bound: event.bound,
        sources: event.sources,
        lower: Math.min(...event.sources.map((v) => s.dist[v])),
        parent,
        depth: s.callStack.length,
        done: false,
      });
      s.callStack.push(s.calls.length - 1);
      s.pivots = s.forest = s.workSet = null;
      s.current = null;
      break;
    }
    case 'pivots':
      s.pivots = event.pivots;
      s.forest = event.forest;
      s.workSet = event.work;
      s.current = null;
      break;
    case 'return': {
      const index = s.callStack.pop();
      if (index !== undefined) {
        const call = s.calls[index];
        s.calls[index] = { ...call, done: true, newBound: event.bound, partial: event.partial, completed: event.completed.length };
      }
      for (const v of event.completed) {
        if (s.status[v] === 'settled') continue;
        s.status[v] = 'settled';
        s.settledOrder.push(v);
      }
      s.pivots = s.forest = s.workSet = null;
      s.current = null;
      break;
    }
    case 'done':
      s.done = true;
      s.current = null;
      s.line = null;
      // Algorithms that never "settle" one by one (Bellman–Ford, the hybrid) are final now.
      if (!s.negativeCycle) {
        for (let v = 0; v < s.status.length; v++) if (s.status[v] === 'frontier') s.status[v] = 'settled';
      }
      break;
  }
}

function startsNewAction(event: TraceEvent): boolean {
  switch (event.kind) {
    case 'relax':
    case 'source':
    case 'negative-cycle':
    case 'call':
    case 'pivots':
    case 'return':
    case 'done':
      return true;
    case 'queue':
      return event.op === 'pop';
    default:
      return false;
  }
}

/**
 * Random access into a recorded trace. Keeps a snapshot every `interval`
 * events, so any step is at most `interval` event applications away.
 */
export class TracePlayer {
  readonly events: readonly TraceEvent[];
  private readonly snapshots: VisualState[] = [];
  private readonly interval: number;

  constructor(graph: Pick<Graph, 'n'>, events: readonly TraceEvent[], interval = 64) {
    this.events = events;
    this.interval = interval;
    const state = initialState(graph.n);
    this.snapshots.push(cloneState(state));
    for (let i = 0; i < events.length; i++) {
      applyEvent(state, events[i]);
      if ((i + 1) % interval === 0) this.snapshots.push(cloneState(state));
    }
  }

  get length(): number {
    return this.events.length;
  }

  /** The state after applying the first `step` events (0 = before anything happened). */
  stateAt(step: number): VisualState {
    const target = Math.max(0, Math.min(step, this.events.length));
    const base = Math.floor(target / this.interval);
    const state = cloneState(this.snapshots[base]);
    for (let i = base * this.interval; i < target; i++) applyEvent(state, this.events[i]);
    return state;
  }
}
