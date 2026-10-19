import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hybrid } from '../src/core/algorithms/hybrid';
import { johnson, johnsonPotential, reweightedWeights } from '../src/core/algorithms/johnson';
import { createGraph, type Graph } from '../src/core/graph';
import { cycleWeight, pathTo } from '../src/core/sssp';
import { graphCase } from './helpers/arbitraries';
import { maxNegativeEdgesOnShortestPaths, referenceShortestPaths } from './helpers/oracle';

const RUNS = { numRuns: 2000 };

function expectValidNegativeCycle(g: Graph, cycle: number[]) {
  expect(cycle.length).toBeGreaterThan(0);
  for (let i = 0; i < cycle.length; i++) expect(g.edgeTo[cycle[i]]).toBe(g.edgeFrom[cycle[(i + 1) % cycle.length]]);
  expect(cycleWeight(g, cycle)).toBeLessThan(0);
}

describe('hybrid (Dijkstra + Bellman–Ford)', () => {
  it('matches Floyd–Warshall and reports reachable negative cycles', () => {
    fc.assert(
      fc.property(graphCase({ minWeight: -6 }), ({ n, edges, source, graph }) => {
        const ref = referenceShortestPaths(n, edges, source);
        const result = hybrid(graph, source);
        if (ref.negativeCycleReachable) {
          expect(result.kind).toBe('negative-cycle');
          if (result.kind === 'negative-cycle') expectValidNegativeCycle(graph, result.cycle);
        } else {
          expect(result.kind).toBe('paths');
          if (result.kind !== 'paths') return;
          expect(Array.from(result.dist)).toEqual(ref.dist);
          for (let v = 0; v < n; v++) if (result.dist[v] < Infinity) expect(pathTo(graph, result, v)?.[0]).toBe(source);
        }
      }),
      RUNS,
    );
  });

  it('needs at most η + 1 rounds, where η is the most negative edges any shortest path needs', () => {
    fc.assert(
      fc.property(graphCase({ minWeight: -6 }), ({ n, edges, source, graph }) => {
        if (referenceShortestPaths(n, edges, source).negativeCycleReachable) return;
        const { rounds } = hybrid(graph, source);
        expect(rounds).toBeGreaterThanOrEqual(1);
        expect(rounds).toBeLessThanOrEqual(maxNegativeEdgesOnShortestPaths(n, edges, source) + 1);
      }),
      RUNS,
    );
  });

  it('can chain two negative edges in one Bellman–Ford pass (so η + 1 is an upper bound, not exact)', () => {
    const edges = [
      { from: 2, to: 0, weight: -1 },
      { from: 1, to: 2, weight: -1 },
      { from: 1, to: 2, weight: 0 },
    ];
    expect(maxNegativeEdgesOnShortestPaths(3, edges, 1)).toBe(2);
    expect(hybrid(createGraph(3, edges), 1).rounds).toBe(2);
  });
});

describe('potentials (Johnson)', () => {
  it('shift every s → t path by the same amount, φ(s) − φ(t)', () => {
    fc.assert(
      fc.property(
        graphCase({ minWeight: -6, maxN: 6 }),
        fc.array(fc.integer({ min: -10, max: 10 }), { minLength: 6, maxLength: 6 }),
        ({ graph }, phi) => {
          const w = reweightedWeights(graph, phi);
          // Any walk: the reweighted length = original + φ(first) − φ(last).
          for (let e = 0; e < graph.m; e++) {
            expect(w[e] - graph.edgeWeight[e]).toBe(phi[graph.edgeFrom[e]] - phi[graph.edgeTo[e]]);
          }
        },
      ),
    );
  });

  it('Johnson’s potential makes every edge non-negative, or reports a negative cycle', () => {
    fc.assert(
      fc.property(graphCase({ minWeight: -6 }), ({ graph }) => {
        const phi = johnsonPotential(graph);
        if (phi) for (const w of reweightedWeights(graph, phi)) expect(w).toBeGreaterThanOrEqual(0);
      }),
      RUNS,
    );
  });

  it('Johnson’s algorithm matches Floyd–Warshall', () => {
    fc.assert(
      fc.property(graphCase({ minWeight: -6 }), ({ n, edges, source, graph }) => {
        const ref = referenceShortestPaths(n, edges, source);
        const result = johnson(graph, source);
        if (result.kind === 'negative-cycle') {
          // Johnson sees cycles anywhere in the graph, reachable or not.
          expectValidNegativeCycle(graph, result.cycle);
        } else {
          expect(ref.negativeCycleReachable).toBe(false);
          if (!ref.negativeCycleReachable) expect(Array.from(result.dist)).toEqual(ref.dist);
        }
      }),
      RUNS,
    );
  });
});
