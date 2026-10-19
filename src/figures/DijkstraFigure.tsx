import { useMemo, useState, type ReactNode } from 'react';
import { DIJKSTRA_PSEUDOCODE, dijkstra } from '../core/algorithms/dijkstra';
import { vertexLabel, type Graph, type VertexId } from '../core/graph';
import { DIJKSTRA_INTRO } from '../core/presets';
import { ErrorBoundary } from '../site/ErrorBoundary';
import { DistanceLine } from '../viz/DistanceLine';
import { Caption, Figure, Legend, type LegendItem } from '../viz/Figure';
import { GraphView } from '../viz/GraphView';
import { PlayerControls } from '../viz/PlayerControls';
import { PseudocodePanel } from '../viz/PseudocodePanel';
import { QueuePanel } from '../viz/QueuePanel';
import { handlePlaybackKeys, recordRun, usePlayback } from '../viz/usePlayback';
import styles from './figures.module.css';

interface DijkstraFigureProps {
  number: string;
  title: string;
  tryThis?: ReactNode;
  graph?: Graph;
  source?: VertexId;
  /** Let the reader click a vertex to restart from there. */
  pickSource?: boolean;
  showPseudocode?: boolean;
  showDistanceLine?: boolean;
}

const LEGEND: LegendItem[] = ['unvisited', 'frontier', 'settled', 'current', 'tree', 'improved', 'checked'];

export function DijkstraFigure(props: DijkstraFigureProps) {
  return (
    <ErrorBoundary what={`Figure ${props.number}`}>
      <DijkstraFigureInner {...props} />
    </ErrorBoundary>
  );
}

function DijkstraFigureInner({
  number,
  title,
  tryThis,
  graph = DIJKSTRA_INTRO,
  source: initialSource = 0,
  pickSource = false,
  showPseudocode = true,
  showDistanceLine = false,
}: DijkstraFigureProps) {
  const [source, setSource] = useState(initialSource);
  const recording = useMemo(() => recordRun(graph, (emit) => dijkstra(graph, source, { emit })), [graph, source]);
  const playback = usePlayback(recording);
  const { state } = playback;

  const maxDist = useMemo(
    () => Math.max(0, ...Array.from(recording.result.dist).filter(Number.isFinite)),
    [recording],
  );
  const name = vertexLabel(graph, source);
  const startCaption = pickSource
    ? `Starting from ${name}. Press play or step forward (→) to begin, or click any vertex to start from there instead.`
    : `Starting from ${name}. Press play or step forward (→) to begin.`;

  return (
    <Figure number={number} title={title} tryThis={tryThis} onKeyDown={(e) => handlePlaybackKeys(e, playback)}>
      <div className={showPseudocode ? styles.withSide : undefined}>
        <div>
          <GraphView
            graph={graph}
            state={state}
            source={source}
            onVertexClick={pickSource ? setSource : undefined}
            vertexActionLabel={(v) => `Start from ${vertexLabel(graph, v)}`}
            ariaLabel={`Graph with ${graph.n} vertices. Current distances: ${state.dist
              .map((d, v) => `${vertexLabel(graph, v)} ${Number.isFinite(d) ? d : 'infinity'}`)
              .join(', ')}.`}
          />
          <Legend items={LEGEND} />
          {showPseudocode && (
            <div className={styles.below}>
              <QueuePanel graph={graph} state={state} />
            </div>
          )}
        </div>
        {showPseudocode && (
          <div className={styles.side}>
            <PseudocodePanel lines={DIJKSTRA_PSEUDOCODE} active={state.line} />
          </div>
        )}
      </div>

      {showDistanceLine && <DistanceLine graph={graph} state={state} max={maxDist} />}

      <Caption>{playback.step === 0 ? startCaption : playback.caption}</Caption>
      <PlayerControls playback={playback} />
    </Figure>
  );
}
