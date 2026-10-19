import { raceOnce, timerResolution, type RaceMessage, type RaceRequest } from './race';

// The project is type-checked with DOM types; inside a worker only these two members are used.
const worker = self as unknown as {
  onmessage: (event: MessageEvent<RaceRequest>) => void;
  postMessage: (message: RaceMessage) => void;
};

/** Runs the race off the main thread, so the page stays responsive. */
worker.onmessage = (event) => {
  const post = (message: RaceMessage) => worker.postMessage(message);
  try {
    const resolution = timerResolution();
    post({ kind: 'timer', resolutionMs: resolution });
    raceOnce(1_000, { resolution }); // warm up the JIT so the first real size isn't penalised
    for (const n of event.data.sizes) post({ kind: 'result', result: raceOnce(n, { resolution }) });
    post({ kind: 'done' });
  } catch (error) {
    post({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
