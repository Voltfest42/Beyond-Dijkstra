import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BlockList, bmssp, labelLess, paperParams, topLevel, type Label } from '../src/core/algorithms/bmssp';
import { dijkstra } from '../src/core/algorithms/dijkstra';
import { createGraph } from '../src/core/graph';
import { randomGraph } from '../src/core/generators';
import { recordTrace, type TraceEvent } from '../src/core/trace';
import { graphCase } from './helpers/arbitraries';

const params = fc.record({ k: fc.integer({ min: 1, max: 4 }), t: fc.integer({ min: 1, max: 3 }) });

describe('BlockList (the partial-sorting structure)', () => {
  // Distinct labels: (d, 0, v) with small integer d forces plenty of distance ties.
  const lab = (d: number, v: number): Label => ({ d, h: 0, v });

  it('pulls exactly the M smallest, with a bound that separates them from the rest', () => {
    const op = fc.oneof(
      fc.record({ kind: fc.constant('insert' as const), v: fc.nat(30), d: fc.integer({ min: 5, max: 40 }) }),
      fc.record({ kind: fc.constant('prepend' as const), items: fc.array(fc.record({ v: fc.nat(30), d: fc.nat(4) }), { maxLength: 8 }) }),
      fc.record({ kind: fc.constant('pull' as const) }),
    );
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), fc.array(op, { maxLength: 60 }), (M, ops) => {
        const B = lab(100, 0);
        const D = new BlockList(M, B);
        const model = new Map<number, Label>();
        let floor = 5; // prepends must stay below everything in D
        for (const o of ops) {
          if (o.kind === 'insert') {
            const l = lab(o.d, o.v);
            D.insert(o.v, l);
            const cur = model.get(o.v);
            if (!cur || labelLess(l, cur)) model.set(o.v, l);
          } else if (o.kind === 'prepend') {
            const min = Math.min(floor, ...[...model.values()].map((l) => l.d));
            const items = o.items.map(({ v, d }) => ({ v, label: lab(min - 5 - d, v) }));
            D.batchPrepend(items);
            for (const { v, label } of items) {
              const cur = model.get(v);
              if (!cur || labelLess(label, cur)) model.set(v, label);
            }
            floor = Math.min(floor, ...items.map((i) => i.label.d));
          } else {
            const sorted = [...model].sort((a, b) => (labelLess(a[1], b[1]) ? -1 : 1));
            const { sources, bound } = D.pull();
            const expected = sorted.slice(0, M).map(([v]) => v);
            expect([...sources].sort((a, b) => a - b)).toEqual([...expected].sort((a, b) => a - b));
            for (const v of sources) {
              expect(labelLess(model.get(v)!, bound)).toBe(true);
              model.delete(v);
            }
            if (model.size === 0) expect(bound).toBe(B);
            for (const l of model.values()) expect(labelLess(l, bound)).toBe(false);
          }
          expect(D.size).toBe(model.size);
        }
      }),
      { numRuns: 1000 },
    );
  });
});

describe('BMSSP (the 2025 algorithm)', () => {
  it('matches Dijkstra on random graphs with many ties, for any k and t', () => {
    fc.assert(
      fc.property(graphCase({ maxN: 14, maxM: 40, minWeight: 0, maxWeight: 3 }), params, ({ graph, source }, p) => {
        const expected = dijkstra(graph, source);
        const result = bmssp(graph, source, { params: p });
        expect(Array.from(result.dist)).toEqual(Array.from(expected.dist));
        for (let v = 0; v < graph.n; v++) {
          if (v === source || result.dist[v] === Infinity) continue;
          const e = result.predEdge[v];
          expect(graph.edgeTo[e]).toBe(v);
          expect(result.dist[graph.edgeFrom[e]] + graph.edgeWeight[e]).toBe(result.dist[v]);
        }
      }),
      { numRuns: 3000 },
    );
  });

  it('matches Dijkstra with real-valued weights and the paper’s own parameters', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = randomGraph({ n: 300, m: 1200, minWeight: 0, maxWeight: 10, integer: false, seed, reachableFrom: 0 });
      expect(Array.from(bmssp(g, 0).dist)).toEqual(Array.from(dijkstra(g, 0).dist));
    }
  });

  it('keeps the paper’s promises inside every call', () => {
    fc.assert(
      fc.property(graphCase({ maxN: 14, maxM: 40, minWeight: 0, maxWeight: 3 }), params, ({ graph, source }, p) => {
        const truth = dijkstra(graph, source).dist;
        const { events } = recordTrace((emit) => bmssp(graph, source, { params: p, emit }));
        const stack: Extract<TraceEvent, { kind: 'call' }>[] = [];
        const seen = new Set<number>();
        for (const e of events) {
          if (e.kind === 'call') {
            stack.push(e);
            if (e.level === 0) expect(e.sources.length).toBe(1);
          } else if (e.kind === 'pivots') {
            // Lemma 3.2: at most |W| / k pivots.
            expect(e.pivots.length * p.k).toBeLessThanOrEqual(e.work.length);
          } else if (e.kind === 'return') {
            const call = stack.pop()!;
            expect(e.bound).toBeLessThanOrEqual(call.bound);
            for (const v of e.completed) {
              // Everything a call returns is final, and is never returned twice at the same level.
              expect(truth[v]).toBeLessThanOrEqual(e.bound);
              seen.add(v);
            }
          }
        }
        expect(stack.length).toBe(0);
        const reachable = Array.from(truth).filter((d) => d < Infinity).length;
        expect(seen.size).toBe(reachable);
      }),
      { numRuns: 1500 },
    );
  });

  it('uses the paper’s parameter formulas', () => {
    expect(paperParams(1_000_000)).toEqual({ k: 2, t: 7 });
    expect(topLevel(1_000_000, 7)).toBe(3);
    expect(paperParams(20)).toEqual({ k: 1, t: 2 });
  });

  it('rejects negative weights', () => {
    expect(() => bmssp(createGraph(2, [{ from: 0, to: 1, weight: -1 }]), 0)).toThrow(RangeError);
  });
});
