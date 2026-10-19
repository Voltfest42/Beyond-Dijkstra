import { createGraph, type Graph, type GraphJson } from '../core/graph';
import { randomGraph } from '../core/generators';
import {
  BMSSP_DEMO,
  BNW_DEMO,
  DIJKSTRA_INTRO,
  DIJKSTRA_TRAP,
  FINDPIVOTS_DEMO,
  GOLD_FARM,
  NEGATIVE_STAIRCASE,
  POTENTIALS_PUZZLE,
} from '../core/presets';

/** The playground's editable graph: plain data, easy to change and to save as JSON. */
export interface EditableGraph {
  vertices: { label: string; x: number; y: number }[];
  edges: { from: number; to: number; weight: number }[];
}

export const CANVAS = { width: 790, height: 440 };
export const MAX_VERTICES = 30;
export const MAX_EDGES = 90;
export const WEIGHT_LIMIT = 999;

export function toGraph(model: EditableGraph): Graph {
  return createGraph(model.vertices.length, model.edges, {
    labels: model.vertices.map((v) => v.label),
    positions: model.vertices.map(({ x, y }) => ({ x, y })),
  });
}

function fromGraph(g: Graph): EditableGraph {
  return {
    vertices: Array.from({ length: g.n }, (_, v) => ({
      label: g.labels?.[v] ?? String(v),
      x: g.positions?.[v].x ?? 0,
      y: g.positions?.[v].y ?? 0,
    })),
    edges: Array.from({ length: g.m }, (_, e) => ({ from: g.edgeFrom[e], to: g.edgeTo[e], weight: g.edgeWeight[e] })),
  };
}

/** A random graph laid out on a circle, with every vertex reachable from A. */
export function randomModel(seed: number, n = 10, negative = false): EditableGraph {
  const g = randomGraph({ n, m: Math.round(n * 2.2), minWeight: negative ? -3 : 1, maxWeight: 9, seed, reachableFrom: 0 });
  return {
    vertices: Array.from({ length: n }, (_, v) => {
      const angle = (2 * Math.PI * v) / n - Math.PI / 2;
      return { label: labelFor(v), x: Math.round(395 + 300 * Math.cos(angle)), y: Math.round(220 + 175 * Math.sin(angle)) };
    }),
    edges: Array.from({ length: g.m }, (_, e) => ({ from: g.edgeFrom[e], to: g.edgeTo[e], weight: g.edgeWeight[e] })),
  };
}

export const PRESETS: { id: string; name: string; build: () => EditableGraph }[] = [
  { id: 'intro', name: 'Chapter 1: the town map', build: () => fromGraph(DIJKSTRA_INTRO) },
  { id: 'trap', name: 'Chapter 2: one negative edge', build: () => fromGraph(DIJKSTRA_TRAP) },
  { id: 'gold', name: 'Chapter 2: the gold farm (negative cycle)', build: () => fromGraph(GOLD_FARM) },
  { id: 'puzzle', name: 'Chapter 2: the potentials puzzle', build: () => fromGraph(POTENTIALS_PUZZLE) },
  { id: 'staircase', name: 'Chapter 2: the negative staircase', build: () => fromGraph(NEGATIVE_STAIRCASE) },
  { id: 'bnw', name: 'Chapter 2: the 2022 walkthrough graph', build: () => fromGraph(BNW_DEMO) },
  { id: 'pivots', name: 'Chapter 3: the FindPivots graph', build: () => fromGraph(FINDPIVOTS_DEMO) },
  { id: 'bmssp', name: 'Chapter 3: the 2025 walkthrough graph', build: () => fromGraph(BMSSP_DEMO) },
  { id: 'empty', name: 'Empty canvas', build: () => ({ vertices: [], edges: [] }) },
];

/** A, B, …, Z, then A1, B1, … */
export function labelFor(index: number): string {
  const letter = String.fromCharCode(65 + (index % 26));
  return index < 26 ? letter : `${letter}${Math.floor(index / 26)}`;
}

export function nextLabel(model: EditableGraph): string {
  const used = new Set(model.vertices.map((v) => v.label));
  for (let i = 0; ; i++) if (!used.has(labelFor(i))) return labelFor(i);
}

/** Validates imported JSON (the same format the playground exports). */
export function parseModel(text: string): EditableGraph {
  const data = JSON.parse(text) as Partial<GraphJson>;
  if (typeof data.n !== 'number' || !Array.isArray(data.edges)) throw new Error('Expected an object with "n" and "edges".');
  if (data.n < 1 || data.n > MAX_VERTICES) throw new Error(`The playground supports 1 to ${MAX_VERTICES} vertices.`);
  if (data.edges.length > MAX_EDGES) throw new Error(`The playground supports up to ${MAX_EDGES} edges.`);
  const g = createGraph(data.n, data.edges, {}); // validates vertex ids and weights
  for (let e = 0; e < g.m; e++) {
    if (Math.abs(g.edgeWeight[e]) > WEIGHT_LIMIT) throw new Error(`Weights must be between −${WEIGHT_LIMIT} and ${WEIGHT_LIMIT}.`);
  }
  const fallback = randomModel(1, data.n);
  return {
    vertices: Array.from({ length: data.n }, (_, v) => ({
      label: String(data.labels?.[v] ?? labelFor(v)).slice(0, 3),
      x: clamp(Number(data.positions?.[v]?.x ?? fallback.vertices[v].x), 30, CANVAS.width - 30),
      y: clamp(Number(data.positions?.[v]?.y ?? fallback.vertices[v].y), 30, CANVAS.height - 30),
    })),
    edges: data.edges.map(({ from, to, weight }) => ({ from, to, weight })),
  };
}

export function toJsonText(model: EditableGraph): string {
  const json: GraphJson = {
    n: model.vertices.length,
    edges: model.edges,
    labels: model.vertices.map((v) => v.label),
    positions: model.vertices.map(({ x, y }) => ({ x, y })),
  };
  return JSON.stringify(json, null, 2);
}

export function clamp(x: number, lo: number, hi: number): number {
  return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : lo;
}
