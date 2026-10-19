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
 * Chapter 2's opening example: a game map where one path earns gold (a
 * negative cost). Town → Forest → Cave → Town totals 2 − 6 + 3 = −1: a
 * negative cycle, i.e. an infinite-farming exploit.
 */
export const GOLD_FARM = buildPreset({
  vertices: [
    { label: 'T', x: 90, y: 200 },
    { label: 'F', x: 330, y: 70 },
    { label: 'C', x: 330, y: 330 },
    { label: 'S', x: 600, y: 200 },
  ],
  edges: [
    ['T', 'F', 2],
    ['F', 'C', -6],
    ['C', 'T', 3],
    ['F', 'S', 5],
    ['C', 'S', 4],
  ],
});
export const GOLD_FARM_NAMES = ['Town', 'Forest', 'Cave', 'Shop'];

/**
 * The trap: one negative edge (B → A) that Dijkstra discovers too late.
 * Dijkstra from S answers A 2, C 3, D 5; the truth is A 1, C 2, D 4.
 * Edge C → B (index 6) closes the loop B → A → C → B, which weighs
 * −4 + 1 + w: zero at w = 3, a negative cycle below that.
 */
export const DIJKSTRA_TRAP = buildPreset({
  vertices: [
    { label: 'S', x: 70, y: 200 },
    { label: 'A', x: 260, y: 70 },
    { label: 'B', x: 260, y: 330 },
    { label: 'C', x: 470, y: 70 },
    { label: 'D', x: 660, y: 200 },
  ],
  edges: [
    ['S', 'A', 2],
    ['S', 'B', 5],
    ['B', 'A', -4],
    ['A', 'C', 1],
    ['C', 'D', 2],
    ['B', 'D', 6],
    ['C', 'B', 3],
  ],
});
export const TRAP_LOOP_EDGE = 6;

/**
 * The potentials puzzle: two negative edges (A → B, C → T), no negative cycle,
 * and five different S → T routes. The shortest is S → A → B → C → T (length 0).
 */
export const POTENTIALS_PUZZLE = buildPreset({
  vertices: [
    { label: 'S', x: 70, y: 200 },
    { label: 'A', x: 260, y: 70 },
    { label: 'B', x: 260, y: 330 },
    { label: 'C', x: 470, y: 200 },
    { label: 'T', x: 670, y: 200 },
  ],
  edges: [
    ['S', 'A', 3],
    ['S', 'B', 4],
    ['A', 'B', -2],
    ['A', 'C', 5],
    ['B', 'C', 2],
    ['B', 'T', 6],
    ['C', 'T', -3],
  ],
});

/**
 * A staircase of negative edges: the shortest route to F uses five of them
 * (S → A → B → C → D → E → F = 6 − 5 = 1), while positive shortcuts from S
 * give misleading first guesses. The hybrid needs η + 1 = 6 rounds here.
 * The staircase edges are listed top-down on purpose: Bellman–Ford checks
 * edges in list order, and in this order each round climbs only one step,
 * so it needs every one of its n − 1 rounds (as the chapter describes).
 */
export const NEGATIVE_STAIRCASE = buildPreset({
  vertices: [
    { label: 'S', x: 60, y: 300 },
    { label: 'A', x: 150, y: 90 },
    { label: 'B', x: 270, y: 50 },
    { label: 'C', x: 390, y: 50 },
    { label: 'D', x: 510, y: 50 },
    { label: 'E', x: 630, y: 90 },
    { label: 'F', x: 730, y: 200 },
  ],
  edges: [
    ['S', 'C', 7],
    ['S', 'E', 5],
    ['S', 'F', 3],
    ['E', 'F', -1],
    ['D', 'E', -1],
    ['C', 'D', -1],
    ['B', 'C', -1],
    ['A', 'B', -1],
    ['S', 'A', 6],
  ],
});

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
