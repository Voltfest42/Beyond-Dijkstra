import { describe, expect, it } from 'vitest';
import { bellmanFord } from '../src/core/algorithms/bellmanFord';
import { dijkstra } from '../src/core/algorithms/dijkstra';
import { hybrid } from '../src/core/algorithms/hybrid';
import { johnsonPotential, reweightedWeights } from '../src/core/algorithms/johnson';
import { reweighted } from '../src/core/graph';
import { DIJKSTRA_TRAP, GOLD_FARM, NEGATIVE_STAIRCASE, POTENTIALS_PUZZLE, TRAP_LOOP_EDGE } from '../src/core/presets';
import { cycleWeight } from '../src/core/sssp';

/** The chapter text quotes these numbers, so pin them down. */
describe('chapter 2 presets', () => {
  it('gold farm: the Town → Forest → Cave loop is a negative cycle', () => {
    const result = bellmanFord(GOLD_FARM, 0);
    expect(result.kind).toBe('negative-cycle');
    if (result.kind === 'negative-cycle') expect(cycleWeight(GOLD_FARM, result.cycle)).toBe(-1);
  });

  it('trap: Dijkstra answers A 2, C 3, D 5 but the truth is A 1, C 2, D 4', () => {
    expect(Array.from(dijkstra(DIJKSTRA_TRAP, 0).dist)).toEqual([0, 2, 5, 3, 5]);
    const truth = bellmanFord(DIJKSTRA_TRAP, 0);
    expect(truth.kind === 'paths' && Array.from(truth.dist)).toEqual([0, 1, 5, 2, 4]);
  });

  it('trap: making C → B cheaper than 3 creates a negative cycle', () => {
    for (const [w, cycle] of [
      [3, false],
      [2, true],
    ] as const) {
      const g = reweighted(DIJKSTRA_TRAP, (e) => (e === TRAP_LOOP_EDGE ? w : DIJKSTRA_TRAP.edgeWeight[e]));
      expect(bellmanFord(g, 0).kind === 'negative-cycle').toBe(cycle);
    }
  });

  it('puzzle: shortest S → T is 0, and Johnson’s potential solves it', () => {
    const truth = bellmanFord(POTENTIALS_PUZZLE, 0);
    expect(truth.kind === 'paths' && truth.dist[4]).toBe(0);
    const phi = johnsonPotential(POTENTIALS_PUZZLE)!;
    expect(Math.min(...reweightedWeights(POTENTIALS_PUZZLE, phi))).toBe(0);
  });

  it('staircase: the hybrid needs 6 rounds, the trap only 2', () => {
    expect(hybrid(NEGATIVE_STAIRCASE, 0).rounds).toBe(6);
    expect(hybrid(DIJKSTRA_TRAP, 0).rounds).toBe(2);
    let bellmanFordRounds = 0;
    const truth = bellmanFord(NEGATIVE_STAIRCASE, 0, { emit: (e) => void (e.kind === 'round' && bellmanFordRounds++) });
    expect(truth.kind === 'paths' && Array.from(truth.dist)).toEqual([0, 6, 5, 4, 3, 2, 1]);
    // All n − 1 = 6 rounds plus the final check: the comparison in Figure 2.5 relies on this.
    expect(bellmanFordRounds).toBe(7);
  });
});
