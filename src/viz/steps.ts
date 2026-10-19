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
    (prev.kind === 'source' && queued) ||
    // The relaxation that exposes a negative cycle, the cycle and the end are one moment.
    (prev.kind === 'relax' && next.kind === 'negative-cycle') ||
    (prev.kind === 'negative-cycle' && next.kind === 'done')
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
        // A pop without a settle: the hybrid processes a vertex without declaring it final.
        if (e.op === 'pop' && !events.some((x) => x.kind === 'settle')) {
          parts.push(
            `${name(e.v)} comes off the queue (distance ${formatDist(e.key)}), so its non-negative edges are relaxed next. Its distance may still change in a later round.`,
          );
        }
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
        const w = g.edgeWeight[e.edge];
        const sum = `${formatDist(before.dist[e.from])} ${w < 0 ? '−' : '+'} ${formatWeight(Math.abs(w))} = ${formatDist(e.candidate)}`;
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
      case 'negative-cycle': {
        const loop = e.cycle.map((edge) => name(g.edgeFrom[edge])).concat(name(g.edgeFrom[e.cycle[0]]));
        const total = e.cycle.reduce((sum, edge) => sum + g.edgeWeight[edge], 0);
        parts.push(
          `The loop ${loop.join(' → ')} has total weight ${formatDist(total)}, so going round it again and again makes routes cheaper forever. Shortest distances don't exist.`,
        );
        break;
      }
      case 'done':
        if (!before.negativeCycle && !events.some((x) => x.kind === 'negative-cycle')) {
          // Settling algorithms (Dijkstra) vs. round-based ones (Bellman–Ford).
          parts.push(
            before.settledOrder.length > 0
              ? 'Done: every reachable vertex is settled.'
              : 'Done: no edge can improve any distance, so every distance is final.',
          );
        }
        break;
      case 'call': {
        const from = e.sources.map(name).join(', ');
        const below = Number.isFinite(e.bound) ? ` below distance ${formatDist(e.bound)}` : '';
        if (e.level === 0) {
          parts.push(
            `Base case (level 0): a mini-Dijkstra from ${from} that stops after ${e.limit} vertices${below ? `, looking only${below}` : ''}.`,
          );
        } else if (before.callStack.length === 0) {
          parts.push(`Top-level call (level ${e.level}): find every distance reachable from ${from}, with no bound.`);
        } else {
          parts.push(
            `New call at level ${e.level} for the batch ${from}: finish everything${below} that is reached through ${e.sources.length === 1 ? 'it' : 'them'}.`,
          );
        }
        break;
      }
      case 'pivots': {
        const S = e.sources.length;
        const W = e.work.length;
        if (e.early) {
          parts.push(
            `FindPivots: the Bellman–Ford rounds already reached ${W} vertices, more than k × ${S} = ${e.k * S}, so it stops early and keeps all ${S} frontier vertices as pivots.`,
          );
        } else if (e.pivots.length === 0) {
          parts.push(
            `FindPivots: ${e.k} Bellman–Ford rounds from ${S} frontier ${S === 1 ? 'vertex' : 'vertices'} reached ${W} vertices, and no tree has ${e.k} or more of them. Nothing here needs sorting at all.`,
          );
        } else {
          parts.push(
            `FindPivots: ${e.k} Bellman–Ford rounds from ${S} frontier ${S === 1 ? 'vertex' : 'vertices'} reached ${W} vertices. Only ${new Intl.ListFormat('en').format(e.pivots.map(name))} ★ root${e.pivots.length === 1 ? 's' : ''} a tree of at least k = ${e.k} vertices, so only ${e.pivots.length === 1 ? 'it goes' : 'they go'} on to the sorted structure.`,
          );
        }
        break;
      }
      case 'return': {
        // A call can re-confirm vertices finished earlier (a stale entry in a parent's structure); count only new ones.
        const done = e.completed.filter((v) => before.status[v] !== 'settled').map(name);
        const list = done.length > 8 ? `${done.slice(0, 8).join(', ')} and ${done.length - 8} more` : done.join(', ');
        const what =
          done.length === 0 ? 'no new vertices complete' : `${done.length} more ${done.length === 1 ? 'vertex' : 'vertices'} complete (${list})`;
        parts.push(
          e.partial
            ? `Level ${e.level} hit its size limit and returns early: ${what}, every distance below ${formatDist(e.bound)} is final, and the rest goes back to the caller.`
            : `Level ${e.level} is finished: ${what}${Number.isFinite(e.bound) ? `, every distance below ${formatDist(e.bound)} it was responsible for is final` : ''}.`,
        );
        break;
      }
      case 'phase':
        phase = e.label;
        break;
      case 'line':
      case 'round':
        break;
    }
  }

  if (parts.length === 0) return phase ?? '';
  return phase ? `${phase}. ${parts.join(' ')}` : parts.join(' ');
}
