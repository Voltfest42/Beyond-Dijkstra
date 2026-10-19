// Records the reference race results shown next to the reader's own run.
// Usage: npx tsx scripts/record-race.ts
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { RACE_SIZES, raceOnce, timerResolution } from '../src/bench/race.ts';

const resolution = timerResolution();
raceOnce(1_000, { resolution });
const results = [];
for (const n of RACE_SIZES) {
  const r = raceOnce(n, { resolution });
  console.log(
    `n=${n}: Dijkstra ${r.dijkstraMs.toFixed(1)} ms, new ${r.bmsspMs.toFixed(1)} ms (×${(r.bmsspMs / r.dijkstraMs).toFixed(1)}), agree=${r.agree}`,
  );
  results.push(r);
}
const machine = `${cpus()[0]?.model.trim() ?? 'unknown CPU'}, Node.js ${process.versions.node}`;
writeFileSync(
  new URL('../src/bench/reference.json', import.meta.url),
  JSON.stringify({ machine, recorded: new Date().toISOString().slice(0, 10), results }, null, 2) + '\n',
);
console.log(`Saved (${machine})`);
