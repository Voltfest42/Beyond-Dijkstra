import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bellmanFord } from '../src/core/algorithms/bellmanFord';
import { dijkstra } from '../src/core/algorithms/dijkstra';
import { createGraph, type Graph } from '../src/core/graph';
import { randomGraph } from '../src/core/generators';
import { cycleWeight, newStats, pathTo, type ShortestPaths } from '../src/core/sssp';
import { graphCase } from './helpers/arbitraries';
import { referenceShortestPaths } from './helpers/oracle';

const RUNS = { numRuns: 2000 };

/** Every reachable vertex's tree edge must be tight and lead back to the source. */
function expectValidTree(g: Graph, result: ShortestPaths) {
  expect(result.predEdge[result.source]).toBe(-1);
  for (let v = 0; v < g.n; v++) {
    if (v === result.source || result.dist[v] === Infinity) continue;
    const e = result.predEdge[v];
    expect(g.edgeTo[e]).toBe(v);
    expect(result.dist[g.edgeFrom[e]] + g.edgeWeight[e]).toBe(result.dist[v]);
    const path = pathTo(g, result, v)!;
    expect(path[0]).toBe(result.source);
    expect(path.at(-1)).toBe(v);
  }
}

describe('dijkstra', () => {
  it('matches Floyd–Warshall on non-negative graphs', () => {
    fc.assert(
      fc.property(graphCase({ minWeight: 0 }), ({ n, edges, source, graph }) => {
        const result = dijkstra(graph, source);
        const ref = referenceShortestPaths(n, edges, source);
        if (ref.negativeCycleReachable) throw new Error('impossible with non-negative weights');
        expect(Array.from(result.dist)).toEqual(ref.dist);
        expectValidTree(graph, result);
      }),
      RUNS,
    );
  });

  it('with negative edges still returns real paths, but they can be too long', () => {
    fc.assert(
      fc.property(graphCase({ minWeight: -6 }), ({ n, edges, source, graph }) => {
        const ref = referenceShortestPaths(n, edges, source);
        const result = dijkstra(graph, source);
        expectValidTree(graph, result);
        if (!ref.negativeCycleReachable) {
          for (let v = 0; v < n; v++) expect(result.dist[v]).toBeGreaterThanOrEqual(ref.dist[v]);
        }
      }),
      RUNS,
    );
  });

  it('gets the textbook counterexample wrong', () => {
    // s→a (2), s→b (5), b→a (−4), a→c (1): true distances a = 1, c = 2.
    const g = createGraph(4, [
      { from: 0, to: 1, weight: 2 },
      { from: 0, to: 2, weight: 5 },
      { from: 2, to: 1, weight: -4 },
      { from: 1, to: 3, weight: 1 },
    ]);
    expect(Array.from(dijkstra(g, 0).dist)).toEqual([0, 2, 5, 3]);
    const truth = bellmanFord(g, 0);
    expect(truth.kind === 'paths' && Array.from(truth.dist)).toEqual([0, 1, 5, 2]);
  });

  it('counts operations without changing the result', () => {
    const g = randomGraph({ n: 200, m: 800, seed: 3, reachableFrom: 0 });
    const stats = newStats();
    expect(dijkstra(g, 0, { stats }).dist).toEqual(dijkstra(g, 0).dist);
    expect(stats.relaxations).toBe(800);
    expect(stats.comparisons).toBeGreaterThan(0);
  });
});

describe('bellmanFord', () => {
  it('matches Floyd–Warshall, and reports a negative cycle exactly when one is reachable', () => {
    fc.assert(
      fc.property(graphCase({ minWeight: -6 }), ({ n, edges, source, graph }) => {
        const ref = referenceShortestPaths(n, edges, source);
        const result = bellmanFord(graph, source);
        if (ref.negativeCycleReachable) {
          expect(result.kind).toBe('negative-cycle');
          if (result.kind !== 'negative-cycle') return;
          const { cycle } = result;
          expect(cycle.length).toBeGreaterThan(0);
          for (let i = 0; i < cycle.length; i++) {
            expect(graph.edgeTo[cycle[i]]).toBe(graph.edgeFrom[cycle[(i + 1) % cycle.length]]);
          }
          expect(cycleWeight(graph, cycle)).toBeLessThan(0);
        } else {
          expect(result.kind).toBe('paths');
          if (result.kind !== 'paths') return;
          expect(Array.from(result.dist)).toEqual(ref.dist);
          expectValidTree(graph, result);
        }
      }),
      RUNS,
    );
  });

  it('finds a negative self-loop on a single vertex', () => {
    const result = bellmanFord(createGraph(1, [{ from: 0, to: 0, weight: -1 }]), 0);
    expect(result).toEqual({ kind: 'negative-cycle', source: 0, cycle: [0] });
  });

  it('ignores negative cycles the source cannot reach', () => {
    const g = createGraph(3, [
      { from: 0, to: 1, weight: 4 },
      { from: 2, to: 2, weight: -3 },
    ]);
    const result = bellmanFord(g, 0);
    expect(result.kind === 'paths' && Array.from(result.dist)).toEqual([0, 4, Infinity]);
  });
});
