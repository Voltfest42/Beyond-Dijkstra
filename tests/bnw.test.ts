import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { stronglyConnectedComponents } from '../src/core/analysis';
import { bnw, lowDiameterDecomposition, scaleDown, type BnwContext } from '../src/core/algorithms/bnw';
import { createGraph, type Graph } from '../src/core/graph';
import { seededRandom } from '../src/core/generators';
import { cycleWeight } from '../src/core/sssp';
import { graphCase } from './helpers/arbitraries';
import { hasNegativeCycle, reachability, referenceShortestPaths } from './helpers/oracle';

const RUNS = { numRuns: 1500 };

function context(seed: number): BnwContext {
  return { random: seededRandom(seed), stats: { scaleDownCalls: 0, maxDepth: 0, hybridRounds: 0, cutEdges: 0 }, lddRate: 1 };
}

function work(g: Graph) {
  return { g, orig: Int32Array.from({ length: g.m }, (_, e) => e) };
}

function expectNegativeCycle(g: Graph, cycle: number[]) {
  expect(cycle.length).toBeGreaterThan(0);
  for (let i = 0; i < cycle.length; i++) expect(g.edgeTo[cycle[i]]).toBe(g.edgeFrom[cycle[(i + 1) % cycle.length]]);
  expect(cycleWeight(g, cycle)).toBeLessThan(0);
}

describe('strongly connected components', () => {
  it('group exactly the mutually reachable vertices, in topological order', () => {
    fc.assert(
      fc.property(graphCase({ maxN: 10 }), ({ n, edges, graph }) => {
        const components = stronglyConnectedComponents(graph);
        const r = reachability(n, edges);
        const componentOf = new Array<number>(n);
        components.forEach((c, i) => c.forEach((v) => (componentOf[v] = i)));
        expect(components.flat().sort((a, b) => a - b)).toEqual([...Array(n).keys()]);
        for (let u = 0; u < n; u++) {
          for (let v = 0; v < n; v++) expect(componentOf[u] === componentOf[v]).toBe(r[u][v] && r[v][u]);
        }
        for (const { from, to } of edges) expect(componentOf[from]).toBeLessThanOrEqual(componentOf[to]);
      }),
      RUNS,
    );
  });
});

describe('low-diameter decomposition', () => {
  it('puts every vertex in exactly one ball, and no strongly connected piece crosses balls', () => {
    fc.assert(
      fc.property(graphCase({ maxN: 10 }), fc.integer({ min: 1, max: 40 }), fc.nat(1000), ({ n, graph }, D, seed) => {
        const { cut, balls } = lowDiameterDecomposition(graph, graph.edgeWeight, D, seededRandom(seed));
        const ballOf = new Array<number>(n).fill(-1);
        balls.forEach((b, i) =>
          b.vertices.forEach((v) => {
            expect(ballOf[v]).toBe(-1);
            ballOf[v] = i;
          }),
        );
        expect(ballOf.every((b) => b >= 0)).toBe(true);
        for (const component of stronglyConnectedComponents(graph, (e) => !cut.has(e))) {
          expect(new Set(component.map((v) => ballOf[v])).size).toBe(1);
        }
      }),
      RUNS,
    );
  });
});

describe('ScaleDown', () => {
  it('returns heights making every edge ≥ −B (edges start ≥ −2B), or a real negative cycle', () => {
    const B = 3;
    fc.assert(
      fc.property(graphCase({ maxN: 9, minWeight: -2 * B, maxWeight: 12 }), fc.nat(1000), ({ graph }, seed) => {
        const result = scaleDown(work(graph), { delta: graph.n, B, depth: 0 }, context(seed));
        if (result.kind === 'negative-cycle') {
          expectNegativeCycle(graph, result.cycle);
          return;
        }
        for (let e = 0; e < graph.m; e++) {
          const w = graph.edgeWeight[e] + result.phi[graph.edgeFrom[e]] - result.phi[graph.edgeTo[e]];
          expect(w).toBeGreaterThanOrEqual(-B);
        }
      }),
      RUNS,
    );
  });

  it('in demo mode (B = 0, fixed diameter) makes every edge non-negative', () => {
    fc.assert(
      fc.property(graphCase({ maxN: 9, minWeight: -5 }), fc.nat(1000), ({ n, edges, graph }, seed) => {
        const result = scaleDown(work(graph), { delta: n, B: 0, diameter: 8, depth: 0 }, context(seed), {});
        if (hasNegativeCycle(n, edges)) {
          expect(result.kind).toBe('negative-cycle');
          return;
        }
        expect(result.kind).toBe('heights');
        if (result.kind !== 'heights') return;
        for (let e = 0; e < graph.m; e++) {
          expect(graph.edgeWeight[e] + result.phi[graph.edgeFrom[e]] - result.phi[graph.edgeTo[e]]).toBeGreaterThanOrEqual(0);
        }
      }),
      RUNS,
    );
  });
});

describe('BNW (full algorithm with scaling)', () => {
  it('matches Floyd–Warshall, and reports a negative cycle exactly when the graph has one', () => {
    fc.assert(
      fc.property(graphCase({ maxN: 9, minWeight: -6 }), fc.nat(1000), ({ n, edges, source, graph }, seed) => {
        const result = bnw(graph, source, { seed });
        if (hasNegativeCycle(n, edges)) {
          expect(result.kind).toBe('negative-cycle');
          if (result.kind === 'negative-cycle') expectNegativeCycle(graph, result.cycle);
          return;
        }
        const ref = referenceShortestPaths(n, edges, source);
        expect(result.kind).toBe('paths');
        if (result.kind !== 'paths' || ref.negativeCycleReachable) return;
        expect(Array.from(result.dist)).toEqual(ref.dist);
        // The tree is a real shortest-path tree.
        for (let v = 0; v < n; v++) {
          if (v === source || result.dist[v] === Infinity) continue;
          const e = result.predEdge[v];
          expect(result.dist[graph.edgeFrom[e]] + graph.edgeWeight[e]).toBe(result.dist[v]);
        }
      }),
      RUNS,
    );
  });

  it('halves the allowed negativity every scaling round, down to −1', () => {
    const g = createGraph(4, [
      { from: 0, to: 1, weight: 5 },
      { from: 1, to: 2, weight: -7 },
      { from: 0, to: 2, weight: 1 },
      { from: 2, to: 3, weight: -2 },
    ]);
    const { info } = bnw(g, 0);
    expect(info.scaleFactor).toBe(8);
    const bounds = info.scalingRounds.map((r) => r.bound);
    expect(bounds.at(-1)).toBe(1);
    bounds.forEach((b, i) => i > 0 && expect(b).toBe(bounds[i - 1] / 2));
    info.scalingRounds.forEach((r) => expect(r.minEdge).toBeGreaterThanOrEqual(-r.bound));
  });

  it('rejects non-integer weights', () => {
    expect(() => bnw(createGraph(2, [{ from: 0, to: 1, weight: -0.5 }]), 0)).toThrow(RangeError);
  });
});
