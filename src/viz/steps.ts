import { vertexLabel, type Graph } from '../core/graph';
import type { TraceEvent, VisualState } from '../core/trace';
import { formatDist, formatWeight } from './format';

/** Events that only set context (pseudocode line, caption, round number) never end a step. */
function isSubstantive(e: TraceEvent): boolean {
  return e.kind !== 'line' && e.kind !== 'phase' && e.kind !== 'round';
}

/** Pairs that read as one action: "pop B" + "settle B", "relax B → A" + "queue A". */
function continues(prev: TraceEvent, next: TraceEvent): boolean {
  // Only insertions/decreases continue a relaxation; a pop is the next vertex's own step.
  const queued = next.kind === 'queue' && next.op !== 'pop';
  return (
    (prev.kind === 'queue' && prev.op === 'pop' && next.kind === 'settle') ||
    (prev.kind === 'relax' && queued) ||
    (prev.kind === 'source' && queued)
  );
}

/**
 * Event counts at which a step ends. stops[0] = 0 is the starting picture;
 * stepping k times shows the state after events[0 .. stops[k]).
 */
export function computeStops(events: readonly TraceEvent[]): number[] {
  const stops = [0];
  for (let i = 0; i < events.length; i++) {
    if (!isSubstantive(events[i])) continue;
    let j = i + 1;
    while (j < events.length && !isSubstantive(events[j])) j++;
    if (j < events.length && continues(events[i], events[j])) continue;
    stops.push(i + 1);
  }
  if (stops[stops.length - 1] !== events.length) stops.push(events.length);
  return stops;
}

/**
 * One or two plain-English sentences saying what the step just did.
 * `before` is the state when the step began, so "drops from 4 to 3" can be said.
 */
export function describeStep(g: Graph, events: readonly TraceEvent[], before: VisualState): string {
  const name = (v: number) => vertexLabel(g, v);
  const parts: string[] = [];
  let phase: string | null = null;

  for (const e of events) {
    switch (e.kind) {
      case 'source':
        parts.push(`Start at ${name(e.v)}: its distance is 0, and every other vertex starts at ∞.`);
        break;
      case 'queue':
        if (e.op === 'push' && parts.length === 0) parts.push(`${name(e.v)} joins the queue.`);
        break;
      case 'settle': {
        parts.push(
          `${name(e.v)} has the smallest distance in the queue (${formatDist(before.queue.get(e.v) ?? before.dist[e.v])}), so it is settled: that distance is now final.`,
        );
        break;
      }
      case 'relax': {
        const from = name(e.from);
        const to = name(e.to);
        const sum = `${formatDist(before.dist[e.from])} + ${formatWeight(g.edgeWeight[e.edge])} = ${formatDist(e.candidate)}`;
        const current = before.dist[e.to];
        if (e.targetSettled) {
          parts.push(
            e.candidate < current
              ? `Edge ${from} → ${to} offers ${sum}, shorter than ${to}'s ${formatDist(current)}! But ${to} is already settled, so Dijkstra ignores it.`
              : `Edge ${from} → ${to}: ${to} is already settled, so the edge is skipped.`,
          );
        } else if (e.improved) {
          parts.push(
            current === Infinity
              ? `Edge ${from} → ${to}: ${sum}, so ${to} gets a tentative distance of ${formatDist(e.candidate)}.`
              : `Edge ${from} → ${to}: ${sum} beats ${to}'s ${formatDist(current)}, so ${to}'s distance drops to ${formatDist(e.candidate)}.`,
          );
        } else {
          parts.push(
            `Edge ${from} → ${to}: ${sum} is not shorter than ${to}'s ${formatDist(current)}, so nothing changes.`,
          );
        }
        break;
      }
      case 'negative-cycle':
        parts.push(
          `A distance still improved in the extra round, so there is a negative cycle: ${e.cycle
            .map((edge) => name(g.edgeFrom[edge]))
            .concat(name(g.edgeFrom[e.cycle[0]]))
            .join(' → ')}.`,
        );
        break;
      case 'done':
        if (!events.some((x) => x.kind === 'negative-cycle')) {
          // Settling algorithms (Dijkstra) vs. round-based ones (Bellman–Ford).
          parts.push(
            before.settledOrder.length > 0
              ? 'Done: every reachable vertex is settled.'
              : 'Done: no edge can improve any distance, so every distance is final.',
          );
        }
        break;
      case 'phase':
        phase = e.label;
        break;
      case 'line':
      case 'round':
        break;
    }
  }

  if (parts.length === 0) return phase ?? '';
  return phase && events.some((e) => e.kind === 'round') ? `${phase}. ${parts.join(' ')}` : parts.join(' ');
}
