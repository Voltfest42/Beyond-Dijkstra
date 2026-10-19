import { describe, expect, it } from 'vitest';
import { raceOnce, timePerRun, timerResolution, type Clock } from '../src/bench/race';

/** A clock that rounds down like a browser's coarsened performance.now(). */
const coarse = (resolution: number): Clock => () => Math.floor(performance.now() / resolution) * resolution;

describe('race timing', () => {
  it('detects how coarse the clock is', () => {
    expect(timerResolution(coarse(1))).toBe(1);
    expect(timerResolution(coarse(0.1))).toBeCloseTo(0.1, 5);
  });

  it('never reports a fast run as taking 0 ms, even with a 1 ms clock', () => {
    const t = timePerRun(() => Math.sqrt(2), 5, coarse(1));
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(0.01);
  });

  // Regression: with a 1 ms clock, Dijkstra on 1,000 vertices used to read as 0 ms,
  // and the page showed the new algorithm as ~1,000,000× slower.
  it.each([0.001, 0.1, 1, 16])('gives sensible slowdown ratios with a %s ms clock', (resolution) => {
    for (const n of [1_000, 3_000]) {
      const r = raceOnce(n, { now: coarse(resolution), resolution });
      expect(r.agree).toBe(true);
      expect(r.dijkstraMs).toBeGreaterThan(0);
      const ratio = r.bmsspMs / r.dijkstraMs;
      expect(ratio, `n = ${n}`).toBeGreaterThan(1.5);
      expect(ratio, `n = ${n}`).toBeLessThan(60);
    }
  }, 30_000);
});
