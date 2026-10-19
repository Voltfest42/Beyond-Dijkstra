import type { MDXContent } from 'mdx/types';
import { slugify } from './router';

export interface ChapterInfo {
  slug: string;
  number: number;
  title: string;
  blurb: string;
  /** Section titles, exactly as written in the chapter's `##` headings. */
  sections: string[];
  /** Loads the chapter's MDX on demand; absent while the chapter isn't written yet. */
  load?: () => Promise<{ default: MDXContent }>;
}

export const CHAPTERS: readonly ChapterInfo[] = [
  {
    slug: 'dijkstra',
    number: 1,
    title: 'Dijkstra, refreshed',
    blurb: 'How the 1956 classic works, and the two habits that limit it.',
    sections: [
      'The shortest-route problem',
      'How Dijkstra works',
      'Once settled, never changes',
      'Vertices come out in sorted order',
      'The two walls',
    ],
    load: () => import('../content/chapter1.mdx'),
  },
  {
    slug: 'negative-edges',
    number: 2,
    title: 'Wall 1: negative edges',
    blurb: 'Why Dijkstra breaks on negative edges, and the 2022 near-linear-time fix.',
    sections: [
      'Why would an edge be negative?',
      'Dijkstra breaks',
      'Bellman–Ford: correct but slow',
      'Potentials: changing the weights without changing the answer',
      'A faster engine: Dijkstra plus Bellman–Ford',
      'The 2022 breakthrough: make η small',
      'What happened next',
    ],
    load: () => import('../content/chapter2.mdx'),
  },
  {
    slug: 'sorting-barrier',
    number: 3,
    title: 'Wall 2: the sorting barrier',
    blurb: 'How a 2025 algorithm beats Dijkstra by refusing to sort everything.',
    sections: [
      'Dijkstra is a sorting machine',
      'The 2024 twist: Dijkstra is the best possible',
      'Where the time goes: the frontier',
      'Idea 1: shrink the frontier with a little Bellman–Ford',
      'Idea 2: divide and conquer by distance',
    ],
    load: () => import('../content/chapter3.mdx'),
  },
  {
    slug: 'what-it-means',
    number: 4,
    title: 'What it all means',
    blurb: 'Theory versus practice, the full timeline, and where the field went next.',
    sections: [],
  },
];

export function findChapter(slug: string): ChapterInfo | undefined {
  return CHAPTERS.find((c) => c.slug === slug);
}

export function sectionId(title: string): string {
  return slugify(title);
}
