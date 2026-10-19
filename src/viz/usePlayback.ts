import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import type { Graph } from '../core/graph';
import { recordTrace, TracePlayer, type Emit, type TraceEvent, type VisualState } from '../core/trace';
import { computeStops, describeStep } from './steps';

/** A finished run, ready to be stepped through. */
export interface Recording<R = unknown> {
  graph: Graph;
  events: TraceEvent[];
  player: TracePlayer;
  stops: number[];
  result: R;
}

export function recordRun<R>(graph: Graph, run: (emit: Emit) => R): Recording<R> {
  const { events, result } = recordTrace(run);
  return { graph, events, player: new TracePlayer(graph, events), stops: computeStops(events), result };
}

export const SPEEDS = { slow: 1500, normal: 800, fast: 300 } as const;
export type Speed = keyof typeof SPEEDS;

export interface Playback {
  /** Current step (0 = the starting picture) and the number of steps. */
  step: number;
  steps: number;
  state: VisualState;
  /** What the latest step did, in words ('' at step 0). */
  caption: string;
  playing: boolean;
  speed: Speed;
  setSpeed: (speed: Speed) => void;
  togglePlay: () => void;
  stepBy: (delta: number) => void;
  seek: (step: number) => void;
}

export function usePlayback(recording: Recording): Playback {
  // The step is stored together with the recording it belongs to, so a new
  // recording (another start vertex, edited weights…) starts again at step 0.
  const [position, setPosition] = useState({ recording, step: 0, playing: false });
  const [speed, setSpeed] = useState<Speed>('normal');
  const current = position.recording === recording ? position : { recording, step: 0, playing: false };
  const steps = recording.stops.length - 1;

  const update = (change: (p: { step: number; playing: boolean }) => { step: number; playing: boolean }) =>
    setPosition((prev) => {
      const base = prev.recording === recording ? prev : { recording, step: 0, playing: false };
      return { recording, ...change(base) };
    });

  useEffect(() => {
    if (!current.playing) return;
    const timer = window.setInterval(() => {
      setPosition((prev) => {
        if (prev.recording !== recording) return prev;
        const step = Math.min(prev.step + 1, steps);
        return { recording, step, playing: step < steps };
      });
    }, SPEEDS[speed]);
    return () => window.clearInterval(timer);
  }, [current.playing, recording, speed, steps]);

  const { state, caption } = useMemo(() => {
    const { player, stops, events, graph } = recording;
    const after = player.stateAt(stops[current.step]);
    if (current.step === 0) return { state: after, caption: '' };
    const before = player.stateAt(stops[current.step - 1]);
    return {
      state: after,
      caption: describeStep(graph, events.slice(stops[current.step - 1], stops[current.step]), before),
    };
  }, [recording, current.step]);

  return {
    step: current.step,
    steps,
    state,
    caption,
    playing: current.playing,
    speed,
    setSpeed,
    togglePlay: () =>
      update((p) => (p.playing ? { ...p, playing: false } : { step: p.step >= steps ? 0 : p.step, playing: true })),
    stepBy: (delta) => update((p) => ({ step: clamp(p.step + delta, 0, steps), playing: false })),
    seek: (step) => update(() => ({ step: clamp(step, 0, steps), playing: false })),
  };
}

/** Arrow keys / Home / End step through a figure while focus is inside it. */
export function handlePlaybackKeys(event: KeyboardEvent, playback: Playback): void {
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
  const actions: Record<string, () => void> = {
    ArrowRight: () => playback.stepBy(1),
    ArrowLeft: () => playback.stepBy(-1),
    Home: () => playback.seek(0),
    End: () => playback.seek(playback.steps),
  };
  const action = actions[event.key];
  if (action) {
    event.preventDefault();
    action();
  }
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
