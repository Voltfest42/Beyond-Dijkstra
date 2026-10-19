import { useMemo, useState, type ReactNode } from 'react';
import { dijkstra, frontierProfile } from '../core/algorithms/dijkstra';
import { createGraph, vertexLabel, type Graph } from '../core/graph';
import { gridGraph, randomGraph, seededRandom } from '../core/generators';
import { ErrorBoundary } from '../site/ErrorBoundary';
import { AreaChart, type ChartPoint } from '../viz/AreaChart';
import { Figure } from '../viz/Figure';
import { compactNumber, formatDist } from '../viz/format';
import { StatsPanel } from '../viz/StatsPanel';
import { RunFigure } from './RunFigure';
import styles from './figures.module.css';

/* ---------------- 3.1: Dijkstra sorts ---------------- */

const MAX_NUMBERS = 10;

function parseNumbers(text: string): { values: number[] } | { error: string } {
  const parts = text.split(/[\s,;]+/).filter(Boolean);
  if (parts.length < 2) return { error: 'Type at least two numbers.' };
  if (parts.length > MAX_NUMBERS) return { error: `Up to ${MAX_NUMBERS} numbers, so they fit on screen.` };
  const values = parts.map(Number);
  if (values.some((v) => !Number.isFinite(v) || v < 0 || v > 999)) {
    return { error: 'Use numbers from 0 to 999 (edge weights here must not be negative).' };
  }
  return { values };
}

/** A source in the middle with one edge to each leaf, weighted by the numbers to sort. */
function starGraph(values: readonly number[]): Graph {
  const cx = 300;
  const cy = 210;
  const r = 175;
  const labels = ['s', ...values.map((_, i) => String.fromCharCode(65 + i))];
  const positions = [
    { x: cx, y: cy },
    ...values.map((_, i) => {
      const angle = (2 * Math.PI * i) / values.length - Math.PI / 2;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    }),
  ];
  return createGraph(
    values.length + 1,
    values.map((weight, i) => ({ from: 0, to: i + 1, weight })),
    { labels, positions },
  );
}

function randomNumbers(seed: number): string {
  const random = seededRandom(seed);
  return Array.from({ length: 7 }, () => Math.floor(random() * 99) + 1).join(', ');
}

export function SortingFigure({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  const [text, setText] = useState('42, 7, 19, 3, 88, 25, 61');
  const [seed, setSeed] = useState(1);
  const parsed = useMemo(() => parseNumbers(text), [text]);
  // Keep showing the last valid graph while the reader is mid-edit.
  const [lastGood, setLastGood] = useState<number[]>([42, 7, 19, 3, 88, 25, 61]);
  if ('values' in parsed && parsed.values.join() !== lastGood.join()) setLastGood(parsed.values);
  const graph = useMemo(() => starGraph(lastGood), [lastGood]);

  return (
    <RunFigure
      number={number}
      title="Sorting numbers with Dijkstra"
      tryThis={tryThis}
      graph={graph}
      algorithm={dijkstra}
      showQueue
      showDistanceLine
      legend={['unvisited', 'frontier', 'settled', 'current']}
      toolbar={
        <>
          <label className={styles.inputLabel}>
            Numbers to sort:
            <input
              className={styles.textInput}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={'error' in parsed}
              spellCheck={false}
            />
          </label>
          <button
            type="button"
            className={styles.toolButton}
            onClick={() => {
              setSeed((s) => s + 1);
              setText(randomNumbers(seed + 1));
            }}
          >
            Random numbers 🎲
          </button>
          {'error' in parsed && (
            <span className={styles.bad} role="alert">
              {parsed.error}
            </span>
          )}
        </>
      }
      summary={({ state }) => {
        const order = state.settledOrder.filter((v) => v !== 0);
        return (
          <p>
            Dijkstra settled the leaves in the order{' '}
            <b>{order.map((v) => formatDist(state.dist[v])).join(', ')}</b>: your numbers, sorted. Any algorithm
            that finishes vertices in order of distance can sort, so it can be no faster than sorting.
          </p>
        );
      }}
    />
  );
}

/* ---------------- 3.3: the frontier ---------------- */

const SIZES = [1_000, 10_000, 100_000] as const;
type Size = (typeof SIZES)[number];
type Kind = 'grid' | 'random';

function buildGraph(kind: Kind, n: Size): Graph {
  if (kind === 'grid') {
    const side = Math.round(Math.sqrt(n));
    return gridGraph({ rows: side, cols: side, seed: 7 });
  }
  return randomGraph({ n, m: 3 * n, minWeight: 1, maxWeight: 100, seed: 7, reachableFrom: 0 });
}

/** Peak queue size per bucket, so a 100,000-point profile still shows its spikes. */
function downsample(sizes: Int32Array, buckets = 300): ChartPoint[] {
  const per = Math.max(1, Math.ceil(sizes.length / buckets));
  const points: ChartPoint[] = [{ x: 0, y: 0 }];
  for (let start = 0; start < sizes.length; start += per) {
    let peak = 0;
    const end = Math.min(sizes.length, start + per);
    for (let i = start; i < end; i++) peak = Math.max(peak, sizes[i]);
    points.push({ x: end, y: peak });
  }
  return points;
}

export function FrontierFigure({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  return (
    <ErrorBoundary what={`Figure ${number}`}>
      <FrontierInner number={number} tryThis={tryThis} />
    </ErrorBoundary>
  );
}

function FrontierInner({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  const [kind, setKind] = useState<Kind>('grid');
  const [size, setSize] = useState<Size>(10_000);
  const run = useMemo(() => {
    const g = buildGraph(kind, size);
    const profile = frontierProfile(g, 0);
    let peak = 0;
    for (const s of profile.sizes) peak = Math.max(peak, s);
    return { g, profile, peak, points: downsample(profile.sizes) };
  }, [kind, size]);
  const perVertex = run.profile.comparisons / run.profile.settled;

  return (
    <Figure number={number} title="How many vertices wait in Dijkstra's queue" tryThis={tryThis}>
      <div className={styles.toolbar}>
        <span className={styles.segmented} role="group" aria-label="Kind of graph">
          {(['grid', 'random'] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k === 'grid' ? 'Game-map grid' : 'Random sparse graph'}
            </button>
          ))}
        </span>
        <span className={styles.segmented} role="group" aria-label="Number of vertices">
          {SIZES.map((s) => (
            <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)}>
              {compactNumber(s)} vertices
            </button>
          ))}
        </span>
      </div>

      <div className={styles.withSide}>
        <AreaChart
          points={run.points}
          ariaLabel={`Queue size while Dijkstra settles ${run.profile.settled} vertices: it peaks at ${run.peak}.`}
          xLabel="vertices settled so far"
          yLabel="vertices waiting in the queue"
          describe={(p) => `after ${p.x.toLocaleString('en')} settled: up to ${p.y.toLocaleString('en')} waiting`}
        />
        <div className={styles.side}>
          <StatsPanel
            title="This run"
            items={[
              { label: 'Vertices / edges', value: `${compactNumber(run.g.n)} / ${compactNumber(run.g.m)}` },
              { label: 'Most ever waiting', value: run.peak.toLocaleString('en') },
              { label: 'Heap comparisons', value: run.profile.comparisons.toLocaleString('en') },
              { label: 'Comparisons per vertex', value: perVertex.toFixed(1) },
              { label: 'log₂ n', value: Math.log2(run.g.n).toFixed(1) },
            ]}
          />
        </div>
      </div>
      <p className={styles.note}>
        Measured live in your browser, starting from vertex {vertexLabel(run.g, 0)}. The chart shows the largest queue
        size within each slice of the run.
      </p>
    </Figure>
  );
}
