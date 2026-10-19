import type { KeyboardEventHandler, ReactNode } from 'react';
import styles from './Figure.module.css';

interface FigureProps {
  /** e.g. "1.1" */
  number: string;
  title: string;
  children: ReactNode;
  tryThis?: ReactNode;
  onKeyDown?: KeyboardEventHandler<HTMLElement>;
}

/** The frame around every interactive figure: numbered title, the demo, and a "Try this" prompt. */
export function Figure({ number, title, children, tryThis, onKeyDown }: FigureProps) {
  return (
    <figure className={styles.figure} onKeyDown={onKeyDown} aria-labelledby={`figure-${number}`}>
      <figcaption className={styles.header} id={`figure-${number}`}>
        <span className={styles.number}>Figure {number}</span>
        <span className={styles.title}>{title}</span>
      </figcaption>
      {children}
      {tryThis && (
        <aside className={styles.tryThis}>
          <span className={styles.tryLabel}>Try this</span>
          <div>{tryThis}</div>
        </aside>
      )}
    </figure>
  );
}

/** The step-by-step narration under a demo. Read out by screen readers as it changes. */
export function Caption({ children }: { children: ReactNode }) {
  return (
    <p className={styles.caption} aria-live="polite">
      {children}
    </p>
  );
}

export type LegendItem = 'unvisited' | 'frontier' | 'settled' | 'current' | 'tree' | 'improved' | 'checked' | 'negative';

const LEGEND: Record<LegendItem, { label: string; symbol: ReactNode }> = {
  unvisited: { label: 'not reached', symbol: <circle r="7" className={styles.kUnvisited} /> },
  frontier: { label: 'tentative (in queue)', symbol: <circle r="7" className={styles.kFrontier} /> },
  settled: { label: 'settled (final)', symbol: <circle r="7" className={styles.kSettled} /> },
  current: { label: 'being processed', symbol: <circle r="7" className={styles.kCurrent} /> },
  tree: { label: 'best route so far', symbol: <line x1="-9" x2="9" className={styles.kTree} /> },
  improved: { label: 'edge improved a distance', symbol: <line x1="-9" x2="9" className={styles.kImproved} /> },
  checked: { label: 'edge checked, no change', symbol: <line x1="-9" x2="9" className={styles.kChecked} /> },
  negative: { label: 'negative edge', symbol: <line x1="-9" x2="9" className={styles.kNegative} /> },
};

export function Legend({ items }: { items: readonly LegendItem[] }) {
  return (
    <ul className={styles.legend} aria-label="Legend">
      {items.map((item) => (
        <li key={item}>
          <svg viewBox="-11 -11 22 22" width="18" height="18" aria-hidden="true">
            {LEGEND[item].symbol}
          </svg>
          {LEGEND[item].label}
        </li>
      ))}
    </ul>
  );
}
