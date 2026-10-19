import contentStyles from '../content/content.module.css';
import styles from './pages.module.css';

export function About() {
  return (
    <article className={styles.page}>
      <header className={styles.chapterHeader}>
        <p className={styles.kicker}>About</p>
        <h1>About this site</h1>
        <p className={styles.lede}>What it is, how the demos work, and how far to trust them.</p>
      </header>
      <div className={contentStyles.prose}>
        <p>
          This site is an interactive introduction to recent research on shortest paths: the 2022–2025 results that
          extended Dijkstra's algorithm to negative edges and beat it on sparse directed graphs. It is written for
          readers who know what a graph is but don't follow algorithms research.
        </p>
        <h2>The demos run real code</h2>
        <p>
          Every figure runs an actual implementation of the algorithm it shows, in your browser. Nothing is a
          pre-recorded animation. Each algorithm reports its steps as it runs, and the figure replays them, which is why
          you can step backwards as well as forwards.
        </p>
        <p>
          The implementations are checked automatically against an independent reference algorithm on thousands of
          random graphs, including graphs with negative edges and negative cycles.
        </p>
        <h2>What is simplified</h2>
        <p>
          The newest algorithms are designed for enormous graphs, and some of their parameters only matter at sizes far
          beyond a screen. Where a demo simplifies something to make it visible, the figure says so in a note next to
          it.
        </p>
        <h2>Built with</h2>
        <p>
          TypeScript, React and Vite, with chapter text in MDX. It is hosted as a static site on Amazon S3 and CloudFront.
          There's no server, no tracking and no cookies. The only thing stored is which chapters you've finished, in your
          own browser.
        </p>
      </div>
    </article>
  );
}
