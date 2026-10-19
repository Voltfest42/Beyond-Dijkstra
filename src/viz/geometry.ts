import type { Graph, Point } from '../core/graph';

export interface EdgeGeometry {
  /** SVG path for the edge's line, ending at the arrowhead's base. */
  path: string;
  /** Arrowhead triangle, as an SVG points list. */
  arrow: string;
  /** Where to put the weight label. */
  label: Point;
}

export const NODE_RADIUS = 20;
const ARROW_LENGTH = 11;
const ARROW_HALF_WIDTH = 5.5;
/** Sideways spacing between parallel edges (and between u → v and v → u). */
const BEND_SPACING = 34;

/**
 * Lays out every edge. Edges between the same pair of vertices (in either
 * direction) are bent apart symmetrically so they never draw on top of each other.
 */
export function layoutEdges(g: Graph, positions: readonly Point[]): EdgeGeometry[] {
  const groups = new Map<string, number[]>();
  for (let e = 0; e < g.m; e++) {
    const a = Math.min(g.edgeFrom[e], g.edgeTo[e]);
    const b = Math.max(g.edgeFrom[e], g.edgeTo[e]);
    const key = `${a}-${b}`;
    const group = groups.get(key);
    if (group) group.push(e);
    else groups.set(key, [e]);
  }

  const result = new Array<EdgeGeometry>(g.m);
  for (const group of groups.values()) {
    group.forEach((e, i) => {
      const u = g.edgeFrom[e];
      const v = g.edgeTo[e];
      if (u === v) {
        result[e] = selfLoop(positions[u], i);
        return;
      }
      // Offsets are measured in the frame of the canonical direction (lower id → higher id),
      // so a reversed edge with the same offset bends to the opposite side.
      let bend = (i - (group.length - 1) / 2) * BEND_SPACING;
      if (u > v) bend = -bend;
      result[e] = curvedEdge(positions[u], positions[v], bend);
    });
  }
  return result;
}

function curvedEdge(p: Point, q: Point, bend: number): EdgeGeometry {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  // Unit normal, pointing to the right of p → q.
  const nx = -dy / len;
  const ny = dx / len;
  const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  // Quadratic control point: twice the bend, so the curve's midpoint sits `bend` away from the chord.
  const c = { x: mid.x + nx * bend * 2, y: mid.y + ny * bend * 2 };

  const start = towards(p, c, NODE_RADIUS);
  const tip = towards(q, c, NODE_RADIUS);
  const base = towards(tip, c, ARROW_LENGTH);
  const label = { x: 0.25 * p.x + 0.5 * c.x + 0.25 * q.x, y: 0.25 * p.y + 0.5 * c.y + 0.25 * q.y };

  const path = bend === 0 ? `M${f(start)} L${f(base)}` : `M${f(start)} Q${f(c)} ${f(base)}`;
  return { path, arrow: arrowHead(tip, base), label };
}

function selfLoop(p: Point, index: number): EdgeGeometry {
  const size = 34 + index * 14;
  const start = { x: p.x - 9, y: p.y - NODE_RADIUS + 2 };
  const tip = { x: p.x + 9, y: p.y - NODE_RADIUS + 2 };
  const c1 = { x: p.x - size, y: p.y - NODE_RADIUS - size * 1.3 };
  const c2 = { x: p.x + size, y: p.y - NODE_RADIUS - size * 1.3 };
  const base = towards(tip, c2, ARROW_LENGTH);
  return {
    path: `M${f(start)} C${f(c1)} ${f(c2)} ${f(base)}`,
    arrow: arrowHead(tip, base),
    label: { x: p.x, y: p.y - NODE_RADIUS - size * 0.95 },
  };
}

/** The point `distance` along the straight line from `from` towards `to`. */
function towards(from: Point, to: Point, distance: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / len) * distance, y: from.y + (dy / len) * distance };
}

function arrowHead(tip: Point, base: Point): string {
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * ARROW_HALF_WIDTH;
  const ny = (dx / len) * ARROW_HALF_WIDTH;
  return `${f(tip)} ${f({ x: base.x + nx, y: base.y + ny })} ${f({ x: base.x - nx, y: base.y - ny })}`;
}

function f(p: Point): string {
  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
}

/** viewBox that fits every vertex (plus self-loops and labels) with some margin. */
export function viewBoxFor(positions: readonly Point[], margin = 48): string {
  if (positions.length === 0) return '0 0 100 100';
  const xs = positions.map((p) => p.x);
  const ys = positions.map((p) => p.y);
  const minX = Math.min(...xs) - margin;
  const minY = Math.min(...ys) - margin;
  return `${minX} ${minY} ${Math.max(...xs) - minX + margin} ${Math.max(...ys) - minY + margin}`;
}

/** Fallback layout for graphs without positions: vertices evenly spaced on a circle. */
export function circleLayout(n: number, radius = 220): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1) - Math.PI / 2;
    return { x: radius + radius * Math.cos(angle), y: radius + radius * Math.sin(angle) };
  });
}
