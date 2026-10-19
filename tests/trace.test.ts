import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bellmanFord } from '../src/core/algorithms/bellmanFord';
import { dijkstra } from '../src/core/algorithms/dijkstra';
import { createGraph } from '../src/core/graph';
import { applyEvent, initialState, recordTrace, TracePlayer, type VisualState } from '../src/core/trace';
import { graphCase } from './helpers/arbitraries';

const comparable = (s: VisualState) => ({ ...s, queue: [...s.queue].sort((a, b) => a[0] - b[0]) });

describe('trace replay', () => {
  it('rebuilds Dijkstra’s final distances, tree and settle order from its events', () => {
    fc.assert(
      fc.property(graphCase({ minWeight: 0 }), ({ graph, source }) => {
        const { events, result } = recordTrace((emit) => dijkstra(graph, source, { emit }));
        const end = new TracePlayer(graph, events).stateAt(events.length);
        expect(end.dist).toEqual(Array.from(result.dist));
        expect(end.predEdge).toEqual(Array.from(result.predEdge));
        expect(end.queue.size).toBe(0);
        expect(end.done).toBe(true);
        // Settled exactly the reachable vertices, in non-decreasing distance order.
        const reachable = result.dist.reduce((count, d) => count + (d < Infinity ? 1 : 0), 0);
        expect(end.settledOrder.length).toBe(reachable);
        const ds = end.settledOrder.map((v) => result.dist[v]);
        expect(ds).toEqual([...ds].sort((a, b) => a - b));
      }),
      { numRuns: 500 },
    );
  });

  it('rebuilds Bellman–Ford’s distances or its negative cycle', () => {
    fc.assert(
      fc.property(graphCase({ minWeight: -6 }), ({ graph, source }) => {
        const { events, result } = recordTrace((emit) => bellmanFord(graph, source, { emit }));
        const end = new TracePlayer(graph, events).stateAt(events.length);
        if (result.kind === 'paths') expect(end.dist).toEqual(Array.from(result.dist));
        else expect(end.negativeCycle).toEqual(result.cycle);
      }),
      { numRuns: 500 },
    );
  });

  it('gives the same state at every step whether reached by snapshot or by replaying from the start', () => {
    fc.assert(
      fc.property(graphCase({ minWeight: -3 }), ({ graph, source }) => {
        const { events } = recordTrace((emit) => bellmanFord(graph, source, { emit }));
        const player = new TracePlayer(graph, events, 3);
        const state = initialState(graph.n);
        for (let i = 0; i <= events.length; i++) {
          expect(comparable(player.stateAt(i))).toEqual(comparable(state));
          if (i < events.length) applyEvent(state, events[i]);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('flags the shorter route Dijkstra ignores on the textbook counterexample', () => {
    const g = createGraph(4, [
      { from: 0, to: 1, weight: 2 },
      { from: 0, to: 2, weight: 5 },
      { from: 2, to: 1, weight: -4 },
      { from: 1, to: 3, weight: 1 },
    ]);
    const { events } = recordTrace((emit) => dijkstra(g, 0, { emit }));
    const player = new TracePlayer(g, events);
    const flagged = new Set(
      Array.from({ length: events.length + 1 }, (_, i) => player.stateAt(i).ignoredImprovement)
        .filter(Boolean)
        .map((x) => JSON.stringify(x)),
    );
    expect([...flagged]).toEqual([JSON.stringify({ edge: 2, candidate: 1 })]);
  });
});
