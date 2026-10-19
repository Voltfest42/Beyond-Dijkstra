import { useMemo, useState, type ReactNode } from 'react';
import { johnsonPotential, reweightedWeights } from '../core/algorithms/johnson';
import { vertexLabel, type EdgeId, type Graph, type VertexId } from '../core/graph';
import { POTENTIALS_PUZZLE } from '../core/presets';
import { initialState } from '../core/trace';
import { ErrorBoundary } from '../site/ErrorBoundary';
import { Figure, Legend } from '../viz/Figure';
import { formatDist } from '../viz/format';
import { GraphView } from '../viz/GraphView';
import styles from './PotentialsFigure.module.css';
import figureStyles from './figures.module.css';

const HEIGHT_LIMIT = 9;

interface Route {
  vertices: VertexId[];
  edges: EdgeId[];
  length: number;
}

/** Every simple path from `from` to `to` (fine for a 5-vertex puzzle). */
function allRoutes(g: Graph, from: VertexId, to: VertexId): Route[] {
  const routes: Route[] = [];
  const onPath = new Set<VertexId>([from]);
  const walk = (v: VertexId, vertices: VertexId[], edges: EdgeId[], length: number) => {
    if (v === to) {
      routes.push({ vertices: [...vertices], edges: [...edges], length });
      return;
    }
    for (let i = g.outStart[v]; i < g.outStart[v + 1]; i++) {
      const e = g.outEdges[i];
      const next = g.edgeTo[e];
      if (onPath.has(next)) continue;
      onPath.add(next);
      walk(next, [...vertices, next], [...edges, e], length + g.edgeWeight[e]);
      onPath.delete(next);
    }
  };
  walk(from, [from], [], 0);
  return routes.sort((a, b) => a.length - b.length);
}

export function PotentialsFigure({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  return (
    <ErrorBoundary what={`Figure ${number}`}>
      <PotentialsFigureInner number={number} tryThis={tryThis} />
    </ErrorBoundary>
  );
}

function PotentialsFigureInner({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  const graph = POTENTIALS_PUZZLE;
  const source = 0;
  const target = graph.n - 1;
  const [heights, setHeights] = useState<number[]>(() => new Array(graph.n).fill(0));
  const [showOriginal, setShowOriginal] = useState(false);
  const [hoveredRoute, setHoveredRoute] = useState<number | null>(null);

  const adjusted = useMemo(() => reweightedWeights(graph, heights), [graph, heights]);
  const routes = useMemo(() => allRoutes(graph, source, target), [graph, source, target]);
  const state = useMemo(() => initialState(graph.n), [graph]);
  const negatives = Array.from(adjusted).filter((w) => w < 0).length;
  const shift = heights[source] - heights[target];
  const shownRoute = hoveredRoute ?? 0;

  const setHeight = (v: VertexId, h: number) =>
    setHeights((hs) => hs.map((x, i) => (i === v ? Math.max(-HEIGHT_LIMIT, Math.min(HEIGHT_LIMIT, h)) : x)));

  const showSolution = () => {
    const phi = johnsonPotential(graph);
    if (!phi) return;
    // Any constant can be added to every height without changing a single edge; start from 0.
    const lowest = Math.min(...phi);
    setHeights(Array.from(phi, (h) => h - lowest));
  };

  return (
    <Figure number={number} title="Potentials: change every edge, keep every answer" tryThis={tryThis}>
      <div className={styles.layout}>
        <div>
          <GraphView
            graph={graph}
            state={state}
            showDistances={false}
            edgeWeights={showOriginal ? graph.edgeWeight : adjusted}
            vertexNotes={heights.map((h) => `height ${formatDist(h)}`)}
            highlightEdges={new Set(routes[shownRoute]?.edges ?? [])}
            ariaLabel={`Puzzle graph. ${negatives} edges are negative after adjusting by the heights.`}
          />
          <Legend items={['negative', 'route']} />
          <p className={negatives === 0 ? styles.solved : styles.unsolved} role="status">
            {negatives === 0
              ? '✓ Every edge is now 0 or more, so Dijkstra would get the right answer on these weights. And the best route is still the same one.'
              : `${negatives} edge${negatives === 1 ? ' is' : 's are'} still negative (red). To fix an edge u → v, raise u's height or lower v's.`}
          </p>
        </div>

        <div className={styles.controls}>
          <h4 className={styles.heading}>Heights</h4>
          <ul className={styles.heightList}>
            {heights.map((h, v) => (
              <li key={v}>
                <span className={styles.vertexName}>{vertexLabel(graph, v)}</span>
                <span className={figureStyles.stepper}>
                  <button type="button" aria-label={`Lower ${vertexLabel(graph, v)}`} onClick={() => setHeight(v, h - 1)}>
                    −
                  </button>
                  <output aria-label={`Height of ${vertexLabel(graph, v)}`}>{formatDist(h)}</output>
                  <button type="button" aria-label={`Raise ${vertexLabel(graph, v)}`} onClick={() => setHeight(v, h + 1)}>
                    +
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className={styles.buttons}>
            <button type="button" className={figureStyles.toolButton} onClick={() => setHeights(new Array(graph.n).fill(0))}>
              Reset
            </button>
            <button type="button" className={figureStyles.toolButton} onClick={showSolution}>
              Show a solution
            </button>
          </div>
          <label className={styles.toggle}>
            <input type="checkbox" checked={showOriginal} onChange={(e) => setShowOriginal(e.target.checked)} />
            Show the original weights
          </label>
        </div>
      </div>

      <table className={styles.routes}>
        <caption>
          Every route from S to T. Each one changes by the same amount: height of S − height of T ={' '}
          <b>{formatDist(shift)}</b>.
        </caption>
        <thead>
          <tr>
            <th scope="col">Route</th>
            <th scope="col">Original length</th>
            <th scope="col">Adjusted length</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((route, i) => {
            const adjustedLength = route.edges.reduce((sum, e) => sum + adjusted[e], 0);
            return (
              <tr
                key={route.vertices.join('')}
                className={i === shownRoute ? styles.shownRow : undefined}
                onMouseEnter={() => setHoveredRoute(i)}
                onMouseLeave={() => setHoveredRoute(null)}
              >
                <td>
                  {route.vertices.map((v) => vertexLabel(graph, v)).join(' → ')}
                  {i === 0 && <span className={styles.best}>shortest</span>}
                </td>
                <td>{formatDist(route.length)}</td>
                <td>{formatDist(adjustedLength)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Figure>
  );
}
