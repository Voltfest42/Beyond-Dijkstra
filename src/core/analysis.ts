import type { EdgeId, Graph, VertexId } from './graph';

/**
 * Strongly connected components of the graph restricted to the edges for
 * which `keep(e)` is true, listed in topological order of the condensation:
 * every kept edge between two different components goes from an earlier
 * component to a later one. (Iterative Tarjan, which emits components in
 * reverse topological order.)
 */
export function stronglyConnectedComponents(g: Graph, keep: (e: EdgeId) => boolean = () => true): VertexId[][] {
  const { n, outStart, outEdges, edgeTo } = g;
  const index = new Int32Array(n).fill(-1);
  const low = new Int32Array(n);
  const onStack = new Uint8Array(n);
  const stack: VertexId[] = [];
  const components: VertexId[][] = [];
  let counter = 0;

  // Explicit DFS stack of (vertex, next out-edge position).
  const callVertex = new Int32Array(n);
  const callEdge = new Int32Array(n);

  for (let root = 0; root < n; root++) {
    if (index[root] >= 0) continue;
    let depth = 0;
    callVertex[0] = root;
    callEdge[0] = outStart[root];
    index[root] = low[root] = counter++;
    stack.push(root);
    onStack[root] = 1;

    while (depth >= 0) {
      const v = callVertex[depth];
      if (callEdge[depth] < outStart[v + 1]) {
        const e = outEdges[callEdge[depth]++];
        if (!keep(e)) continue;
        const w = edgeTo[e];
        if (index[w] < 0) {
          index[w] = low[w] = counter++;
          stack.push(w);
          onStack[w] = 1;
          depth++;
          callVertex[depth] = w;
          callEdge[depth] = outStart[w];
        } else if (onStack[w]) {
          low[v] = Math.min(low[v], index[w]);
        }
      } else {
        if (low[v] === index[v]) {
          const component: VertexId[] = [];
          let w: VertexId;
          do {
            w = stack.pop()!;
            onStack[w] = 0;
            component.push(w);
          } while (w !== v);
          components.push(component.sort((a, b) => a - b));
        }
        depth--;
        if (depth >= 0) {
          const parent = callVertex[depth];
          low[parent] = Math.min(low[parent], low[v]);
        }
      }
    }
  }
  return components.reverse();
}

/**
 * η for a given set of edge weights: the largest, over all vertices, of the
 * fewest negative edges on a shortest route to it from a virtual source (a
 * 0-weight edge into every vertex). It measures how many rounds the hybrid
 * needs. Assumes there is no negative cycle.
 */
export function negativeEdgesNeeded(g: Graph, weights: ArrayLike<number>): number {
  const { n, m, edgeFrom, edgeTo } = g;
  const dist = new Float64Array(n); // all 0: the virtual source reaches everything for free
  const neg = new Float64Array(n);
  for (let round = 0; round < n; round++) {
    let changed = false;
    for (let e = 0; e < m; e++) {
      const u = edgeFrom[e];
      const v = edgeTo[e];
      const d = dist[u] + weights[e];
      const k = neg[u] + (weights[e] < 0 ? 1 : 0);
      if (d < dist[v] || (d === dist[v] && k < neg[v])) {
        dist[v] = d;
        neg[v] = k;
        changed = true;
      }
    }
    if (!changed) break;
  }
  let most = 0;
  for (let v = 0; v < n; v++) most = Math.max(most, neg[v]);
  return most;
}

export function countNegative(weights: ArrayLike<number>): number {
  let count = 0;
  for (let i = 0; i < weights.length; i++) if (weights[i] < 0) count++;
  return count;
}
