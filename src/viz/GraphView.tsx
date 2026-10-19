import { useMemo } from 'react';
import { vertexLabel, type EdgeId, type Graph, type VertexId } from '../core/graph';
import type { VisualState } from '../core/trace';
import { formatDist, formatWeight } from './format';
import { circleLayout, layoutEdges, NODE_RADIUS, viewBoxFor } from './geometry';
import styles from './GraphView.module.css';

interface GraphViewProps {
  graph: Graph;
  state: VisualState;
  ariaLabel: string;
  source?: VertexId;
  /** When given, vertices whose final distance is wrong get a "should be X" badge. */
  truthDist?: readonly number[];
  /** Weights to display (and colour by sign) instead of the graph's own, e.g. reweighted ones. */
  edgeWeights?: ArrayLike<number>;
  /** A short note under each vertex (a name, a height…). */
  vertexNotes?: readonly (string | null)[];
  showDistances?: boolean;
  selected?: VertexId | null;
  highlightEdges?: ReadonlySet<EdgeId>;
  /** Makes vertices clickable (e.g. "start from here"). */
  onVertexClick?: (v: VertexId) => void;
  vertexActionLabel?: (v: VertexId) => string;
}

export function GraphView({
  graph,
  state,
  ariaLabel,
  source,
  truthDist,
  edgeWeights,
  vertexNotes,
  showDistances = true,
  selected = null,
  highlightEdges,
  onVertexClick,
  vertexActionLabel,
}: GraphViewProps) {
  const positions = useMemo(() => graph.positions ?? circleLayout(graph.n), [graph]);
  const edges = useMemo(() => layoutEdges(graph, positions), [graph, positions]);
  const viewBox = useMemo(() => viewBoxFor(positions, vertexNotes ? 56 : 48), [positions, vertexNotes]);

  // Put a vertex's note on the side its edges leave alone: above if its neighbours are mostly below.
  const noteAbove = useMemo(
    () =>
      positions.map((p, v) => {
        let dy = 0;
        for (let i = graph.outStart[v]; i < graph.outStart[v + 1]; i++) dy += positions[graph.edgeTo[graph.outEdges[i]]].y - p.y;
        for (let i = graph.inStart[v]; i < graph.inStart[v + 1]; i++) dy += positions[graph.edgeFrom[graph.inEdges[i]]].y - p.y;
        return dy > 0;
      }),
    [graph, positions],
  );

  const treeEdges = new Set(state.predEdge.filter((e) => e >= 0));
  const cycleEdges = new Set(state.negativeCycle ?? []);
  const weightOf = (e: EdgeId) => (edgeWeights ? edgeWeights[e] : graph.edgeWeight[e]);

  return (
    <svg className={styles.svg} viewBox={viewBox} role="img" aria-label={ariaLabel}>
      <g>
        {edges.map((geo, e) => {
          const weight = weightOf(e);
          const text = formatWeight(weight);
          const width = 16 + text.length * 8.5;
          const classes = [styles.edge];
          if (weight < 0) classes.push(styles.negative);
          if (treeEdges.has(e)) classes.push(styles.tree);
          if (highlightEdges?.has(e)) classes.push(styles.highlight);
          if (cycleEdges.has(e)) classes.push(styles.cycle);
          if (state.activeEdge === e) {
            classes.push(state.ignoredImprovement ? styles.ignored : state.activeEdgeImproved ? styles.improved : styles.checked);
          }
          return (
            <g key={e} className={classes.join(' ')}>
              {highlightEdges?.has(e) && <path d={geo.path} className={styles.glow} />}
              <path d={geo.path} className={styles.edgeLine} />
              <polygon points={geo.arrow} className={styles.arrow} />
              <g transform={`translate(${geo.label.x.toFixed(1)} ${geo.label.y.toFixed(1)})`}>
                <rect x={-width / 2} y={-12} width={width} height={24} rx={7} className={styles.weightBg} />
                <text className={styles.weight} dy="0.35em">
                  {text}
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
          const note = vertexNotes?.[v] ?? null;
          const wrong =
            state.done && truthDist !== undefined && truthDist[v] !== dist && Number.isFinite(truthDist[v])
              ? truthDist[v]
              : null;
          const classes = [styles.vertex, styles[status]];
          if (state.current === v) classes.push(styles.current);
          if (selected === v) classes.push(styles.selected);
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
              aria-pressed={onVertexClick && selected !== null ? selected === v : undefined}
            >
              {(state.current === v || selected === v) && (
                <circle r={NODE_RADIUS + 7} className={state.current === v ? styles.halo : styles.selectRing} />
              )}
              <circle r={NODE_RADIUS} className={styles.disc} />
              <text className={styles.label} dy="0.35em">
                {label}
              </text>
              {source === v && (
                <text className={styles.sourceTag} y={NODE_RADIUS + 16}>
                  start
                </text>
              )}
              {note !== null && (
                <text
                  className={styles.note}
                  y={noteAbove[v] && !showDistances ? -NODE_RADIUS - 9 : NODE_RADIUS + (source === v ? 32 : 18)}
                >
                  {note}
                </text>
              )}
              {showDistances && (
                <g transform={`translate(${NODE_RADIUS - 2} ${-NODE_RADIUS - 4})`}>
                  <rect x={-5} y={-12} width={distWidth(dist)} height={23} rx={11.5} className={styles.distBg} />
                  <text className={styles.dist} x={distWidth(dist) / 2 - 5} dy="0.32em">
                    {formatDist(dist)}
                  </text>
                </g>
              )}
              {wrong !== null && (
                <g transform={`translate(0 ${NODE_RADIUS + (source === v ? 30 : 14)})`}>
                  <rect x={-50} y={-1} width={100} height={22} rx={11} className={styles.wrongBg} />
                  <text className={styles.wrong} y={10} dy="0.32em">
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
