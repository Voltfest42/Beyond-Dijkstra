import { useEffect, useRef } from 'react';
import { vertexLabel, type Graph } from '../core/graph';
import type { VisualState } from '../core/trace';
import { formatDist } from './format';
import styles from './Panels.module.css';

/** The recursive calls so far, indented by depth; the running one is highlighted. */
export function RecursionPanel({ graph, state }: { graph: Graph; state: VisualState }) {
  const listRef = useRef<HTMLOListElement>(null);
  const active = state.callStack.length ? state.callStack[state.callStack.length - 1] : null;

  // Keep the running call in view inside the panel, without scrolling the page.
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>('[data-active="true"]');
    if (!list || !row) return;
    const top = row.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top - list.clientHeight / 2;
    }
  }, [active, state.calls.length]);

  return (
    <section className={styles.panel} aria-label="Recursive calls">
      <h4 className={styles.panelTitle}>Recursive calls</h4>
      {state.calls.length === 0 ? (
        <p className={styles.empty}>None yet</p>
      ) : (
        <ol ref={listRef} className={styles.calls}>
          {state.calls.map((call, i) => {
            const running = !call.done;
            const sources = call.sources.map((v) => vertexLabel(graph, v)).join(', ');
            return (
              <li
                key={i}
                data-active={i === active}
                className={`${i === active ? styles.activeCall : ''} ${running ? '' : styles.doneCall}`}
                style={{ paddingLeft: `${0.4 + call.depth * 0.9}em` }}
              >
                <span className={styles.level}>L{call.level}</span> {sources}
                <span className={styles.callBound}>
                  {' '}
                  &lt; {formatDist(call.bound)}
                  {call.done && (
                    <>
                      {' '}
                      → {call.completed} done{call.partial && `, stopped at ${formatDist(call.newBound ?? Infinity)}`}
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
