import { useMemo, useState, type ReactNode } from 'react';
import { BMSSP_PSEUDOCODE, bmssp, findPivotsDemo, paperParams, topLevel } from '../core/algorithms/bmssp';
import { dijkstra } from '../core/algorithms/dijkstra';
import { vertexLabel, type Graph, type VertexId } from '../core/graph';
import { BMSSP_DEMO, FINDPIVOTS_DEMO } from '../core/presets';
import { newStats } from '../core/sssp';
import type { VisualState } from '../core/trace';
import { ErrorBoundary } from '../site/ErrorBoundary';
import { DistanceLine } from '../viz/DistanceLine';
import { Caption, Figure, Legend } from '../viz/Figure';
import { formatDist } from '../viz/format';
import { GraphView } from '../viz/GraphView';
import { PlayerControls } from '../viz/PlayerControls';
import { PseudocodePanel } from '../viz/PseudocodePanel';
import { RecursionPanel } from '../viz/RecursionPanel';
import { StatsPanel } from '../viz/StatsPanel';
import { handlePlaybackKeys, recordRun, usePlayback } from '../viz/usePlayback';
import styles from './figures.module.css';

function graphLabel(graph: Graph, state: VisualState): string {
  return `Graph with ${graph.n} vertices. ${state.settledOrder.length} complete. Distances: ${state.dist
    .map((d, v) => `${vertexLabel(graph, v)} ${Number.isFinite(d) ? d : 'infinity'}`)
    .join(', ')}.`;
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format = String,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format?: (value: T) => string;
}) {
  return (
    <span className={styles.inputLabel}>
      {label}
      <span className={styles.segmented} role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}>
            {format(o)}
          </button>
        ))}
      </span>
    </span>
  );
}

/* ---------------- 3.4: FindPivots ---------------- */

export function FindPivotsFigure({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  return (
    <ErrorBoundary what={`Figure ${number}`}>
      <FindPivotsInner number={number} tryThis={tryThis} />
    </ErrorBoundary>
  );
}

function FindPivotsInner({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  const graph = FINDPIVOTS_DEMO;
  const [k, setK] = useState(3);
  const recording = useMemo(() => {
    const rec = recordRun(graph, (emit) => findPivotsDemo(graph, 0, k, emit));
    // Start the figure with the frontier already in place: skip the set-up steps.
    const setupEnd = rec.events.findIndex((e) => e.kind === 'line' && e.id === 'pivots');
    return { ...rec, stops: [setupEnd, ...rec.stops.filter((s) => s > setupEnd)] };
  }, [graph, k]);
  const playback = usePlayback(recording);
  const { state } = playback;
  const { frontier } = recording.result;
  const frontierNames = frontier.map((v) => vertexLabel(graph, v)).join(', ');

  return (
    <Figure number={number} title="FindPivots: shrink the frontier before sorting it" tryThis={tryThis} onKeyDown={(e) => handlePlaybackKeys(e, playback)}>
      <div className={styles.toolbar}>
        <Segmented label="Rounds k:" options={[1, 2, 3, 4] as const} value={k} onChange={setK} />
      </div>
      <div className={styles.withSide}>
        <div>
          <GraphView
            graph={graph}
            state={state}
            source={0}
            starred={new Set(state.pivots ?? [])}
            ringed={new Set(frontier)}
            highlightEdges={new Set(state.forest ?? [])}
            ariaLabel={graphLabel(graph, state)}
          />
          <Legend items={['settled', 'frontier', 'sources', 'pivot', 'forest', 'improved']} />
        </div>
        <div className={styles.side}>
          <StatsPanel
            title="FindPivots"
            items={[
              { label: 'Frontier |S|', value: frontier.length },
              { label: 'Bellman–Ford rounds k', value: k },
              { label: 'Vertices reached |W|', value: state.workSet?.length ?? '–' },
              { label: `Stop early above k × |S|`, value: k * frontier.length },
              { label: 'Pivots |P|', value: state.pivots ? state.pivots.length : '–' },
            ]}
          />
        </div>
      </div>
      <Caption>
        {playback.step === 0
          ? `s is settled, and its neighbours ${frontierNames} form the frontier (dashed rings). Dijkstra would now keep all ${frontier.length} sorted in its queue. FindPivots first runs k = ${k} round${k === 1 ? '' : 's'} of Bellman–Ford from them. Press play or step forward.`
          : playback.caption}
      </Caption>
      {state.pivots && (
        <div className={styles.summary}>
          <p>
            Frontier of <b>{frontier.length}</b> → <b>{state.pivots.length}</b> pivot{state.pivots.length === 1 ? '' : 's'}.{' '}
            {state.pivots.length < frontier.length
              ? 'Every vertex in a small tree already has its final distance, found without any sorting, so only the pivots need the sorted structure.'
              : 'Here nothing was saved: with this k, every frontier vertex stays.'}
          </p>
        </div>
      )}
      <PlayerControls playback={playback} />
    </Figure>
  );
}

/* ---------------- 3.5: the whole algorithm ---------------- */

export function BmsspFigure({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  return (
    <ErrorBoundary what={`Figure ${number}`}>
      <BmsspInner number={number} tryThis={tryThis} />
    </ErrorBoundary>
  );
}

function BmsspInner({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  const graph = BMSSP_DEMO;
  const source: VertexId = 0;
  const [k, setK] = useState(2);
  const [t, setT] = useState(2);

  const { recording, stats, dijkstraStats, maxDist, matches } = useMemo(() => {
    const stats = newStats();
    const recording = recordRun(graph, (emit) => bmssp(graph, source, { params: { k, t }, emit, stats }));
    const dijkstraStats = newStats();
    const reference = dijkstra(graph, source, { stats: dijkstraStats });
    const matches = recording.result.dist.every((d, v) => d === reference.dist[v]);
    const maxDist = Math.max(...Array.from(recording.result.dist).filter(Number.isFinite));
    return { recording, stats, dijkstraStats, maxDist, matches };
  }, [graph, k, t]);
  const playback = usePlayback(recording);
  const { state } = playback;

  const milestones = useMemo(() => {
    const { stops, events } = recording;
    const steps: number[] = [];
    for (let i = 1; i < stops.length; i++) {
      if (events.slice(stops[i - 1], stops[i]).some((e) => e.kind === 'call' || e.kind === 'return')) steps.push(i);
    }
    return steps;
  }, [recording]);
  const nextMilestone = milestones.find((i) => i > playback.step);

  const active = state.callStack.length ? state.calls[state.callStack[state.callStack.length - 1]] : null;
  const band = active
    ? {
        from: Number.isFinite(active.lower) ? active.lower : 0,
        to: active.bound,
        label: `level ${active.level}: below ${formatDist(active.bound)}`,
      }
    : null;
  const paper = paperParams(graph.n);

  return (
    <Figure number={number} title="The 2025 algorithm, call by call" tryThis={tryThis} onKeyDown={(e) => handlePlaybackKeys(e, playback)}>
      <div className={styles.toolbar}>
        <Segmented label="k:" options={[2, 3] as const} value={k} onChange={setK} />
        <Segmented label="t:" options={[1, 2] as const} value={t} onChange={setT} />
        <button
          type="button"
          className={styles.toolButton}
          onClick={() => playback.seek(nextMilestone ?? playback.steps)}
          disabled={playback.step === playback.steps}
        >
          {nextMilestone ? 'Skip to the next call or return ⏭' : 'Skip to the end ⏭'}
        </button>
      </div>

      <div className={styles.withSide}>
        <div>
          <GraphView
            graph={graph}
            state={state}
            source={source}
            starred={new Set(state.pivots ?? [])}
            ringed={new Set(active?.sources ?? [])}
            highlightEdges={new Set(state.forest ?? [])}
            ariaLabel={graphLabel(graph, state)}
          />
          <Legend items={['unvisited', 'frontier', 'settled', 'sources', 'pivot', 'forest', 'improved']} />
        </div>
        <div className={styles.side}>
          <PseudocodePanel lines={BMSSP_PSEUDOCODE} active={state.line} />
          <RecursionPanel graph={graph} state={state} />
        </div>
      </div>

      <DistanceLine graph={graph} state={state} max={maxDist} band={band} showSweep={false} />

      <Caption>
        {playback.step === 0
          ? `Starting from S with k = ${k} and t = ${t}, so the top call is at level ⌈log₂ ${graph.n} / ${t}⌉ = ${topLevel(graph.n, t)}. Press play, step forward, or skip from call to call.`
          : playback.caption}
      </Caption>
      {state.done && (
        <div className={styles.summary}>
          <p>
            Done in <b>{state.calls.length}</b> calls and <b>{stats.relaxations}</b> edge relaxations; Dijkstra needs{' '}
            {dijkstraStats.relaxations} relaxations on this graph.{' '}
            {matches ? "Every distance matches Dijkstra's." : "Some distances differ from Dijkstra's (please report this)."}{' '}
            Notice the order vertices were completed in: batch by batch, never one fully sorted list.
          </p>
          <p>
            Yes, that's more work than Dijkstra here. On a graph this small, the extra bookkeeping costs far more than
            the sorting it saves. The advantage only appears as graphs grow, and the next section puts that to the test.
          </p>
        </div>
      )}
      <PlayerControls playback={playback} />
      <p className={styles.note}>
        <b>What's simplified here:</b> the paper's own formulas give k = {paper.k} and t = {paper.t} for {graph.n}{' '}
        vertices, too small for anything interesting to happen, so this figure lets you pick slightly larger ones. The
        sorted structure follows the paper's block design with simpler internals, and the paper's trick of first making
        every vertex have at most two edges is left out. Neither changes which distances come out.
      </p>
    </Figure>
  );
}
