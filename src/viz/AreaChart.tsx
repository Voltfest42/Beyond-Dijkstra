import { useRef, useState, type PointerEvent } from 'react';
import { compactNumber as compact } from './format';
import styles from './AreaChart.module.css';

export interface ChartPoint {
  x: number;
  y: number;
}

interface AreaChartProps {
  points: readonly ChartPoint[];
  /** What the chart shows, for screen readers and the title-less case. */
  ariaLabel: string;
  xLabel: string;
  yLabel: string;
  /** Tooltip text for the point nearest the pointer. */
  describe: (point: ChartPoint) => string;
}

const W = 720;
const H = 240;
const PAD = { left: 52, right: 16, top: 14, bottom: 40 };

/** One series as a 2px line over a faint wash, with a crosshair tooltip. */
export function AreaChart({ points, ariaLabel, xLabel, yLabel, describe }: AreaChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) return null;

  const xMax = points[points.length - 1].x || 1;
  const yMax = niceMax(Math.max(...points.map((p) => p.y)));
  const sx = (x: number) => PAD.left + (x / xMax) * (W - PAD.left - PAD.right);
  const sy = (y: number) => H - PAD.bottom - (y / yMax) * (H - PAD.top - PAD.bottom);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const area = `${line} L${sx(xMax).toFixed(1)},${sy(0)} L${sx(points[0].x).toFixed(1)},${sy(0)} Z`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * xMax));

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const target = ((x - PAD.left) / (W - PAD.left - PAD.right)) * xMax;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(points[i].x - target) < Math.abs(points[best].x - target)) best = i;
    setHover(best);
  };

  const hovered = hover === null ? null : points[hover];
  const tipLeft = hovered ? (sx(hovered.x) / W) * 100 : 0;

  return (
    <div className={styles.wrap}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} className={styles.grid} />
            <text x={PAD.left - 8} y={sy(t)} dy="0.32em" className={styles.yTick}>
              {compact(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} x={sx(t)} y={H - PAD.bottom + 18} className={styles.xTick}>
            {compact(t)}
          </text>
        ))}
        <text x={(PAD.left + W - PAD.right) / 2} y={H - 4} className={styles.axisLabel}>
          {xLabel}
        </text>
        <text transform={`translate(12 ${(PAD.top + H - PAD.bottom) / 2}) rotate(-90)`} className={styles.axisLabel}>
          {yLabel}
        </text>
        <path d={area} className={styles.area} />
        <path d={line} className={styles.line} />
        {hovered && (
          <g>
            <line x1={sx(hovered.x)} x2={sx(hovered.x)} y1={PAD.top} y2={H - PAD.bottom} className={styles.crosshair} />
            <circle cx={sx(hovered.x)} cy={sy(hovered.y)} r={5} className={styles.dot} />
          </g>
        )}
      </svg>
      {hovered && (
        <div className={styles.tooltip} style={{ left: `${Math.min(Math.max(tipLeft, 18), 82)}%` }} role="status">
          {describe(hovered)}
        </div>
      )}
    </div>
  );
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= v) ?? 10 * pow);
}
