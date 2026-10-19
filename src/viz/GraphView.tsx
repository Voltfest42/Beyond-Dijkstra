import { useMemo } from 'react';
import { vertexLabel, type Graph, type VertexId } from '../core/graph';
import type { VisualState } from '../core/trace';
import { formatDist, formatWeight } from './format';
import { circleLayout, layoutEdges, NODE_RADIUS, viewBoxFor } from './geometry';
import styles from './GraphView.module.css';

interface GraphViewProps {
  graph: Graph;
  state: VisualState;
  source?: VertexId;
  /** When given, vertices whose final distance is wrong get a "should be X" badge. */
  truthDist?: readonly number[];
  /** Makes vertices clickable (e.g. "start from here"). */
  onVertexClick?: (v: VertexId) => void;
  vertexActionLabel?: (v: VertexId) => string;
  ariaLabel: string;
}

export function GraphView({ graph, state, source, truthDist, onVertexClick, vertexActionLabel, ariaLabel }: GraphViewProps) {
  const positions = useMemo(() => graph.positions ?? circleLayout(graph.n), [graph]);
  const edges = useMemo(() => layoutEdges(graph, positions), [graph, positions]);
  const viewBox = useMemo(() => viewBoxFor(positions), [positions]);

  const treeEdges = new Set(state.predEdge.filter((e) => e >= 0));
  const cycleEdges = new Set(state.negativeCycle ?? []);

  return (
    <svg className={styles.svg} viewBox={viewBox} role="img" aria-label={ariaLabel}>
      <g>
        {edges.map((geo, e) => {
          const negative = graph.edgeWeight[e] < 0;
          const classes = [styles.edge];
          if (negative) classes.push(styles.negative);
          if (treeEdges.has(e)) classes.push(styles.tree);
          if (cycleEdges.has(e)) classes.push(styles.cycle);
          if (state.activeEdge === e) {
            classes.push(state.ignoredImprovement ? styles.ignored : state.activeEdgeImproved ? styles.improved : styles.checked);
          }
          return (
            <g key={e} className={classes.join(' ')}>
              <path d={geo.path} className={styles.edgeLine} />
              <polygon points={geo.arrow} className={styles.arrow} />
              <g transform={`translate(${geo.label.x.toFixed(1)} ${geo.label.y.toFixed(1)})`}>
                <rect x={-17} y={-12} width={34} height={24} rx={7} className={styles.weightBg} />
                <text className={styles.weight} dy="0.35em">
                  {formatWeight(graph.edgeWeight[e])}
                </text>
              </g>
            </g>
          );
        })}
      </g>

      <g>
        {positions.map((p, v) => {
          const status = state.status[v];
          const label = vertexLabel(graph, v);
          const dist = state.dist[v];
          const wrong =
            state.done && truthDist !== undefined && truthDist[v] !== dist && Number.isFinite(truthDist[v])
              ? truthDist[v]
              : null;
          const classes = [styles.vertex, styles[status]];
          if (state.current === v) classes.push(styles.current);
          if (onVertexClick) classes.push(styles.clickable);

          return (
            <g
              key={v}
              className={classes.join(' ')}
              transform={`translate(${p.x} ${p.y})`}
              onClick={onVertexClick ? () => onVertexClick(v) : undefined}
              onKeyDown={
                onVertexClick
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onVertexClick(v);
                      }
                    }
                  : undefined
              }
              role={onVertexClick ? 'button' : undefined}
              tabIndex={onVertexClick ? 0 : undefined}
              aria-label={onVertexClick ? (vertexActionLabel?.(v) ?? label) : undefined}
            >
              {state.current === v && <circle r={NODE_RADIUS + 7} className={styles.halo} />}
              <circle r={NODE_RADIUS} className={styles.disc} />
              <text className={styles.label} dy="0.35em">
                {label}
              </text>
              {source === v && (
                <text className={styles.sourceTag} y={NODE_RADIUS + 16}>
                  start
                </text>
              )}
              <g transform={`translate(${NODE_RADIUS - 2} ${-NODE_RADIUS - 4})`}>
                <rect x={-5} y={-12} width={distWidth(dist)} height={23} rx={11.5} className={styles.distBg} />
                <text className={styles.dist} x={distWidth(dist) / 2 - 5} dy="0.32em">
                  {formatDist(dist)}
                </text>
              </g>
              {wrong !== null && (
                <g transform={`translate(${-NODE_RADIUS - 2} ${NODE_RADIUS + 6})`}>
                  <rect x={-58} y={-1} width={88} height={20} rx={10} className={styles.wrongBg} />
                  <text className={styles.wrong} x={-14} y={10} dy="0.3em">
                    should be {formatDist(wrong)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function distWidth(d: number): number {
  return 14 + formatDist(d).length * 9;
}
