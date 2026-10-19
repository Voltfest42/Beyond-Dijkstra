import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createGraph, fromJson, toJson } from '../src/core/graph';
import { randomGraph } from '../src/core/generators';
import { graphCase } from './helpers/arbitraries';

describe('createGraph', () => {
  it('lists each vertex’s outgoing and incoming edges in id order', () => {
    fc.assert(
      fc.property(graphCase({ minWeight: -5 }), ({ n, edges, graph }) => {
        for (let v = 0; v < n; v++) {
          const out = Array.from(graph.outEdges.subarray(graph.outStart[v], graph.outStart[v + 1]));
          const inc = Array.from(graph.inEdges.subarray(graph.inStart[v], graph.inStart[v + 1]));
          expect(out).toEqual(edges.flatMap((e, id) => (e.from === v ? [id] : [])));
          expect(inc).toEqual(edges.flatMap((e, id) => (e.to === v ? [id] : [])));
        }
      }),
    );
  });

  it('rejects edges to missing vertices and non-finite weights', () => {
    expect(() => createGraph(2, [{ from: 0, to: 2, weight: 1 }])).toThrow(RangeError);
    expect(() => createGraph(2, [{ from: 0, to: 1, weight: Infinity }])).toThrow(RangeError);
    expect(() => createGraph(2, [{ from: 0.5, to: 1, weight: 1 }])).toThrow(RangeError);
  });

  it('round-trips through JSON', () => {
    const g = createGraph(3, [{ from: 0, to: 1, weight: -2.5 }], {
      labels: ['s', 'a', 'b'],
      positions: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 1 },
      ],
    });
    expect(toJson(fromJson(JSON.parse(JSON.stringify(toJson(g)))))).toEqual(toJson(g));
  });
});

describe('randomGraph', () => {
  it('is deterministic per seed, has no self-loops or parallel edges, and reaches everything', () => {
    const a = randomGraph({ n: 50, m: 150, seed: 7, reachableFrom: 0 });
    const b = randomGraph({ n: 50, m: 150, seed: 7, reachableFrom: 0 });
    expect(toJson(a)).toEqual(toJson(b));
    expect(a.m).toBe(150);

    const pairs = new Set<string>();
    for (let e = 0; e < a.m; e++) {
      expect(a.edgeFrom[e]).not.toBe(a.edgeTo[e]);
      pairs.add(`${a.edgeFrom[e]}-${a.edgeTo[e]}`);
    }
    expect(pairs.size).toBe(a.m);

    const seen = new Set([0]);
    const stack = [0];
    while (stack.length) {
      const u = stack.pop()!;
      for (let i = a.outStart[u]; i < a.outStart[u + 1]; i++) {
        const v = a.edgeTo[a.outEdges[i]];
        if (!seen.has(v)) {
          seen.add(v);
          stack.push(v);
        }
      }
    }
    expect(seen.size).toBe(50);
  });
});
