import { createGraph, type EdgeSpec, type Graph, type Point } from './graph';

/** A hand-made example: labelled vertices with fixed positions, built for one story beat. */
interface PresetSpec {
  vertices: { label: string; x: number; y: number }[];
  edges: [from: string, to: string, weight: number][];
}

function buildPreset({ vertices, edges }: PresetSpec): Graph {
  const index = new Map(vertices.map((v, i) => [v.label, i]));
  const id = (label: string) => {
    const v = index.get(label);
    if (v === undefined) throw new Error(`Preset refers to unknown vertex ${label}`);
    return v;
  };
  const specs: EdgeSpec[] = edges.map(([from, to, weight]) => ({ from: id(from), to: id(to), weight }));
  const positions: Point[] = vertices.map(({ x, y }) => ({ x, y }));
  return createGraph(vertices.length, specs, { labels: vertices.map((v) => v.label), positions });
}

/**
 * Chapter 1's map. Starting from S it shows every behaviour worth seeing:
 * decrease-keys (A: 4 → 3, E: 12 → 11), a "not shorter" relaxation (C → D),
 * an edge into an already-settled vertex (D → A), and a tie (E and F at 11).
 * Settle order from S: S 0, B 2, A 3, C 8, D 9, E 11, F 11, T 14.
 */
export const DIJKSTRA_INTRO = buildPreset({
  vertices: [
    { label: 'S', x: 70, y: 210 },
    { label: 'A', x: 230, y: 90 },
    { label: 'B', x: 230, y: 330 },
    { label: 'C', x: 420, y: 50 },
    { label: 'D', x: 420, y: 215 },
    { label: 'E', x: 420, y: 370 },
    { label: 'F', x: 610, y: 140 },
    { label: 'T', x: 740, y: 290 },
  ],
  edges: [
    ['S', 'A', 4],
    ['S', 'B', 2],
    ['B', 'A', 1],
    ['A', 'C', 5],
    ['A', 'D', 8],
    ['B', 'D', 7],
    ['B', 'E', 10],
    ['C', 'D', 1],
    ['C', 'F', 3],
    ['D', 'A', 2],
    ['D', 'E', 2],
    ['D', 'F', 4],
    ['E', 'T', 3],
    ['F', 'T', 6],
  ],
});
