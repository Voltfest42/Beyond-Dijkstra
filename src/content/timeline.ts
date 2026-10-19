/**
 * Results for the timelines in Chapters 2 and 4. Every entry was checked
 * against the paper's abstract; see docs/research.md for the sources.
 */
export type Track = 'classic' | 'integer' | 'real' | 'sorting';

export interface TimelineEntry {
  year: string;
  track: Track;
  title: string;
  who: string;
  venue: string;
  /** Running time, as plain text. */
  bound?: string;
  detail: string;
  /** The landmark results of the story. */
  landmark?: boolean;
  /** Not yet peer-reviewed. */
  preprint?: boolean;
  link?: string;
}

export const TRACK_LABELS: Record<Track, string> = {
  classic: 'Classics',
  integer: 'Negative integer weights',
  real: 'Negative real weights',
  sorting: 'Beating the sorting barrier',
};

export const TIMELINE: readonly TimelineEntry[] = [
  {
    year: '1955–58',
    track: 'classic',
    title: 'Bellman–Ford',
    who: 'Shimbel; Ford; Moore; Bellman',
    venue: '',
    bound: 'O(nm)',
    detail: 'Relax every edge, n − 1 times. Handles negative edges and detects negative cycles, but is slow.',
  },
  {
    year: '1959',
    track: 'classic',
    title: "Dijkstra's algorithm",
    who: 'Edsger W. Dijkstra',
    venue: 'Numerische Mathematik',
    bound: 'O(n²); later O(m + n log n)',
    detail: 'Designed in 1956, published in 1959. With Fibonacci heaps (Fredman and Tarjan, 1984) it runs in O(m + n log n).',
  },
  {
    year: '1977',
    track: 'classic',
    title: 'Reweighting with potentials',
    who: 'Donald B. Johnson',
    venue: 'Journal of the ACM',
    detail:
      "Heights that make every edge non-negative let Dijkstra handle negative edges. Johnson's heights come from one Bellman–Ford run.",
  },
  {
    year: '1989 / 1995',
    track: 'integer',
    title: 'Scaling algorithms',
    who: 'Gabow and Tarjan; Goldberg',
    venue: 'SIAM Journal on Computing',
    bound: 'O(m √n log W)',
    detail:
      'For integer weights ≥ −W, handle the weights one bit at a time. The best "combinatorial" bound for more than 30 years.',
  },
  {
    year: '2020',
    track: 'integer',
    title: 'Continuous optimization takes over',
    who: 'van den Brand et al.; Axiotis, Mądry and Vladu',
    venue: 'FOCS 2020',
    bound: 'Õ((m + n^1.5) log W), m^(4/3 + o(1)) log W',
    detail: 'Faster, but built on interior-point methods from continuous optimization, far from simple graph techniques.',
  },
  {
    year: '2022',
    track: 'integer',
    title: 'Near-linear time, with simple tools',
    who: 'Bernstein, Nanongkai and Wulff-Nilsen',
    venue: 'FOCS 2022 Best Paper',
    bound: 'O(m log⁸ n log W)',
    detail:
      'Random clusters, recursion, a DAG fix and the Dijkstra/Bellman–Ford hybrid: the algorithm in Figure 2.6. Randomized, combinatorial and nearly as fast as Dijkstra.',
    landmark: true,
    link: 'https://arxiv.org/abs/2203.03456',
  },
  {
    year: '2022',
    track: 'integer',
    title: 'Max-flow and min-cost flow in almost-linear time',
    who: 'Chen, Kyng, Liu, Peng, Probst Gutenberg and Sachdeva',
    venue: 'FOCS 2022 Best Paper',
    bound: 'm^(1 + o(1)) log W',
    detail:
      'Shared the best paper award. Min-cost flow includes negative-weight shortest paths, so this solves them too, using heavy continuous-optimization machinery.',
    link: 'https://arxiv.org/abs/2203.00671',
  },
  {
    year: '2023',
    track: 'integer',
    title: '"…Now Faster!"',
    who: 'Bringmann, Cassis and Fischer',
    venue: 'FOCS 2023',
    bound: 'O(m log² n log(nW) log log n)',
    detail: 'The same approach with almost six log factors removed.',
    link: 'https://arxiv.org/abs/2304.05279',
  },
  {
    year: '2024',
    track: 'real',
    title: 'Bellman–Ford beaten for real weights',
    who: 'Jeremy Fineman',
    venue: 'STOC 2024',
    bound: 'Õ(m n^(8/9))',
    detail:
      'With arbitrary real weights, the running time can\'t depend on how big the numbers are. This was the first asymptotic improvement over Bellman–Ford\'s O(nm) for that case, after about 65 years.',
    landmark: true,
    link: 'https://arxiv.org/abs/2311.02520',
  },
  {
    year: '2025',
    track: 'real',
    title: 'Real weights, faster',
    who: 'Huang, Jin and Quanrud',
    venue: 'SODA 2025',
    bound: 'Õ(m n^(4/5))',
    detail: 'Built on Fineman\'s approach, using "proper hop distance".',
    link: 'https://arxiv.org/abs/2407.04872',
  },
  {
    year: '2025',
    track: 'integer',
    title: 'Fast in practice too',
    who: 'Cassis, Karrenbauer, Nusser and Rinaldi',
    venue: 'Algorithm engineering study',
    detail:
      'An engineered version of the 2023 algorithm, up to almost 100× faster than the classic Goldberg–Radzik method on the hardest test instances.',
    link: 'https://arxiv.org/abs/2502.11999',
  },
  {
    year: '2025',
    track: 'real',
    title: 'Shortcutting',
    who: 'G. Li, J. Li, Rao and Zhang',
    venue: 'Preprint',
    bound: 'O(n^2.5 log^4.5 n)',
    detail: 'Adds shortcut edges to cut the number of negative edges on shortest paths. Strongest on dense graphs.',
    preprint: true,
    link: 'https://arxiv.org/abs/2511.12714',
  },
  {
    year: '2026',
    track: 'integer',
    title: 'Faster decompositions',
    who: 'Li, Mowry and Rao',
    venue: 'SODA 2026',
    bound: 'O((m + n log log n) log(nW) log n log log n)',
    detail: 'A faster directed low-diameter decomposition, the clustering step of Figure 2.6.',
    link: 'https://arxiv.org/abs/2510.22721',
  },
  {
    year: '2026',
    track: 'real',
    title: 'Bootstrapping hop reducers',
    who: 'Huang, Jin and Quanrud',
    venue: 'SODA 2026',
    bound: 'Õ(m n^(3/4) + m^(4/5) n)',
    detail: 'The real-weight bound keeps dropping.',
    link: 'https://arxiv.org/abs/2506.00428',
  },
  {
    year: '2026',
    track: 'real',
    title: 'Almost linear for dense graphs',
    who: 'Khanna and Song',
    venue: 'Preprint',
    bound: 'n^(2 + o(1))',
    detail: 'Almost-linear time when the graph is dense (m ≈ n²).',
    preprint: true,
    link: 'https://arxiv.org/abs/2602.16638',
  },
  {
    year: '2026',
    track: 'real',
    title: '"Bellman-Ford in Almost-Linear Time"',
    who: 'Hair, G. Li, J. Li and Zhang',
    venue: 'Preprint, July 2026',
    bound: 'm^(1 + o(1))',
    detail:
      'Claims almost-linear time for arbitrary real weights. If it holds up, the real-weight case is essentially settled too. Not yet peer-reviewed.',
    preprint: true,
    link: 'https://arxiv.org/abs/2607.19346',
  },
  {
    year: '2023',
    track: 'sorting',
    title: 'Sorting barrier broken for undirected graphs',
    who: 'Duan, Mao, Shu and Yin',
    venue: 'FOCS 2023',
    bound: 'O(m √(log n log log n))',
    detail: 'The first crack in the sorting barrier for real weights, randomized and for undirected graphs only.',
    link: 'https://arxiv.org/abs/2307.04139',
  },
  {
    year: '2024',
    track: 'sorting',
    title: 'Dijkstra is universally optimal',
    who: 'Haeupler, Hladík, Rozhoň, Tarjan and Tětek',
    venue: 'FOCS 2024 Best Paper',
    detail:
      'With a heap that makes recently inserted items cheap to extract, Dijkstra is the best possible algorithm on every graph, if you need the vertices in order of distance.',
    landmark: true,
    link: 'https://arxiv.org/abs/2311.11793',
  },
  {
    year: '2025',
    track: 'sorting',
    title: 'Breaking the sorting barrier (directed)',
    who: 'Duan, Mao, Mao, Shu and Yin',
    venue: 'STOC 2025 Best Paper',
    bound: 'O(m log^(2/3) n)',
    detail: 'The first algorithm to beat Dijkstra on sparse directed graphs, by not sorting all the vertices. Deterministic.',
    landmark: true,
    link: 'https://arxiv.org/abs/2504.17033',
  },
  {
    year: '2025',
    track: 'sorting',
    title: 'Reality check',
    who: 'Castro, Clementino and de Freitas',
    venue: 'Experimental study',
    detail:
      'A careful C++ implementation of the 2025 algorithm: Dijkstra stays 3–4× faster on every tested graph up to 10 million vertices.',
    link: 'https://arxiv.org/abs/2511.03007',
  },
  {
    year: '2026',
    track: 'sorting',
    title: 'Faster still',
    who: 'Duan, Mao, Shu and Yin',
    venue: 'ICALP 2026',
    bound: 'O(m √(log n log log n)) on sparse graphs',
    detail: 'Improves the 2025 bound for directed graphs.',
    link: 'https://arxiv.org/abs/2602.07868',
  },
];
