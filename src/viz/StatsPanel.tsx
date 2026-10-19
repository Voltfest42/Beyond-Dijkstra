import type { ReactNode } from 'react';
import styles from './Panels.module.css';

export interface StatItem {
  label: string;
  value: ReactNode;
}

/** Small labelled numbers: round, relaxations so far, and so on. */
export function StatsPanel({ title = 'Counters', items }: { title?: string; items: readonly StatItem[] }) {
  return (
    <section className={styles.panel} aria-label={title}>
      <h4 className={styles.panelTitle}>{title}</h4>
      <dl className={styles.stats}>
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
