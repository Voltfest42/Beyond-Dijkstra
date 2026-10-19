import { useRef, useState, type PointerEvent } from 'react';
import { compactNumber } from './format';
import styles from './LineChart.module.css';

export interface Series {
  name: string;
  /** CSS colour, e.g. 'var(--series-1)'. */
  color: string;
  dashed?: boolean;
  points: readonly { x: number; y: number }[];
}

interface LineChartProps {
  series: readonly Series[];
  ariaLabel: string;
  xLabel: string;
  yLabel: string;
  /** A horizontal reference line, e.g. break-even at y = 1. */
  reference?: { y: number; label: string };
  formatY: (y: number) => string;
  formatX?: (x: number) => string;
}

const W = 720;
const H = 260;
const PAD = { left: 52, right: 110, top: 16, bottom: 42 };

/**
 * Several series over a logarithmic x axis, with direct end labels, a legend,
 * and a crosshair tooltip that lists every series at the nearest x.
 */
export function LineChart({ series, ariaLabel, xLabel, yLabel, reference, formatY, formatX = compactNumber }: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b);
  if (xs.length === 0) return null;

  const xMin = Math.log10(xs[0]);
  const xMax = Math.log10(xs[xs.length - 1]);
  const yMax = niceMax(Math.max(reference?.y ?? 0, ...series.flatMap((s) => s.points.map((p) => p.y))));
  const sx = (x: number) =>
    PAD.left + (xMax === xMin ? 0.5 : (Math.log10(x) - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right);
  const sy = (y: number) => H - PAD.bottom - (y / yMax) * (H - PAD.top - PAD.bottom);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * W;
    setHoverX(xs.reduce((best, v) => (Math.abs(sx(v) - x) < Math.abs(sx(best) - x) ? v : best), xs[0]));
  };

  return (
    <div className={styles.wrap}>
      <ul className={styles.legend} aria-label="Legend">
        {series.map((s) => (
          <li key={s.name}>
            <svg width="22" height="10" aria-hidden="true">
              <line x1="1" x2="21" y1="5" y2="5" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? '4 3' : undefined} />
            </svg>
            {s.name}
          </li>
        ))}
      </ul>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={onMove}
        onPointerLeave={() => setHoverX(null)}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} className={styles.grid} />
            <text x={PAD.left - 8} y={sy(t)} dy="0.32em" className={styles.yTick}>
              {formatY(t)}
            </text>
          </g>
        ))}
        {xs.map((x) => (
          <text key={x} x={sx(x)} y={H - PAD.bottom + 18} className={styles.xTick}>
            {formatX(x)}
          </text>
        ))}
        <text x={(PAD.left + W - PAD.right) / 2} y={H - 4} className={styles.axisLabel}>
          {xLabel}
        </text>
        <text transform={`translate(12 ${(PAD.top + H - PAD.bottom) / 2}) rotate(-90)`} className={styles.axisLabel}>
          {yLabel}
        </text>
        {reference && (
          <g>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(reference.y)} y2={sy(reference.y)} className={styles.reference} />
            <text x={W - PAD.right + 6} y={sy(reference.y)} dy="0.32em" className={styles.referenceLabel}>
              {reference.label}
            </text>
          </g>
        )}
        {hoverX !== null && <line x1={sx(hoverX)} x2={sx(hoverX)} y1={PAD.top} y2={H - PAD.bottom} className={styles.crosshair} />}
        {series.map((s) => {
          if (s.points.length === 0) return null;
          const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
          const last = s.points[s.points.length - 1];
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '6 4' : undefined} />
              {s.points.map((p) => (
                <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={p.x === hoverX ? 5.5 : 4} fill={s.color} className={styles.dot} />
              ))}
              <text x={sx(last.x) + 10} y={sy(last.y)} dy="0.32em" className={styles.endLabel}>
                {formatY(last.y)}
              </text>
            </g>
          );
        })}
      </svg>
      {hoverX !== null && (
        <div className={styles.tooltip} style={{ left: `${Math.min(Math.max((sx(hoverX) / W) * 100, 15), 80)}%` }} role="status">
          <div className={styles.tipTitle}>{formatX(hoverX)} vertices</div>
          {series.map((s) => {
            const p = s.points.find((q) => q.x === hoverX);
            return p ? (
              <div key={s.name} className={styles.tipRow}>
                <svg width="14" height="8" aria-hidden="true">
                  <line x1="0" x2="14" y1="4" y2="4" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? '3 2' : undefined} />
                </svg>
                <b>{formatY(p.y)}</b> {s.name}
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= v) ?? 10 * pow;
}
