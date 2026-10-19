import { PAPER_TITLES, TIMELINE } from '../../content/timeline';
import contentStyles from '../content/content.module.css';
import { href } from '../router';
import styles from './pages.module.css';

const SIMPLIFICATIONS: { what: string; detail: string }[] = [
  {
    what: "Dijkstra, Bellman–Ford, Johnson's potentials, the hybrid",
    detail: 'Exact textbook versions. Dijkstra uses a binary heap rather than a Fibonacci heap.',
  },
  {
    what: 'The 2022 negative-weight algorithm (Chapter 2)',
    detail:
      'The real structure: scaling, then recursive rounds of clustering, fixing inside clusters, fixing between clusters, and the hybrid clean-up. The clustering step is a simpler random ball-carving than the paper\'s, and the walkthrough figure uses cluster sizes tuned for a 14-vertex graph. Neither affects correctness, only the speed guarantee. Negative cycles are detected by the hybrid\'s round limit instead of the paper\'s more elaborate wrapper.',
  },
  {
    what: 'The 2025 sorting-barrier algorithm (Chapter 3)',
    detail:
      "The paper's three procedures (FindPivots, the base case, and the recursion) and its block-based, partly sorted structure. The structure splits blocks by sorting instead of linear-time median selection, and the paper's step of first giving every vertex at most two edges is skipped. The walkthrough lets you choose k and t, because the paper's own formulas give values too small to show anything on a small graph.",
  },
  {
    what: 'The race (Chapter 3)',
    detail:
      'Both algorithms are this site\'s own TypeScript, measured in your browser. The 2025 algorithm\'s implementation favours clarity over speed, so treat the exact ratios as illustrative. The published C++ study reaches the same conclusion with tuned code.',
  },
];

export function About() {
  const sources = TIMELINE.filter((e) => e.link);
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
          extended Dijkstra's algorithm to negative edges and beat it on sparse directed graphs, plus what followed in
          2026. It is written for readers who know what a graph is but don't follow algorithms research.
        </p>

        <h2>The demos run real code</h2>
        <p>
          Every figure runs an actual implementation of the algorithm it shows, in your browser. Nothing is a
          pre-recorded animation. Each algorithm reports its steps as it runs, and the figure replays them, which is why
          you can step backwards as well as forwards. The <a href={href('playground')}>Playground</a> lets you run any of
          them on a graph of your own.
        </p>

        <h2>How it is tested</h2>
        <p>
          Every algorithm is checked automatically against an independent method on thousands of random graphs, including
          graphs with tied distances, negative edges and negative cycles. The two newest algorithms are also checked
          against the promises their papers make inside each step, for example that FindPivots keeps at most one pivot
          for every k vertices it touches. To check that the tests can actually catch mistakes, deliberate bugs were
          planted in the code, and the tests caught every one.
        </p>

        <h2>What is simplified</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">Algorithm</th>
              <th scope="col">How faithful it is</th>
            </tr>
          </thead>
          <tbody>
            {SIMPLIFICATIONS.map((s) => (
              <tr key={s.what}>
                <td>
                  <b>{s.what}</b>
                </td>
                <td>{s.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Sources</h2>
        <p>Research papers (most link to the free arXiv version):</p>
        <ul>
          {sources.map((e) => (
            <li key={e.link}>
              {e.who}: <a href={e.link} target="_blank" rel="noreferrer">{PAPER_TITLES[e.link!] ?? e.title}</a>
              {e.venue && ` (${e.venue}${e.preprint || /\d{4}/.test(e.venue) ? '' : `, ${e.year}`})`}
            </li>
          ))}
          <li>
            van der Hoog, Rotenberg and Rutschmann:{' '}
            <a href="https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ESA.2025.71" target="_blank" rel="noreferrer">
              Simpler Universally Optimal Dijkstra
            </a>{' '}
            (ESA 2025)
          </li>
        </ul>
        <p>Background:</p>
        <ul>
          <li>
            P. L. Frana and T. J. Misa, <i>An Interview with Edsger W. Dijkstra</i>, Communications of the ACM 53(8),
            2010, the source of the café story.
          </li>
          <li>
            Quanta Magazine's coverage of the{' '}
            <a href="https://www.quantamagazine.org/finally-a-fast-algorithm-for-shortest-paths-on-negative-graphs-20230118/" target="_blank" rel="noreferrer">
              2022
            </a>
            ,{' '}
            <a href="https://www.quantamagazine.org/computer-scientists-establish-the-best-way-to-traverse-a-graph-20241025/" target="_blank" rel="noreferrer">
              2024
            </a>{' '}
            and{' '}
            <a href="https://www.quantamagazine.org/new-method-is-the-fastest-way-to-find-the-best-routes-20250806/" target="_blank" rel="noreferrer">
              2025
            </a>{' '}
            results.
          </li>
        </ul>

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
