import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { layoutEdges, NODE_RADIUS } from '../viz/geometry';
import { formatWeight } from '../viz/format';
import { CANVAS, clamp, toGraph, type EditableGraph } from './model';
import styles from './Playground.module.css';

export type Selection = { kind: 'vertex'; index: number } | { kind: 'edge'; index: number } | null;

interface EditorCanvasProps {
  model: EditableGraph;
  selection: Selection;
  source: number;
  onSelect: (selection: Selection) => void;
  onAddVertex: (x: number, y: number) => void;
  /** Clicking a second vertex while one is selected connects them. */
  onConnect: (from: number, to: number) => void;
  onMove: (index: number, x: number, y: number) => void;
}

/** The playground's drawing surface: click to add, click two vertices to connect, drag to move. */
export function EditorCanvas({ model, selection, source, onSelect, onAddVertex, onConnect, onMove }: EditorCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ index: number; startX: number; startY: number; moved: boolean } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const graph = useMemo(() => toGraph(model), [model]);
  const edges = useMemo(() => layoutEdges(graph, graph.positions!), [graph]);

  const toCanvas = (event: PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS.width,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS.height,
    };
  };

  const selectedVertex = selection?.kind === 'vertex' ? selection.index : null;

  return (
    <svg
      ref={svgRef}
      className={styles.canvas}
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      role="application"
      aria-label="Graph editor. Click empty space to add a vertex. Click a vertex, then another, to connect them. Click an edge to change its weight."
      onPointerDown={(event) => {
        if (event.target !== svgRef.current) return;
        const { x, y } = toCanvas(event);
        if (selection) onSelect(null);
        else onAddVertex(clamp(x, NODE_RADIUS + 4, CANVAS.width - NODE_RADIUS - 4), clamp(y, NODE_RADIUS + 4, CANVAS.height - NODE_RADIUS - 4));
      }}
      onPointerMove={(event) => {
        const d = drag.current;
        if (!d) return;
        const { x, y } = toCanvas(event);
        if (!d.moved && Math.hypot(x - d.startX, y - d.startY) < 4) return;
        d.moved = true;
        onMove(d.index, clamp(x, NODE_RADIUS, CANVAS.width - NODE_RADIUS), clamp(y, NODE_RADIUS, CANVAS.height - NODE_RADIUS));
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (!d || d.moved) return;
        if (selectedVertex !== null && selectedVertex !== d.index) onConnect(selectedVertex, d.index);
        else onSelect(selectedVertex === d.index ? null : { kind: 'vertex', index: d.index });
      }}
    >
      {edges.map((geo, e) => {
        const selected = selection?.kind === 'edge' && selection.index === e;
        const weight = model.edges[e].weight;
        const text = formatWeight(weight);
        const width = 16 + text.length * 8.5;
        return (
          <g
            key={e}
            className={`${styles.edge} ${weight < 0 ? styles.negative : ''} ${selected ? styles.selectedEdge : ''}`}
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelect({ kind: 'edge', index: e });
            }}
          >
            <path d={geo.path} className={styles.hit} />
            <path d={geo.path} className={styles.edgeLine} />
            <polygon points={geo.arrow} className={styles.arrow} />
            <rect x={geo.label.x - width / 2} y={geo.label.y - 12} width={width} height={24} rx={7} className={styles.weightBg} />
            <text x={geo.label.x} y={geo.label.y} dy="0.35em" className={styles.weight}>
              {text}
            </text>
          </g>
        );
      })}
      {model.vertices.map((v, i) => (
        <g
          key={i}
          className={`${styles.vertex} ${selectedVertex === i ? styles.selectedVertex : ''} ${hover === i && selectedVertex !== null && selectedVertex !== i ? styles.target : ''}`}
          transform={`translate(${v.x} ${v.y})`}
          onPointerDown={(event) => {
            event.stopPropagation();
            (event.target as Element).setPointerCapture?.(event.pointerId);
            const p = toCanvas(event);
            drag.current = { index: i, startX: p.x, startY: p.y, moved: false };
          }}
          onPointerEnter={() => setHover(i)}
          onPointerLeave={() => setHover(null)}
        >
          <circle r={NODE_RADIUS} />
          <text dy="0.35em">{v.label}</text>
          {i === source && (
            <text className={styles.startTag} y={NODE_RADIUS + 15}>
              start
            </text>
          )}
        </g>
      ))}
      {model.vertices.length === 0 && (
        <text x={CANVAS.width / 2} y={CANVAS.height / 2} className={styles.emptyHint}>
          Click anywhere to add a vertex
        </text>
      )}
    </svg>
  );
}
