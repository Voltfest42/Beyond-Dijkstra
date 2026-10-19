import { useMemo, useState, type ReactNode } from 'react';
import { bellmanFord } from '../core/algorithms/bellmanFord';
import { vertexLabel, type Graph, type VertexId } from '../core/graph';
import type { PseudocodeLine } from '../core/pseudocode';
import { newStats, type RunOptions, type SsspResult, type Stats } from '../core/sssp';
import type { VisualState } from '../core/trace';
import { ErrorBoundary } from '../site/ErrorBoundary';
import { DistanceLine } from '../viz/DistanceLine';
import { Caption, Figure, Legend, type LegendItem } from '../viz/Figure';
import { GraphView } from '../viz/GraphView';
import { PlayerControls } from '../viz/PlayerControls';
import { PseudocodePanel } from '../viz/PseudocodePanel';
import { QueuePanel } from '../viz/QueuePanel';
import { StatsPanel, type StatItem } from '../viz/StatsPanel';
import { handlePlaybackKeys, recordRun, usePlayback, type Recording } from '../viz/usePlayback';
import styles from './figures.module.css';

export type Algorithm = (g: Graph, source: VertexId, options: RunOptions) => SsspResult;

export interface RunContext {
  graph: Graph;
  state: VisualState;
  recording: Recording<SsspResult>;
  /** Totals for the whole run. */
  stats: Stats;
}

export interface RunFigureProps {
  number: string;
  title: string;
  tryThis?: ReactNode;
  graph: Graph;
  algorithm: Algorithm;
  source?: VertexId;
  /** Let the reader click a vertex to restart from there. */
  pickSource?: boolean;
  pseudocode?: readonly PseudocodeLine[];
  showQueue?: boolean;
  showDistanceLine?: boolean;
  /** Mark wrong final distances against the true ones (computed with Bellman–Ford). */
  showTruth?: boolean;
  vertexNotes?: readonly (string | null)[];
  legend?: readonly LegendItem[];
  /** Controls above the graph, e.g. choosing between example graphs. */
  toolbar?: ReactNode;
  counters?: (context: RunContext) => StatItem[];
  /** Shown under the caption once the run has finished. */
  summary?: (context: RunContext) => ReactNode;
}

/**
 * The standard step-through figure: a graph, optional side panels, a caption
 * that explains each step, and the player controls. Every algorithm demo is
 * built on this, so they all look and behave the same.
 */
export function RunFigure(props: RunFigureProps) {
  return (
    <ErrorBoundary what={`Figure ${props.number}`}>
      <RunFigureInner {...props} />
    </ErrorBoundary>
  );
}

const DEFAULT_LEGEND: LegendItem[] = ['unvisited', 'frontier', 'settled', 'current', 'tree', 'improved', 'checked'];

function RunFigureInner({
  number,
  title,
  tryThis,
  graph,
  algorithm,
  source: initialSource = 0,
  pickSource = false,
  pseudocode,
  showQueue = false,
  showDistanceLine = false,
  showTruth = false,
  vertexNotes,
  legend = DEFAULT_LEGEND,
  toolbar,
  counters,
  summary,
}: RunFigureProps) {
  const [source, setSource] = useState(initialSource);
  const { recording, stats } = useMemo(() => {
    const stats = newStats();
    return { recording: recordRun(graph, (emit) => algorithm(graph, source, { emit, stats })), stats };
  }, [graph, source, algorithm]);
  const playback = usePlayback(recording);
  const { state } = playback;
  const context: RunContext = { graph, state, recording, stats };

  const truth = useMemo(() => {
    if (!showTruth) return undefined;
    const result = bellmanFord(graph, source);
    return result.kind === 'paths' ? Array.from(result.dist) : undefined;
  }, [graph, source, showTruth]);

  const maxDist = useMemo(() => {
    const result = recording.result;
    return result.kind === 'paths' ? Math.max(0, ...Array.from(result.dist).filter(Number.isFinite)) : 0;
  }, [recording]);

  // Steps that begin a new round, for the "next round" shortcut.
  const roundSteps = useMemo(() => {
    const { stops, events } = recording;
    const steps: number[] = [];
    for (let k = 1; k < stops.length; k++) {
      if (events.slice(stops[k - 1], stops[k]).some((e) => e.kind === 'round')) steps.push(k);
    }
    return steps;
  }, [recording]);
  const nextRound = roundSteps.find((k) => k > playback.step);

  const name = vertexLabel(graph, source);
  const startCaption = `Starting from ${name}. Press play or step forward (→) to begin${
    pickSource ? ', or click any vertex to start from there instead' : ''
  }.`;
  const side = pseudocode || counters;

  return (
    <Figure number={number} title={title} tryThis={tryThis} onKeyDown={(e) => handlePlaybackKeys(e, playback)}>
      {(toolbar || roundSteps.length > 1) && (
        <div className={styles.toolbar}>
          {toolbar}
          {roundSteps.length > 1 && (
            <button
              type="button"
              className={styles.toolButton}
              onClick={() => playback.seek(nextRound ?? playback.steps)}
              disabled={playback.step === playback.steps}
            >
              {nextRound ? 'Skip to the next round ⏭' : 'Skip to the end ⏭'}
            </button>
          )}
        </div>
      )}

      <div className={side ? styles.withSide : undefined}>
        <div>
          <GraphView
            graph={graph}
            state={state}
            source={source}
            truthDist={truth}
            vertexNotes={vertexNotes}
            onVertexClick={pickSource ? setSource : undefined}
            vertexActionLabel={(v) => `Start from ${vertexLabel(graph, v)}`}
            ariaLabel={`Graph with ${graph.n} vertices. Current distances: ${state.dist
              .map((d, v) => `${vertexLabel(graph, v)} ${Number.isFinite(d) ? d : 'infinity'}`)
              .join(', ')}.`}
          />
          <Legend items={legend} />
          {showQueue && (
            <div className={styles.below}>
              <QueuePanel graph={graph} state={state} />
            </div>
          )}
        </div>
        {side && (
          <div className={styles.side}>
            {pseudocode && <PseudocodePanel lines={pseudocode} active={state.line} />}
            {counters && <StatsPanel items={counters(context)} />}
          </div>
        )}
      </div>

      {showDistanceLine && <DistanceLine graph={graph} state={state} max={maxDist} />}

      <Caption>{playback.step === 0 ? startCaption : playback.caption}</Caption>
      {summary && state.done && <div className={styles.summary}>{summary(context)}</div>}
      <PlayerControls playback={playback} />
    </Figure>
  );
}
