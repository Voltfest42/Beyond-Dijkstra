import { useMemo, useState, type ReactNode } from 'react';
import { BELLMAN_FORD_PSEUDOCODE, bellmanFord } from '../core/algorithms/bellmanFord';
import { DIJKSTRA_PSEUDOCODE, dijkstra } from '../core/algorithms/dijkstra';
import { HYBRID_PSEUDOCODE, hybrid, type HybridResult } from '../core/algorithms/hybrid';
import { reweighted, vertexLabel, type Graph } from '../core/graph';
import { DIJKSTRA_TRAP, GOLD_FARM, GOLD_FARM_NAMES, NEGATIVE_STAIRCASE, TRAP_LOOP_EDGE } from '../core/presets';
import { newStats, pathTo } from '../core/sssp';
import { initialState } from '../core/trace';
import { ErrorBoundary } from '../site/ErrorBoundary';
import { Figure, Legend } from '../viz/Figure';
import { formatDist } from '../viz/format';
import { GraphView } from '../viz/GraphView';
import { RunFigure, type Algorithm } from './RunFigure';
import styles from './figures.module.css';

/* ---------------- 2.1: a negative cycle is an exploit ---------------- */

export function GoldFarmFigure({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  const [laps, setLaps] = useState(0);
  const state = useMemo(() => {
    const s = initialState(GOLD_FARM.n);
    s.negativeCycle = [0, 1, 2]; // Town → Forest → Cave → Town
    return s;
  }, []);
  // Cheapest Town → Shop trip: Town → Forest → Cave → Shop costs 2 − 6 + 4 = 0, minus 1 per extra lap.
  const cost = 0 - laps;

  return (
    <ErrorBoundary what={`Figure ${number}`}>
      <Figure number={number} title="A path that pays you, and a loop that never stops paying" tryThis={tryThis}>
        <GraphView
          graph={GOLD_FARM}
          state={state}
          showDistances={false}
          vertexNotes={GOLD_FARM_NAMES}
          ariaLabel="Game map: Town to Forest costs 2, Forest to Cave earns 6 gold (weight −6), Cave to Town costs 3, and Forest and Cave both lead to the Shop. The loop Town, Forest, Cave, Town has total weight −1."
        />
        <Legend items={['negative', 'cycle']} />
        <div className={styles.summary}>
          <p>
            One lap of Town → Forest → Cave → Town costs 2 − 6 + 3 = <b>−1</b>: you come back with one more gold
            than you left with.
          </p>
          <p>
            Laps before going to the Shop: <b>{laps}</b>. Cheapest trip from Town to the Shop:{' '}
            <b>{formatDist(cost)}</b> gold.{' '}
            <button type="button" className={styles.toolButton} onClick={() => setLaps((l) => l + 1)}>
              Do one more lap
            </button>{' '}
            {laps > 0 && (
              <button type="button" className={styles.toolButton} onClick={() => setLaps(0)}>
                Reset
              </button>
            )}
          </p>
        </div>
      </Figure>
    </ErrorBoundary>
  );
}

/* ---------------- 2.2: Dijkstra breaks ---------------- */

export function DijkstraTrapFigure({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  const truth = useMemo(() => {
    const result = bellmanFord(DIJKSTRA_TRAP, 0);
    return result.kind === 'paths' ? result.dist : null;
  }, []);

  return (
    <RunFigure
      number={number}
      title="Dijkstra on a graph with one negative edge"
      tryThis={tryThis}
      graph={DIJKSTRA_TRAP}
      algorithm={dijkstra}
      pseudocode={DIJKSTRA_PSEUDOCODE}
      showQueue
      showTruth
      legend={['unvisited', 'frontier', 'settled', 'current', 'tree', 'improved', 'checked', 'negative']}
      summary={({ state, graph }) => {
        const wrong = state.dist.flatMap((d, v) => (truth && d !== truth[v] ? [vertexLabel(graph, v)] : []));
        return wrong.length === 0 ? (
          <p>Every distance is correct from this start vertex: the negative edge never mattered here.</p>
        ) : (
          <p>
            Dijkstra finished, but <b>{wrong.length}</b> of its distances are wrong ({wrong.join(', ')}). It settled
            A at 2 before it knew about the route through B, and everything reached through A inherited the error.
          </p>
        );
      }}
    />
  );
}

/* ---------------- 2.3: Bellman–Ford ---------------- */

const LOOP_MIN = -3;
const LOOP_MAX = 6;

export function BellmanFordFigure({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  const [loopWeight, setLoopWeight] = useState(DIJKSTRA_TRAP.edgeWeight[TRAP_LOOP_EDGE]);
  const graph = useMemo(
    () => reweighted(DIJKSTRA_TRAP, (e) => (e === TRAP_LOOP_EDGE ? loopWeight : DIJKSTRA_TRAP.edgeWeight[e])),
    [loopWeight],
  );
  const loopTotal = -4 + 1 + loopWeight;

  return (
    <RunFigure
      number={number}
      title="Bellman–Ford: relax every edge, round after round"
      tryThis={tryThis}
      graph={graph}
      algorithm={bellmanFord}
      pseudocode={BELLMAN_FORD_PSEUDOCODE}
      legend={['unvisited', 'frontier', 'settled', 'tree', 'improved', 'checked', 'negative', 'cycle']}
      toolbar={
        <>
          <span className={styles.stepper}>
            Weight of edge C → B:
            <button type="button" aria-label="Decrease" onClick={() => setLoopWeight((w) => Math.max(LOOP_MIN, w - 1))}>
              −
            </button>
            <output aria-live="polite">{formatDist(loopWeight)}</output>
            <button type="button" aria-label="Increase" onClick={() => setLoopWeight((w) => Math.min(LOOP_MAX, w + 1))}>
              +
            </button>
          </span>
          <span>
            Loop B → A → C → B weighs <b className={loopTotal < 0 ? styles.bad : undefined}>{formatDist(loopTotal)}</b>
          </span>
        </>
      }
      counters={({ state }) => [
        { label: 'Round', value: state.round === null ? '–' : `${Math.min(state.round, graph.n - 1)} of ${graph.n - 1}${state.round >= graph.n ? ' + check' : ''}` },
        { label: 'Relaxations so far', value: state.relaxations },
      ]}
      summary={({ recording, stats }) => {
        const rounds = recording.events.filter((e) => e.kind === 'round').length;
        return recording.result.kind === 'negative-cycle' ? (
          <p>
            In the extra round a distance still dropped, which is only possible with a <b>negative cycle</b> (drawn
            dashed). Bellman–Ford stops and reports it instead of wrong distances.
          </p>
        ) : (
          <p>
            Correct answers after <b>{rounds}</b> rounds and <b>{stats.relaxations}</b> edge checks. Dijkstra checked
            each of the {graph.m} edges once, but got three distances wrong. On a graph with n vertices, Bellman–Ford
            can need n − 1 rounds of all m edges.
          </p>
        );
      }}
    />
  );
}

/* ---------------- 2.5: the hybrid ---------------- */

const HYBRID_GRAPHS = {
  trap: { graph: DIJKSTRA_TRAP, label: 'One negative edge per route' },
  staircase: { graph: NEGATIVE_STAIRCASE, label: 'A staircase of negative edges' },
} as const;

/** Largest number of negative edges on the routes the run found. */
function negativeEdgesOnRoutes(graph: Graph, result: HybridResult): number {
  if (result.kind !== 'paths') return 0;
  let most = 0;
  for (let v = 0; v < graph.n; v++) {
    const path = pathTo(graph, result, v);
    if (!path) continue;
    let count = 0;
    for (let i = 1; i < path.length; i++) {
      const e = result.predEdge[path[i]];
      if (graph.edgeWeight[e] < 0) count++;
    }
    most = Math.max(most, count);
  }
  return most;
}

export function HybridFigure({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  const [which, setWhich] = useState<keyof typeof HYBRID_GRAPHS>('trap');
  const { graph } = HYBRID_GRAPHS[which];
  const bellmanFordWork = useMemo(() => {
    const stats = newStats();
    let rounds = 0;
    bellmanFord(graph, 0, { stats, emit: (e) => e.kind === 'round' && rounds++ });
    return { stats, rounds };
  }, [graph]);

  return (
    <RunFigure
      number={number}
      title="The hybrid: Dijkstra passes plus Bellman–Ford passes over negative edges"
      tryThis={tryThis}
      graph={graph}
      algorithm={hybrid as Algorithm}
      pseudocode={HYBRID_PSEUDOCODE}
      legend={['unvisited', 'frontier', 'settled', 'current', 'tree', 'improved', 'checked', 'negative']}
      toolbar={
        <span className={styles.segmented} role="group" aria-label="Example graph">
          {(Object.keys(HYBRID_GRAPHS) as (keyof typeof HYBRID_GRAPHS)[]).map((key) => (
            <button key={key} type="button" aria-pressed={which === key} onClick={() => setWhich(key)}>
              {HYBRID_GRAPHS[key].label}
            </button>
          ))}
        </span>
      }
      counters={({ state }) => [
        { label: 'Round', value: state.round ?? '–' },
        { label: 'Relaxations so far', value: state.relaxations },
      ]}
      summary={({ recording, stats }) => {
        const result = recording.result as HybridResult;
        const eta = negativeEdgesOnRoutes(graph, result);
        return (
          <>
            <p>
              The shortest routes here use up to <b>η = {eta}</b> negative edge{eta === 1 ? '' : 's'}, and the hybrid
              finished in <b>{result.rounds}</b> rounds (never more than η + 1).
            </p>
            <p>
              Work: <b>{stats.relaxations}</b> relaxations for the hybrid, against {bellmanFordWork.stats.relaxations}{' '}
              edge checks over {bellmanFordWork.rounds} rounds for Bellman–Ford on the same graph.
            </p>
          </>
        );
      }}
    />
  );
}
