import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bellmanFord } from '../src/core/algorithms/bellmanFord';
import { dijkstra } from '../src/core/algorithms/dijkstra';
import { hybrid } from '../src/core/algorithms/hybrid';
import { vertexLabel } from '../src/core/graph';
import { DIJKSTRA_INTRO } from '../src/core/presets';
import { recordTrace, TracePlayer } from '../src/core/trace';
import { computeStops, describeStep } from '../src/viz/steps';
import { graphCase } from './helpers/arbitraries';

function walk(graph: typeof DIJKSTRA_INTRO, source: number) {
  const { events } = recordTrace((emit) => dijkstra(graph, source, { emit }));
  const player = new TracePlayer(graph, events);
  const stops = computeStops(events);
  const captions = stops
    .slice(1)
    .map((stop, k) => describeStep(graph, events.slice(stops[k], stop), player.stateAt(stops[k])));
  return { events, player, stops, captions };
}

describe('chapter 1 preset', () => {
  it('settles in the documented order with the documented distances', () => {
    const result = dijkstra(DIJKSTRA_INTRO, 0);
    const { player, events } = walk(DIJKSTRA_INTRO, 0);
    const order = player.stateAt(events.length).settledOrder.map((v) => vertexLabel(DIJKSTRA_INTRO, v));
    expect(order).toEqual(['S', 'B', 'A', 'C', 'D', 'E', 'F', 'T']);
    expect(Array.from(result.dist)).toEqual([0, 3, 2, 8, 9, 11, 11, 14]);
  });

  it('captions every kind of step a reader will see', () => {
    const { captions } = walk(DIJKSTRA_INTRO, 0);
    expect(captions[0]).toBe('Start at S: its distance is 0, and every other vertex starts at ∞.');
    expect(captions).toContain('S has the smallest distance in the queue (0), so it is settled: that distance is now final.');
    expect(captions).toContain('Edge S → A: 0 + 4 = 4, so A gets a tentative distance of 4.');
    expect(captions).toContain("Edge B → A: 2 + 1 = 3 beats A's 4, so A's distance drops to 3.");
    expect(captions).toContain("Edge C → D: 8 + 1 = 9 is not shorter than D's 9, so nothing changes.");
    expect(captions).toContain('Edge D → A: A is already settled, so the edge is skipped.');
    expect(captions.at(-1)).toBe('Done: every reachable vertex is settled.');
    expect(captions.every((c) => c.length > 0)).toBe(true);
  });
});

describe('step highlights', () => {
  it('keep the relaxed edge highlighted at the end of a relax-and-queue step', () => {
    const { events, player, stops } = walk(DIJKSTRA_INTRO, 0);
    for (let k = 1; k < stops.length; k++) {
      const step = events.slice(stops[k - 1], stops[k]);
      const relax = step.find((e) => e.kind === 'relax');
      if (!relax || relax.kind !== 'relax') continue;
      const state = player.stateAt(stops[k]);
      expect(state.activeEdge).toBe(relax.edge);
      expect(state.activeEdgeImproved).toBe(relax.improved);
    }
  });
});

describe('negative-cycle captions', () => {
  it('never claim distances are final once a negative cycle is found', () => {
    fc.assert(
      fc.property(graphCase({ minWeight: -6 }), fc.constantFrom(bellmanFord, hybrid), ({ graph, source }, algorithm) => {
        const { events, result } = recordTrace((emit) => algorithm(graph, source, { emit }));
        if (result.kind !== 'negative-cycle') return;
        const stops = computeStops(events);
        const player = new TracePlayer(graph, events);
        const last = describeStep(graph, events.slice(stops.at(-2)!, stops.at(-1)), player.stateAt(stops.at(-2)!));
        expect(last).toContain('total weight');
        expect(last).not.toContain('final');
      }),
      { numRuns: 300 },
    );
  });
});

describe('computeStops', () => {
  it('is strictly increasing, starts at 0, ends at the last event, and gives every step a caption', () => {
    fc.assert(
      fc.property(graphCase({ minWeight: -4 }), fc.constantFrom(dijkstra, bellmanFord, hybrid), ({ graph, source }, algorithm) => {
        const { events } = recordTrace((emit) =>
          algorithm(graph, source, { emit }),
        );
        const stops = computeStops(events);
        expect(stops[0]).toBe(0);
        expect(stops.at(-1)).toBe(events.length);
        for (let k = 1; k < stops.length; k++) expect(stops[k]).toBeGreaterThan(stops[k - 1]);

        const player = new TracePlayer(graph, events);
        for (let k = 1; k < stops.length; k++) {
          const caption = describeStep(graph, events.slice(stops[k - 1], stops[k]), player.stateAt(stops[k - 1]));
          expect(caption.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 300 },
    );
  });
});
