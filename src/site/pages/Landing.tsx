import Intro from '../../content/intro.mdx';
import { Legend } from '../../viz/Figure';
import { CHAPTERS } from '../chapters';
import { mdxComponents } from '../content/mdxComponents';
import { useReadChapters } from '../progress';
import { href } from '../router';
import contentStyles from '../content/content.module.css';
import styles from './pages.module.css';

export function Landing() {
  const read = useReadChapters();
  const firstUnread = CHAPTERS.find((c) => c.load && !read.includes(c.slug)) ?? CHAPTERS[0];

  return (
    <article className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>An interactive story</p>
        <h1 className={styles.heroTitle}>Beyond Dijkstra</h1>
        <p className={styles.lede}>The 2022–2025 breakthroughs in shortest paths, explained with live demos.</p>
      </header>

      <div className={contentStyles.prose}>
        <Intro components={mdxComponents} />
      </div>

      <p>
        <a href={href(firstUnread.slug)} className={styles.cta}>
          {read.length === 0 ? 'Start reading' : 'Continue'}: Chapter {firstUnread.number} →
        </a>
      </p>

      <h2 className={styles.sectionTitle}>The chapters</h2>
      <ol className={styles.cards}>
        {CHAPTERS.map((c) => {
          const body = (
            <>
              <span className={styles.cardNumber}>
                Chapter {c.number}
                {read.includes(c.slug) && <span className={styles.readTag}>✓ read</span>}
              </span>
              <span className={styles.cardTitle}>{c.title}</span>
              <span className={styles.cardBlurb}>{c.blurb}</span>
              {!c.load && <span className={styles.soonTag}>Coming soon</span>}
            </>
          );
          return (
            <li key={c.slug}>
              {c.load ? (
                <a href={href(c.slug)} className={styles.card}>
                  {body}
                </a>
              ) : (
                <div className={`${styles.card} ${styles.cardDisabled}`}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>

      <h2 className={styles.sectionTitle}>How to use the demos</h2>
      <div className={contentStyles.prose}>
        <p>
          Every chapter has live figures that run the real algorithms. Use <b>▶ Play</b> to watch, or step forwards and
          backwards with the buttons or the <kbd>←</kbd> <kbd>→</kbd> keys. A caption under each figure says what just
          happened and why. Dotted-underlined words have a short definition: hover over or tap them.
        </p>
        <p>The colours mean the same thing in every figure:</p>
        <Legend items={['unvisited', 'frontier', 'settled', 'current', 'tree', 'improved', 'checked', 'negative']} />
      </div>
    </article>
  );
}
