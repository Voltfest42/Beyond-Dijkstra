import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '../src/site/chapters';
import { parseHash, slugify } from '../src/site/router';

describe('chapter registry', () => {
  it.each(CHAPTERS.filter((c) => c.load))('lists exactly the ## headings of chapter $number', (chapter) => {
    const source = readFileSync(new URL(`../src/content/chapter${chapter.number}.mdx`, import.meta.url), 'utf8');
    const headings = [...source.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    expect(headings).toEqual(chapter.sections);
  });

  it('has unique section ids within each chapter', () => {
    for (const chapter of CHAPTERS) {
      const ids = chapter.sections.map(slugify);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('router', () => {
  it('parses page and section from the hash', () => {
    expect(parseHash('')).toEqual({ page: '', section: null });
    expect(parseHash('#/')).toEqual({ page: '', section: null });
    expect(parseHash('#/dijkstra')).toEqual({ page: 'dijkstra', section: null });
    expect(parseHash('#/dijkstra/sorted-order')).toEqual({ page: 'dijkstra', section: 'sorted-order' });
  });

  it('slugifies headings into URL-safe ids', () => {
    expect(slugify('Once settled, never changes')).toBe('once-settled-never-changes');
    expect(slugify('The shortest-route problem')).toBe('the-shortest-route-problem');
  });
});
