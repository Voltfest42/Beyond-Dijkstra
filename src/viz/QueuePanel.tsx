import { vertexLabel, type Graph } from '../core/graph';
import type { VisualState } from '../core/trace';
import { formatDist } from './format';
import styles from './Panels.module.css';

/** Dijkstra's priority queue (smallest first) and the vertices settled so far. */
export function QueuePanel({ graph, state }: { graph: Graph; state: VisualState }) {
  const queued = [...state.queue].sort(([va, ka], [vb, kb]) => ka - kb || va - vb);

  return (
    <section className={`${styles.panel} ${styles.twoColumns}`} aria-label="Queue and settled vertices">
      <div>
        <h4 className={styles.panelTitle}>Queue, smallest first</h4>
        {queued.length === 0 ? (
          <p className={styles.empty}>{state.done ? 'Empty: all done.' : 'Empty'}</p>
        ) : (
          <ol className={styles.chips}>
            {queued.map(([v, key], i) => (
              <li key={v} className={`${styles.chip} ${styles.frontierChip} ${i === 0 ? styles.next : ''}`}>
                <b>{vertexLabel(graph, v)}</b> {formatDist(key)}
                {i === 0 && <span className={styles.nextTag}>next</span>}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <h4 className={styles.panelTitle}>Settled, in order</h4>
        {state.settledOrder.length === 0 ? (
          <p className={styles.empty}>None yet</p>
        ) : (
          <ol className={styles.chips}>
            {state.settledOrder.map((v) => (
              <li key={v} className={`${styles.chip} ${styles.settledChip}`}>
                <b>{vertexLabel(graph, v)}</b> {formatDist(state.dist[v])}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
