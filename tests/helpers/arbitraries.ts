import fc from 'fast-check';
import { createGraph, type EdgeSpec, type Graph } from '../../src/core/graph';

export interface GraphCase {
  n: number;
  edges: EdgeSpec[];
  source: number;
  graph: Graph;
}

/**
 * Random small graphs, deliberately including self-loops, parallel edges,
 * unreachable parts and (when minWeight < 0) negative cycles.
 */
export function graphCase({
  maxN = 9,
  maxM = 30,
  minWeight = 0,
  maxWeight = 10,
}: { maxN?: number; maxM?: number; minWeight?: number; maxWeight?: number } = {}): fc.Arbitrary<GraphCase> {
  return fc.integer({ min: 1, max: maxN }).chain((n) =>
    fc
      .record({
        edges: fc.array(
          fc.record({
            from: fc.nat(n - 1),
            to: fc.nat(n - 1),
            weight: fc.integer({ min: minWeight, max: maxWeight }),
          }),
          { maxLength: maxM },
        ),
        source: fc.nat(n - 1),
      })
      .map(({ edges, source }) => ({ n, edges, source, graph: createGraph(n, edges) })),
  );
}
