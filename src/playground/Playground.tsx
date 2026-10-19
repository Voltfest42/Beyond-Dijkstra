import { useMemo, useRef, useState } from 'react';
import { BELLMAN_FORD_PSEUDOCODE, bellmanFord } from '../core/algorithms/bellmanFord';
import { BMSSP_PSEUDOCODE, bmssp } from '../core/algorithms/bmssp';
import { bnw } from '../core/algorithms/bnw';
import { DIJKSTRA_PSEUDOCODE, dijkstra } from '../core/algorithms/dijkstra';
import { HYBRID_PSEUDOCODE, hybrid } from '../core/algorithms/hybrid';
import type { Graph } from '../core/graph';
import { cycleWeight } from '../core/sssp';
import { initialState } from '../core/trace';
import { RunFigure, type Algorithm } from '../figures/RunFigure';
import { ErrorBoundary } from '../site/ErrorBoundary';
import { Caption, Figure, Legend } from '../viz/Figure';
import { formatDist } from '../viz/format';
import { GraphView } from '../viz/GraphView';
import { EditorCanvas, type Selection } from './EditorCanvas';
import {
  MAX_EDGES,
  MAX_VERTICES,
  nextLabel,
  parseModel,
  PRESETS,
  randomModel,
  toGraph,
  toJsonText,
  WEIGHT_LIMIT,
  type EditableGraph,
} from './model';
import figureStyles from '../figures/figures.module.css';
import pageStyles from '../site/pages/pages.module.css';
import styles from './Playground.module.css';

type AlgorithmId = 'dijkstra' | 'bellman-ford' | 'hybrid' | 'bnw' | 'bmssp';

const ALGORITHMS: { id: AlgorithmId; name: string; blurb: string }[] = [
  { id: 'dijkstra', name: 'Dijkstra', blurb: 'Chapter 1. Fast, but wrong with negative edges: red badges show where.' },
  { id: 'bellman-ford', name: 'Bellman–Ford', blurb: 'Chapter 2. Handles negative edges and finds negative cycles; slow.' },
  { id: 'hybrid', name: 'Hybrid', blurb: 'Chapter 2. Dijkstra passes plus Bellman–Ford passes over negative edges.' },
  { id: 'bnw', name: '2022 algorithm', blurb: 'Chapter 2. Negative edges in near-linear time. Whole numbers only; shown as a result.' },
  { id: 'bmssp', name: '2025 algorithm', blurb: 'Chapter 3. Beats the sorting barrier. No negative edges. Uses k = 2, t = 2.' },
];

const bmsspDemo: Algorithm = (g, s, options) => bmssp(g, s, { ...options, params: { k: 2, t: 2 } });

export function Playground() {
  const [model, setModel] = useState<EditableGraph>(() => PRESETS[0].build());
  const [version, setVersion] = useState(0);
  const [selection, setSelection] = useState<Selection>(null);
  const [source, setSource] = useState(0);
  const [mode, setMode] = useState<'edit' | 'run'>('edit');
  const [algorithm, setAlgorithm] = useState<AlgorithmId>('dijkstra');
  const [seed, setSeed] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (next: EditableGraph) => {
    setModel(next);
    setVersion((v) => v + 1);
  };
  const load = (next: EditableGraph, note: string | null = null) => {
    update(next);
    setSelection(null);
    setSource(0);
    setMessage(note);
  };

  const graph = useMemo(() => toGraph(model), [model]);

  const addVertex = (x: number, y: number) => {
    if (model.vertices.length >= MAX_VERTICES) return setMessage(`The playground holds up to ${MAX_VERTICES} vertices.`);
    update({ ...model, vertices: [...model.vertices, { label: nextLabel(model), x: Math.round(x), y: Math.round(y) }] });
    setSelection({ kind: 'vertex', index: model.vertices.length });
    setMessage(null);
  };

  const connect = (from: number, to: number) => {
    const existing = model.edges.findIndex((e) => e.from === from && e.to === to);
    if (existing >= 0) return setSelection({ kind: 'edge', index: existing });
    if (model.edges.length >= MAX_EDGES) return setMessage(`The playground holds up to ${MAX_EDGES} edges.`);
    update({ ...model, edges: [...model.edges, { from, to, weight: 1 }] });
    setSelection({ kind: 'edge', index: model.edges.length });
    setMessage(null);
  };

  const deleteVertex = (index: number) => {
    const remap = (v: number) => (v > index ? v - 1 : v);
    update({
      vertices: model.vertices.filter((_, i) => i !== index),
      edges: model.edges.filter((e) => e.from !== index && e.to !== index).map((e) => ({ ...e, from: remap(e.from), to: remap(e.to) })),
    });
    setSource((s) => (s === index ? 0 : remap(s)));
    setSelection(null);
  };

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([toJsonText(model)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      load(parseModel(await file.text()), `Loaded ${file.name}.`);
    } catch (error) {
      setMessage(`Couldn't load that file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const empty = model.vertices.length === 0;

  return (
    <article className={`${pageStyles.page} ${styles.page}`}>
      <header className={pageStyles.chapterHeader}>
        <p className={pageStyles.kicker}>Playground</p>
        <h1>Try it on your own graph</h1>
        <p className={pageStyles.lede}>
          Draw a graph or start from one of the site's examples, then step through any of the algorithms on it.
        </p>
      </header>

      <div className={figureStyles.toolbar}>
        <label className={figureStyles.inputLabel}>
          Start from:
          <select
            className={styles.select}
            value=""
            onChange={(e) => {
              const preset = PRESETS.find((p) => p.id === e.target.value);
              if (preset) load(preset.build());
            }}
          >
            <option value="" disabled>
              Choose an example…
            </option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={figureStyles.toolButton} onClick={() => {
            setSeed(seed + 1);
            load(randomModel(seed + 1));
          }}>
          Random graph 🎲
        </button>
        <button type="button" className={figureStyles.toolButton} onClick={() => {
            setSeed(seed + 1);
            load(randomModel(seed + 1, 10, true));
          }}>
          Random, with negative edges 🎲
        </button>
        <button type="button" className={figureStyles.toolButton} onClick={exportJson} disabled={empty}>
          Save as JSON
        </button>
        <button type="button" className={figureStyles.toolButton} onClick={() => fileRef.current?.click()}>
          Open JSON…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            void importJson(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}

      <div className={styles.tabs} role="tablist" aria-label="Mode">
        {(['edit', 'run'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? styles.activeTab : undefined}
            onClick={() => setMode(m)}
            disabled={m === 'run' && empty}
          >
            {m === 'edit' ? '✏️ Edit the graph' : '▶ Run an algorithm'}
          </button>
        ))}
      </div>

      {mode === 'edit' ? (
        <div className={styles.editor}>
          <EditorCanvas
            model={model}
            selection={selection}
            source={source}
            onSelect={setSelection}
            onAddVertex={addVertex}
            onConnect={connect}
            onMove={(i, x, y) => setModel((m) => ({ ...m, vertices: m.vertices.map((v, j) => (j === i ? { ...v, x: Math.round(x), y: Math.round(y) } : v)) }))}
          />
          <Inspector
            model={model}
            selection={selection}
            source={source}
            onWeight={(e, weight) => update({ ...model, edges: model.edges.map((edge, i) => (i === e ? { ...edge, weight } : edge)) })}
            onDeleteEdge={(e) => {
              update({ ...model, edges: model.edges.filter((_, i) => i !== e) });
              setSelection(null);
            }}
            onDeleteVertex={deleteVertex}
            onMakeStart={setSource}
          />
        </div>
      ) : (
        <RunPanel graph={graph} version={version} source={source} algorithm={algorithm} onAlgorithm={setAlgorithm} />
      )}
    </article>
  );
}

function Inspector({
  model,
  selection,
  source,
  onWeight,
  onDeleteEdge,
  onDeleteVertex,
  onMakeStart,
}: {
  model: EditableGraph;
  selection: Selection;
  source: number;
  onWeight: (edge: number, weight: number) => void;
  onDeleteEdge: (edge: number) => void;
  onDeleteVertex: (vertex: number) => void;
  onMakeStart: (vertex: number) => void;
}) {
  const label = (v: number) => model.vertices[v]?.label ?? '?';

  if (selection?.kind === 'edge' && model.edges[selection.index]) {
    const edge = model.edges[selection.index];
    return (
      <aside className={styles.inspector}>
        <h4>
          Edge {label(edge.from)} → {label(edge.to)}
        </h4>
        <WeightInput key={selection.index} value={edge.weight} onChange={(w) => onWeight(selection.index, w)} />
        <p className={styles.hint}>Negative weights are allowed. Dijkstra and the 2025 algorithm can't handle them, but the others can.</p>
        <button type="button" className={figureStyles.toolButton} onClick={() => onDeleteEdge(selection.index)}>
          Delete this edge
        </button>
      </aside>
    );
  }

  if (selection?.kind === 'vertex' && model.vertices[selection.index]) {
    const v = selection.index;
    return (
      <aside className={styles.inspector}>
        <h4>Vertex {label(v)}</h4>
        <p className={styles.hint}>
          Click another vertex to draw an edge from {label(v)} to it. Drag a vertex to move it.
        </p>
        <div className={styles.buttonRow}>
          <button type="button" className={figureStyles.toolButton} onClick={() => onMakeStart(v)} disabled={v === source}>
            {v === source ? 'This is the start' : 'Make this the start'}
          </button>
          <button type="button" className={figureStyles.toolButton} onClick={() => onDeleteVertex(v)}>
            Delete vertex
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.inspector}>
      <h4>How to edit</h4>
      <ul className={styles.howTo}>
        <li>Click empty space to add a vertex.</li>
        <li>Click a vertex, then another, to connect them (one-way).</li>
        <li>Click an edge to change its weight or delete it.</li>
        <li>Drag vertices to tidy the layout.</li>
        <li>Click empty space to clear the selection.</li>
      </ul>
      <p className={styles.hint}>
        {model.vertices.length} of {MAX_VERTICES} vertices, {model.edges.length} of {MAX_EDGES} edges. Start:{' '}
        {model.vertices[source]?.label ?? '–'}.
      </p>
    </aside>
  );
}

function WeightInput({ value, onChange }: { value: number; onChange: (weight: number) => void }) {
  const [text, setText] = useState(String(value));
  const parsed = Number(text);
  const valid = text.trim() !== '' && Number.isFinite(parsed) && Math.abs(parsed) <= WEIGHT_LIMIT;
  return (
    <label className={styles.weightLabel}>
      Weight
      <input
        className={figureStyles.textInput}
        type="number"
        step="any"
        value={text}
        aria-invalid={!valid}
        autoFocus
        onChange={(e) => {
          setText(e.target.value);
          const w = Number(e.target.value);
          if (e.target.value.trim() !== '' && Number.isFinite(w) && Math.abs(w) <= WEIGHT_LIMIT) onChange(w);
        }}
      />
      {!valid && <span className={figureStyles.bad}>Use a number from −{WEIGHT_LIMIT} to {WEIGHT_LIMIT}.</span>}
    </label>
  );
}

function RunPanel({
  graph,
  version,
  source,
  algorithm,
  onAlgorithm,
}: {
  graph: Graph;
  version: number;
  source: number;
  algorithm: AlgorithmId;
  onAlgorithm: (id: AlgorithmId) => void;
}) {
  const hasNegative = Array.from(graph.edgeWeight).some((w) => w < 0);
  const allIntegers = Array.from(graph.edgeWeight).every(Number.isInteger);
  const info = ALGORITHMS.find((a) => a.id === algorithm)!;
  let blocked: string | null = null;
  if (algorithm === 'bmssp' && hasNegative) blocked = 'The 2025 algorithm needs non-negative weights, and this graph has negative edges. Try Bellman–Ford or the hybrid instead.';
  if (algorithm === 'bnw' && !allIntegers) blocked = 'The 2022 algorithm needs whole-number weights (its scaling trick relies on them).';

  return (
    <div>
      <div className={figureStyles.toolbar}>
        <span className={figureStyles.segmented} role="group" aria-label="Algorithm">
          {ALGORITHMS.map((a) => (
            <button key={a.id} type="button" aria-pressed={algorithm === a.id} onClick={() => onAlgorithm(a.id)}>
              {a.name}
            </button>
          ))}
        </span>
      </div>
      <p className={styles.hint}>{info.blurb}</p>
      {blocked ? (
        <p className={styles.message} role="status">
          {blocked}
        </p>
      ) : algorithm === 'bnw' ? (
        <BnwResultView graph={graph} source={source} />
      ) : (
        <RunFigure
          key={`${version}-${algorithm}-${source}`}
          number=""
          title={`${info.name} on your graph`}
          graph={graph}
          source={source}
          pickSource
          algorithm={
            algorithm === 'dijkstra' ? dijkstra : algorithm === 'bellman-ford' ? bellmanFord : algorithm === 'hybrid' ? (hybrid as Algorithm) : bmsspDemo
          }
          pseudocode={
            algorithm === 'dijkstra'
              ? DIJKSTRA_PSEUDOCODE
              : algorithm === 'bellman-ford'
                ? BELLMAN_FORD_PSEUDOCODE
                : algorithm === 'hybrid'
                  ? HYBRID_PSEUDOCODE
                  : BMSSP_PSEUDOCODE
          }
          showQueue={algorithm === 'dijkstra'}
          showTruth={algorithm === 'dijkstra' && hasNegative}
          showDistanceLine={!hasNegative}
          legend={['unvisited', 'frontier', 'settled', 'current', 'tree', 'improved', 'checked', 'negative', 'cycle']}
          counters={({ state, stats }) => [
            { label: 'Relaxations so far', value: state.relaxations },
            { label: 'Relaxations in total', value: stats.relaxations },
          ]}
        />
      )}
    </div>
  );
}

/** The 2022 algorithm has no step-by-step trace here; show its result and some numbers about the run. */
function BnwResultView({ graph, source }: { graph: Graph; source: number }) {
  const result = useMemo(() => bnw(graph, source), [graph, source]);
  const state = useMemo(() => {
    const s = initialState(graph.n);
    if (result.kind === 'paths') {
      s.dist = Array.from(result.dist);
      s.predEdge = Array.from(result.predEdge);
      s.status = s.dist.map((d) => (d === Infinity ? 'unvisited' : 'settled'));
    } else {
      s.negativeCycle = result.cycle;
    }
    s.done = true;
    return s;
  }, [graph, result]);
  const { info } = result;

  return (
    <ErrorBoundary what="this result">
      <Figure number="" title="The 2022 algorithm on your graph (result)">
        <GraphView graph={graph} state={state} source={source} showDistances={result.kind === 'paths'} ariaLabel="The 2022 algorithm's result on your graph." />
        <Legend items={result.kind === 'paths' ? ['settled', 'tree', 'negative'] : ['negative', 'cycle']} />
        <Caption>
          {result.kind === 'negative-cycle'
            ? `Negative cycle found (dashed), with total weight ${formatDist(cycleWeight(graph, result.cycle))}: shortest distances don't exist.`
            : info.scalingRounds.length === 0
              ? 'No negative edges, so the algorithm goes straight to Dijkstra.'
              : `Weights were multiplied by 2n = ${info.scaleFactor}, then ${info.scalingRounds.length} scaling rounds halved the allowed negativity down to −1, using ${info.scaleDownCalls} calls of the four-phase method. A final Dijkstra gave these distances.`}
        </Caption>
        <p className={figureStyles.note}>
          This algorithm runs in one go here. To see it phase by phase, use Figure 2.6 in Chapter 2.
        </p>
      </Figure>
    </ErrorBoundary>
  );
}
