import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RACE_SIZES, type RaceMessage, type RaceResult } from '../bench/race';
import reference from '../bench/reference.json';
import { ErrorBoundary } from '../site/ErrorBoundary';
import { Figure } from '../viz/Figure';
import { compactNumber } from '../viz/format';
import { LineChart, type Series } from '../viz/LineChart';
import styles from './figures.module.css';
import raceStyles from './RaceFigure.module.css';

type Status = 'idle' | 'running' | 'done' | 'cancelled' | 'error';

const ratio = (r: RaceResult) => r.bmsspMs / Math.max(r.dijkstraMs, 1e-6);
const times = (x: number) => `×${x >= 10 ? x.toFixed(0) : x.toFixed(1)}`;
const ms = (x: number) => (x < 10 ? `${x.toFixed(1)} ms` : `${Math.round(x).toLocaleString('en')} ms`);

export function RaceFigure({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  return (
    <ErrorBoundary what={`Figure ${number}`}>
      <RaceInner number={number} tryThis={tryThis} />
    </ErrorBoundary>
  );
}

function RaceInner({ number, tryThis }: { number: string; tryThis?: ReactNode }) {
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<RaceResult[]>([]);
  const [error, setError] = useState('');
  const [largest, setLargest] = useState<number>(100_000);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const sizes = RACE_SIZES.filter((n) => n <= largest);

  const start = () => {
    workerRef.current?.terminate();
    const worker = new Worker(new URL('../bench/race.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    setResults([]);
    setError('');
    setStatus('running');
    worker.onmessage = (event: MessageEvent<RaceMessage>) => {
      const message = event.data;
      if (message.kind === 'result') setResults((rs) => [...rs, message.result]);
      else if (message.kind === 'done') {
        setStatus('done');
        worker.terminate();
      } else {
        setError(message.message);
        setStatus('error');
        worker.terminate();
      }
    };
    worker.onerror = () => {
      setError('The benchmark could not start in this browser.');
      setStatus('error');
    };
    worker.postMessage({ sizes });
  };

  const cancel = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setStatus('cancelled');
  };

  const refResults = reference.results as RaceResult[];
  const series: Series[] = [
    { name: 'Your browser', color: 'var(--series-1)', points: results.map((r) => ({ x: r.n, y: ratio(r) })) },
    {
      name: 'Reference run',
      color: 'var(--series-2)',
      dashed: true,
      points: refResults.filter((r) => r.n <= largest).map((r) => ({ x: r.n, y: ratio(r) })),
    },
  ];
  const rows = results.length > 0 ? results : refResults.filter((r) => r.n <= largest);
  const showingReference = results.length === 0;
  const disagree = results.some((r) => !r.agree);
  const running = status === 'running';

  return (
    <Figure number={number} title="The race: Dijkstra against the 2025 algorithm" tryThis={tryThis}>
      <div className={styles.toolbar}>
        {running ? (
          <button type="button" className={styles.toolButton} onClick={cancel}>
            Stop ■
          </button>
        ) : (
          <button type="button" className={`${styles.toolButton} ${raceStyles.go}`} onClick={start}>
            {results.length ? 'Run the race again ▶' : 'Run the race in your browser ▶'}
          </button>
        )}
        <span className={styles.segmented} role="group" aria-label="Largest graph">
          {[100_000, 300_000].map((n) => (
            <button key={n} type="button" aria-pressed={largest === n} disabled={running} onClick={() => setLargest(n)}>
              up to {compactNumber(n)} vertices
            </button>
          ))}
        </span>
        <span className={raceStyles.status} role="status">
          {running && `Running… ${results.length} of ${sizes.length} sizes done`}
          {status === 'done' && `Finished: ${results.length} sizes`}
          {status === 'cancelled' && 'Stopped'}
          {status === 'error' && <span className={styles.bad}>{error}</span>}
        </span>
      </div>

      <LineChart
        series={series}
        ariaLabel={`How many times slower the 2025 algorithm is than Dijkstra, by graph size. Reference run: ${refResults
          .map((r) => `${compactNumber(r.n)} vertices ${times(ratio(r))}`)
          .join(', ')}.`}
        xLabel="vertices in the graph (3 edges each)"
        yLabel="times slower than Dijkstra"
        reference={{ y: 1, label: 'break-even' }}
        formatY={times}
      />

      <table className={raceStyles.table}>
        <caption>{showingReference ? `Reference run: ${reference.machine}` : 'Your browser'}</caption>
        <thead>
          <tr>
            <th scope="col">Vertices</th>
            <th scope="col">Dijkstra</th>
            <th scope="col">2025 algorithm</th>
            <th scope="col">Times slower</th>
            <th scope="col">Comparisons, ratio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.n}>
              <td>{r.n.toLocaleString('en')}</td>
              <td>{ms(r.dijkstraMs)}</td>
              <td>{ms(r.bmsspMs)}</td>
              <td>
                <b>{times(ratio(r))}</b>
              </td>
              <td>{times(r.bmsspComparisons / Math.max(r.dijkstraComparisons, 1))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {disagree && <p className={styles.bad}>The two algorithms disagreed on some distance. Please report this.</p>}
      <p className={styles.note}>
        Random sparse directed graphs with 3 edges per vertex and real-valued weights. Times are the best of 3 runs, in
        a background thread. Both implementations are this site's own TypeScript, and every run checks that they agree on
        every distance{results.length > 0 && !disagree ? ' (they did)' : ''}. The reference run was recorded on{' '}
        {reference.machine} on {reference.recorded}.
      </p>
    </Figure>
  );
}
