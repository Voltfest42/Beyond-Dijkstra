import { useMemo, useState, type ReactNode } from 'react';
import { countNegative, negativeEdgesNeeded } from '../core/analysis';
import { bellmanFord } from '../core/algorithms/bellmanFord';
import { bnw, scaleDown, type ScaleDownReport } from '../core/algorithms/bnw';
import { dijkstra } from '../core/algorithms/dijkstra';
import { reweightedWeights } from '../core/algorithms/johnson';
import { reweighted, vertexLabel } from '../core/graph';
import { seededRandom } from '../core/generators';
import { BNW_DEMO } from '../core/presets';
import type { PseudocodeLine } from '../core/pseudocode';
import { initialState } from '../core/trace';
import { ErrorBoundary } from '../site/ErrorBoundary';
import { Caption, Figure, Legend } from '../viz/Figure';
import { formatDist } from '../viz/format';
import { GraphView } from '../viz/GraphView';
import { PlayerControls } from '../viz/PlayerControls';
import { PseudocodePanel } from '../viz/PseudocodePanel';
import { StatsPanel } from '../viz/StatsPanel';
import { handlePlaybackKeys, useStepper } from '../viz/usePlayback';
import styles from './figures.module.css';

/** Decomposition settings tuned so a 14-vertex graph splits into a handful of readable clusters. */
const DEMO_DIAMETER = 12;
const DEMO_RATE = 0.3;
const FIRST_SEED = 1;

const PHASES: readonly PseudocodeLine[] = [
  { id: 'start', text: 'Start: some edges are negative', indent: 0 },
  { id: 'cluster', text: 'Phase 0: cut the graph into clusters', indent: 0 },
  { id: 'inside', text: 'Phase 1: fix edges inside clusters (recursively)', indent: 0 },
  { id: 'between', text: 'Phase 2: fix edges between clusters', indent: 0 },
  { id: 'cleanup', text: 'Phase 3: clean up the cut edges (hybrid)', indent: 0 },
  { id: 'dijkstra', text: 'Finish: every edge ≥ 0, so run Dijkstra', indent: 0 },
];

export function BnwFigure({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  return (
    <ErrorBoundary what={`Figure ${number}`}>
      <BnwFigureInner number={number} tryThis={tryThis} />
    </ErrorBoundary>
  );
}

function BnwFigureInner({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  const graph = BNW_DEMO;
  const source = 0;
  const [seed, setSeed] = useState(FIRST_SEED);
  const [showHeights, setShowHeights] = useState(false);

  const run = useMemo(() => {
    const report: ScaleDownReport = {};
    const ctx = {
      random: seededRandom(seed),
      stats: { scaleDownCalls: 0, maxDepth: 0, hybridRounds: 0, cutEdges: 0 },
      lddRate: DEMO_RATE,
    };
    const result = scaleDown(
      { g: graph, orig: Int32Array.from({ length: graph.m }, (_, e) => e) },
      { delta: graph.n, B: 0, diameter: DEMO_DIAMETER, depth: 0 },
      ctx,
      report,
    );
    if (result.kind !== 'heights') throw new Error('The walkthrough graph has no negative cycle');

    const zero = new Float64Array(graph.n);
    const heights = [zero, zero, report.phi1!, report.phi2!, report.phi3!, report.phi3!];
    const stages = heights.map((phi) => {
      const weights = reweightedWeights(graph, phi);
      return { phi, weights, negatives: countNegative(weights), eta: negativeEdgesNeeded(graph, weights) };
    });

    // Finish: Dijkstra on the final (all non-negative) weights, translated back to real distances.
    const final = stages[5];
    const inner = dijkstra(
      reweighted(graph, (e) => final.weights[e]),
      source,
    );
    const dist = Array.from(inner.dist, (d, v) => (d === Infinity ? d : d - final.phi[source] + final.phi[v]));
    const truth = bellmanFord(graph, source);
    const correct = truth.kind === 'paths' && dist.every((d, v) => d === truth.dist[v]);
    const full = bnw(graph, source, { seed });

    return { report, stages, dist, predEdge: inner.predEdge, correct, full };
  }, [graph, seed]);

  const stepper = useStepper(PHASES.length - 1, seed);
  const stage = run.stages[stepper.step];
  const { report } = run;
  const clustersShown = stepper.step >= 1;
  const cutCount = report.cut?.length ?? 0;
  const negativeCut = (report.cut ?? []).filter((e) => stage.weights[e] < 0).length;

  const state = useMemo(() => {
    const s = initialState(graph.n);
    if (stepper.step === 5) {
      s.dist = run.dist;
      s.predEdge = Array.from(run.predEdge);
      s.status = s.dist.map((d) => (d === Infinity ? 'unvisited' : 'settled'));
      s.done = true;
    }
    return s;
  }, [graph, run, stepper.step]);

  const captions = [
    `The graph has ${graph.m} edges, ${run.stages[0].negatives} of them negative (red). Some shortest routes use up to η = ${run.stages[0].eta} negative edges. The goal is heights that make every edge 0 or more, so Dijkstra can take over.`,
    `Phase 0: treat negative edges as 0 and carve the graph into balls of random size around random centres. ${report.clusters?.length} clusters, ${cutCount} edge${cutCount === 1 ? '' : 's'} cut between them (dashed). Short edges are rarely cut.`,
    `Phase 1: each cluster is fixed by the same method, applied to the cluster alone (${report.innerCalls} more call${report.innerCalls === 1 ? '' : 's'}, ${report.innerDepth} level${report.innerDepth === 1 ? '' : 's'} deep). Every edge inside a cluster is now 0 or more. ${stage.negatives} negative edge${stage.negatives === 1 ? '' : 's'} left, all between clusters.`,
    `Phase 2: the uncut edges between clusters never loop back, so the clusters can be numbered in order (1, 2, 3, …). Lowering each cluster's heights by enough relative to the ones before it fixes every uncut edge between them. Only cut edges can still be negative: ${stage.negatives} left.`,
    `Phase 3: only cut edges were left negative, and few routes use them, so the hybrid from Section 2.5 finishes in ${report.cleanupRounds} round${report.cleanupRounds === 1 ? '' : 's'}. Every edge is now 0 or more.`,
    `Finish: with every edge non-negative, plain Dijkstra finds the shortest routes (bold). Shifting back by the heights gives the true distances, shown here with the original weights${run.correct ? '. They match Bellman–Ford exactly.' : '.'}`,
  ];

  return (
    <Figure number={number} title="The 2022 algorithm, one phase at a time" tryThis={tryThis} onKeyDown={(e) => handlePlaybackKeys(e, stepper)}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toolButton} onClick={() => setSeed((s) => s + 1)}>
          Re-roll the random clusters 🎲
        </button>
        <label className={styles.checkbox}>
          <input type="checkbox" checked={showHeights} onChange={(e) => setShowHeights(e.target.checked)} />
          Show heights
        </label>
      </div>

      <div className={styles.withSide}>
        <div>
          <GraphView
            graph={graph}
            state={state}
            source={source}
            showDistances={stepper.step === 5}
            // The finish shows true distances, so show the original weights they add up from.
            edgeWeights={stepper.step === 5 ? graph.edgeWeight : stage.weights}
            clusters={clustersShown && stepper.step < 5 ? report.clusters : undefined}
            numberClusters={stepper.step >= 3 && stepper.step < 5}
            cutEdges={clustersShown && stepper.step < 5 ? new Set(report.cut) : undefined}
            vertexNotes={showHeights ? Array.from(stage.phi, (h) => `h ${formatDist(h)}`) : undefined}
            ariaLabel={`Walkthrough graph with ${graph.n} vertices, at ${PHASES[stepper.step].text}. ${stage.negatives} edges are negative.`}
          />
          <Legend items={stepper.step === 5 ? ['settled', 'tree', 'negative'] : ['negative', 'cluster', 'cut']} />
        </div>
        <div className={styles.side}>
          <PseudocodePanel lines={PHASES} active={PHASES[stepper.step].id} />
          <StatsPanel
            items={[
              { label: 'Negative edges', value: stage.negatives },
              { label: 'η (negative edges per route)', value: stage.eta },
              { label: 'Clusters', value: clustersShown ? (report.clusters?.length ?? '–') : '–' },
              {
                label: 'Cut edges (still negative)',
                value: clustersShown ? `${cutCount} (${negativeCut})` : '–',
              },
            ]}
          />
        </div>
      </div>

      <Caption>{captions[stepper.step]}</Caption>
      {stepper.step === 5 && (
        <div className={styles.summary}>
          <p>
            <b>The full algorithm</b> wraps this in a scaling loop. Weights are multiplied by 2n ={' '}
            {run.full.info.scaleFactor}, then {run.full.info.scalingRounds.length} rounds each halve how negative an
            edge may be ({run.full.info.scalingRounds.map((r) => `≥ −${r.bound}`).join(', ')}). In total that took{' '}
            {run.full.info.scaleDownCalls} calls of the four-phase method on this graph, and its distances{' '}
            {run.full.kind === 'paths' && run.full.dist.every((d, v) => d === run.dist[v])
              ? 'match the ones above.'
              : 'differ (please report this).'}
          </p>
        </div>
      )}
      <PlayerControls playback={stepper} />
      <p className={styles.note}>
        <b>What's simplified here:</b> this is one pass of the method aiming straight for "every edge ≥ 0", and its
        clusters are random balls with a size tuned for a small graph. The real algorithm repeats the pass inside the
        scaling loop described below, and uses a more careful clustering step that guarantees its speed. Vertex{' '}
        {vertexLabel(graph, source)} is the start.
      </p>
    </Figure>
  );
}
