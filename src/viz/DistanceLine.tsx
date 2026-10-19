import { vertexLabel, type Graph } from '../core/graph';
import type { VisualState } from '../core/trace';
import { formatDist } from './format';
import styles from './DistanceLine.module.css';

const WIDTH = 760;
const LEFT = 30;
const RIGHT = 30;
const AXIS_Y = 96;
const STACK = 24;

/**
 * A number line with every vertex placed at its current distance. Dijkstra's
 * settled vertices fill it from left to right, which is the "sorted order" point.
 */
export function DistanceLine({ graph, state, max }: { graph: Graph; state: VisualState; max: number }) {
  const scaleMax = max > 0 ? max : 1;
  const x = (d: number) => LEFT + (d / scaleMax) * (WIDTH - LEFT - RIGHT);

  // Vertices with a finite distance, stacked upwards when they would overlap.
  const placed: { v: number; x: number; level: number }[] = [];
  const vertices = [...state.dist.keys()]
    .filter((v) => Number.isFinite(state.dist[v]))
    .sort((a, b) => state.dist[a] - state.dist[b] || a - b);
  for (const v of vertices) {
    const px = x(state.dist[v]);
    let level = 0;
    while (placed.some((p) => p.level === level && Math.abs(p.x - px) < 26)) level++;
    placed.push({ v, x: px, level });
  }

  const lastSettled = state.settledOrder.at(-1);
  const sweep = lastSettled === undefined ? null : x(state.dist[lastSettled]);
  const ticks = niceTicks(scaleMax);
  const unreached = state.dist.filter((d) => !Number.isFinite(d)).length;

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${WIDTH} 130`}
        role="img"
        aria-label={`Distance line. Settled in order: ${state.settledOrder
          .map((v) => `${vertexLabel(graph, v)} at ${formatDist(state.dist[v])}`)
          .join(', ') || 'none yet'}.`}
      >
        {sweep !== null && (
          <g>
            <rect x={LEFT - 6} y={14} width={sweep - LEFT + 12} height={AXIS_Y - 14} className={styles.sweepArea} rx={6} />
            <line x1={sweep} x2={sweep} y1={10} y2={AXIS_Y} className={styles.sweep} />
          </g>
        )}
        <line x1={LEFT} x2={WIDTH - RIGHT} y1={AXIS_Y} y2={AXIS_Y} className={styles.axis} />
        {ticks.map((t) => (
          <g key={t} transform={`translate(${x(t)} ${AXIS_Y})`}>
            <line y1={0} y2={6} className={styles.axis} />
            <text y={22} className={styles.tick}>
              {t}
            </text>
          </g>
        ))}
        {placed.map(({ v, x: px, level }) => {
          const status = state.status[v];
          return (
            <g
              key={v}
              className={`${styles.marker} ${status === 'settled' ? styles.settled : styles.frontier}`}
              style={{ transform: `translate(${px}px, ${AXIS_Y - 14 - level * STACK}px)` }}
            >
              <circle r={10} />
              <text dy="0.35em">{vertexLabel(graph, v)}</text>
            </g>
          );
        })}
      </svg>
      <p className={styles.legend}>
        <span className={styles.keySettled}>●</span> settled (final) <span className={styles.keyFrontier}>○</span>{' '}
        tentative
        {unreached > 0 && <> · {unreached} still at ∞ (not shown)</>}
      </p>
    </div>
  );
}

function niceTicks(max: number): number[] {
  const rough = max / 6;
  const pow = 10 ** Math.floor(Math.log10(rough || 1));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? pow * 10;
  const ticks: number[] = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(Number(t.toFixed(6)));
  return ticks;
}
