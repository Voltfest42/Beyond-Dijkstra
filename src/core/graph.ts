/**
 * Directed, weighted graph stored in compressed sparse row (CSR) form.
 *
 * The same structure serves the 8-vertex teaching examples and the
 * million-vertex graphs used in the race, so everything hot lives in typed
 * arrays. Vertex and edge ids are dense integers: an edge's id is its index
 * in the list it was created from, which keeps ids stable for the visuals.
 */

export type VertexId = number;
export type EdgeId = number;

export interface EdgeSpec {
  from: VertexId;
  to: VertexId;
  weight: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Graph {
  /** Number of vertices. */
  readonly n: number;
  /** Number of edges. */
  readonly m: number;

  readonly edgeFrom: Int32Array;
  readonly edgeTo: Int32Array;
  readonly edgeWeight: Float64Array;

  /** Outgoing edges of u are outEdges[outStart[u] .. outStart[u + 1]). */
  readonly outStart: Int32Array;
  readonly outEdges: Int32Array;
  /** Incoming edges of v are inEdges[inStart[v] .. inStart[v + 1]). */
  readonly inStart: Int32Array;
  readonly inEdges: Int32Array;

  /** Optional display data; algorithms never read these. */
  readonly labels?: readonly string[];
  readonly positions?: readonly Point[];
}

export interface GraphOptions {
  labels?: readonly string[];
  positions?: readonly Point[];
}

export function createGraph(n: number, edges: readonly EdgeSpec[], options: GraphOptions = {}): Graph {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`Invalid vertex count: ${n}`);
  const m = edges.length;
  const edgeFrom = new Int32Array(m);
  const edgeTo = new Int32Array(m);
  const edgeWeight = new Float64Array(m);

  for (let e = 0; e < m; e++) {
    const { from, to, weight } = edges[e];
    if (!isVertex(from, n) || !isVertex(to, n)) {
      throw new RangeError(`Edge ${e} (${from} → ${to}) refers to a vertex outside 0..${n - 1}`);
    }
    if (!Number.isFinite(weight)) throw new RangeError(`Edge ${e} has a non-finite weight: ${weight}`);
    edgeFrom[e] = from;
    edgeTo[e] = to;
    edgeWeight[e] = weight;
  }

  const [outStart, outEdges] = buildCsr(n, m, edgeFrom);
  const [inStart, inEdges] = buildCsr(n, m, edgeTo);

  if (options.labels && options.labels.length !== n) throw new RangeError('labels must have one entry per vertex');
  if (options.positions && options.positions.length !== n) {
    throw new RangeError('positions must have one entry per vertex');
  }

  return {
    n,
    m,
    edgeFrom,
    edgeTo,
    edgeWeight,
    outStart,
    outEdges,
    inStart,
    inEdges,
    labels: options.labels,
    positions: options.positions,
  };
}

/** Groups edge ids by `key[e]` (the tail for out-lists, the head for in-lists), preserving id order. */
function buildCsr(n: number, m: number, key: Int32Array): [Int32Array, Int32Array] {
  const start = new Int32Array(n + 1);
  for (let e = 0; e < m; e++) start[key[e] + 1]++;
  for (let v = 0; v < n; v++) start[v + 1] += start[v];
  const fill = start.slice(0, n);
  const list = new Int32Array(m);
  for (let e = 0; e < m; e++) list[fill[key[e]]++] = e;
  return [start, list];
}

function isVertex(v: number, n: number): boolean {
  return Number.isInteger(v) && v >= 0 && v < n;
}

export function edgesOf(g: Graph): EdgeSpec[] {
  const edges: EdgeSpec[] = [];
  for (let e = 0; e < g.m; e++) edges.push({ from: g.edgeFrom[e], to: g.edgeTo[e], weight: g.edgeWeight[e] });
  return edges;
}

export function vertexLabel(g: Graph, v: VertexId): string {
  return g.labels?.[v] ?? String(v);
}

/** Returns a copy of the graph with every edge weight replaced by `weight(e)`. */
export function reweighted(g: Graph, weight: (e: EdgeId) => number): Graph {
  const edges = edgesOf(g).map((spec, e) => ({ ...spec, weight: weight(e) }));
  return createGraph(g.n, edges, { labels: g.labels, positions: g.positions });
}

/** Serializable form, used for the playground's import/export. */
export interface GraphJson {
  n: number;
  edges: EdgeSpec[];
  labels?: string[];
  positions?: Point[];
}

export function toJson(g: Graph): GraphJson {
  return {
    n: g.n,
    edges: edgesOf(g),
    labels: g.labels ? [...g.labels] : undefined,
    positions: g.positions ? g.positions.map((p) => ({ ...p })) : undefined,
  };
}

export function fromJson(json: GraphJson): Graph {
  return createGraph(json.n, json.edges, { labels: json.labels, positions: json.positions });
}
