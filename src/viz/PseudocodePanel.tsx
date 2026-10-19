import type { PseudocodeLine } from '../core/pseudocode';
import styles from './Panels.module.css';

export function PseudocodePanel({ lines, active }: { lines: readonly PseudocodeLine[]; active: string | null }) {
  return (
    <section className={styles.panel} aria-label="Pseudocode">
      <h4 className={styles.panelTitle}>Pseudocode</h4>
      <ol className={styles.code}>
        {lines.map((line) => (
          <li
            key={line.id}
            className={line.id === active ? styles.activeLine : undefined}
            style={{ paddingLeft: `${0.6 + line.indent * 1.1}em` }}
            aria-current={line.id === active ? 'step' : undefined}
          >
            {line.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
