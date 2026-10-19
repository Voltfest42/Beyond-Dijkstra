import Intro from './content/intro.mdx';
import styles from './App.module.css';

const CHAPTERS = [
  { number: 1, title: 'Dijkstra, refreshed', blurb: 'How the 1956 classic works, and the two habits that limit it.' },
  { number: 2, title: 'Wall 1: negative edges', blurb: 'Why Dijkstra breaks, and the 2022 near-linear-time fix.' },
  { number: 3, title: 'Wall 2: the sorting barrier', blurb: 'How a 2025 algorithm beats Dijkstra by not sorting.' },
  { number: 4, title: 'What it all means', blurb: 'Theory versus practice, and where the field went next.' },
];

export function App() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>An interactive story</p>
        <h1>Beyond Dijkstra</h1>
        <p className={styles.lede}>The 2022–2025 breakthroughs in shortest paths, explained with live demos.</p>
      </header>

      <section className={styles.prose}>
        <Intro />
      </section>

      <ol className={styles.chapters}>
        {CHAPTERS.map((c) => (
          <li key={c.number} className={styles.card}>
            <span className={styles.chapterNumber}>Chapter {c.number}</span>
            <h2>{c.title}</h2>
            <p>{c.blurb}</p>
            <span className={styles.soon}>Coming soon</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
