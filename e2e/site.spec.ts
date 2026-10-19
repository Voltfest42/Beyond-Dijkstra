import { expect, test } from '@playwright/test';
import { accessibilityViolations, expectNoBrokenFigures, runFigureToEnd, watchErrors } from './helpers';

const CHAPTERS = [
  { slug: 'dijkstra', title: 'Dijkstra, refreshed', figures: 2 },
  { slug: 'negative-edges', title: 'Wall 1: negative edges', figures: 7 },
  { slug: 'sorting-barrier', title: 'Wall 2: the sorting barrier', figures: 6 },
  { slug: 'what-it-means', title: 'What it all means', figures: 1 },
];

test('landing page links to every chapter @phone', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Beyond Dijkstra' })).toBeVisible();
  for (const c of CHAPTERS) await expect(page.locator(`a[href="#/${c.slug}"]`).first()).toBeAttached();
  expect(await accessibilityViolations(page)).toEqual([]);
  await page.getByRole('link', { name: /Start reading/ }).click();
  await expect(page).toHaveURL(/#\/dijkstra/);
  expect(errors).toEqual([]);
});

test('figures can be stepped with the keyboard', async ({ page }) => {
  await page.goto('/#/dijkstra/how-dijkstra-works');
  const figure = page.locator('figure').first();
  await figure.getByRole('button', { name: 'Step forward' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(figure.getByRole('slider', { name: 'Step' })).toHaveValue('2');
  await page.keyboard.press('ArrowLeft');
  await expect(figure.getByRole('slider', { name: 'Step' })).toHaveValue('1');
  await page.keyboard.press('End');
  await expect(figure.locator('p[aria-live]')).toContainText('Done');
});

for (const chapter of CHAPTERS) {
  test(`${chapter.title}: every figure runs to the end without errors`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(`/#/${chapter.slug}`);
    await expect(page.getByRole('heading', { level: 1, name: chapter.title })).toBeVisible();
    const figures = page.locator('figure');
    await expect(figures).toHaveCount(chapter.figures);
    for (let i = 0; i < chapter.figures; i++) {
      const figure = await runFigureToEnd(page, i);
      // A finished step-through figure no longer offers "Jump to the end".
      const end = figure.getByRole('button', { name: 'Jump to the end' });
      if ((await end.count()) > 0) await expect(end).toBeDisabled();
    }
    await expectNoBrokenFigures(page);
    expect(errors).toEqual([]);
  });

  test(`${chapter.title}: no accessibility violations`, async ({ page }) => {
    await page.goto(`/#/${chapter.slug}`);
    await expect(page.locator('figure').first()).toBeVisible();
    expect(await accessibilityViolations(page)).toEqual([]);
  });
}

test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('every page passes the accessibility checks in dark mode too', async ({ page }) => {
    const found: string[] = [];
    for (const path of ['/', ...CHAPTERS.map((c) => `/#/${c.slug}`), '/#/about', '/#/playground']) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      for (const v of await accessibilityViolations(page)) found.push(`${path}: ${v}`);
    }
    expect(found).toEqual([]);
  });
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 3840, height: 2160 },
]) {
  test(`sidebar highlights the last section at the bottom of each chapter (${viewport.width}×${viewport.height})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const lastSections = {
      dijkstra: 'The two walls',
      'negative-edges': 'What happened next',
      'sorting-barrier': 'Epilogue: 2026',
      'what-it-means': 'Further reading',
    };
    for (const [slug, last] of Object.entries(lastSections)) {
      await page.goto(`/#/${slug}`);
      await expect(page.locator('figure').first()).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const sidebar = page.getByRole('navigation', { name: 'Contents' });
      await expect(sidebar.getByRole('link', { name: last, exact: true })).toHaveAttribute('aria-current', 'location');
    }
  });
}

test('sidebar highlights a section in the middle of a chapter', async ({ page }) => {
  await page.goto('/#/dijkstra/once-settled-never-changes');
  const sidebar = page.getByRole('navigation', { name: 'Contents' });
  await expect(sidebar.getByRole('link', { name: 'Once settled, never changes' })).toHaveAttribute('aria-current', 'location');
});

test('section deep links scroll to their heading', async ({ page }) => {
  await page.goto('/#/sorting-barrier/idea-2-divide-and-conquer-by-distance');
  const heading = page.getByRole('heading', { name: /Idea 2: divide and conquer/ });
  await expect(heading).toBeInViewport();
});

test('every chapter figure works on a phone @phone', async ({ page }) => {
  const errors = watchErrors(page);
  for (const c of CHAPTERS) {
    await page.goto(`/#/${c.slug}`);
    await expect(page.locator('figure')).toHaveCount(c.figures);
    const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(width, `${c.slug} scrolls sideways`).toBeLessThanOrEqual(0);
  }
  await expectNoBrokenFigures(page);
  expect(errors).toEqual([]);
});

test('interactive controls do what they say', async ({ page }) => {
  // Sorting figure: invalid input is rejected politely, valid input is sorted.
  await page.goto('/#/sorting-barrier');
  const sorting = page.locator('figure').nth(0);
  const input = sorting.getByRole('textbox');
  await input.fill('5, banana');
  await expect(sorting.getByRole('alert')).toContainText('numbers');
  await input.fill('9, 2, 7');
  await sorting.getByRole('button', { name: 'Jump to the end' }).click();
  await expect(sorting).toContainText('2, 7, 9: your numbers, sorted');

  // Potentials puzzle: "Show a solution" makes every edge non-negative.
  await page.goto('/#/negative-edges');
  const puzzle = page.locator('figure').nth(3);
  await puzzle.getByRole('button', { name: 'Show a solution' }).click();
  await expect(puzzle.getByText(/Every edge is now 0 or more/)).toBeVisible();

  // Bellman–Ford: lowering C → B to 2 creates a negative cycle that gets reported.
  const bellmanFord = page.locator('figure').nth(2);
  await bellmanFord.getByRole('button', { name: 'Decrease' }).click();
  await bellmanFord.getByRole('button', { name: 'Jump to the end' }).click();
  await expect(bellmanFord).toContainText('negative cycle');

  // 2022 walkthrough: every re-roll still matches Bellman–Ford.
  const bnw = page.locator('figure').nth(5);
  for (let i = 0; i < 3; i++) {
    await bnw.getByRole('button', { name: /Re-roll/ }).click();
    await bnw.getByRole('button', { name: 'Jump to the end' }).click();
    await expect(bnw).toContainText('They match Bellman–Ford exactly');
  }
});

test('the race runs in a background worker and both algorithms agree', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/#/sorting-barrier/the-race-theory-versus-practice');
  const race = page.locator('figure').filter({ hasText: 'Figure 3.5' });
  await race.getByRole('button', { name: /Run the race/ }).click();
  await expect(race.getByText(/Finished: 5 sizes/)).toBeVisible({ timeout: 45_000 });
  await expect(race).toContainText('(they did)');
  await expect(race.locator('tbody tr')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('about page lists sources, and unknown pages show a friendly not-found page', async ({ page }) => {
  await page.goto('/#/about');
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
  expect(await page.locator('article a[href^="https://arxiv.org"]').count()).toBeGreaterThan(10);
  expect(await accessibilityViolations(page)).toEqual([]);
  await page.goto('/#/no-such-page');
  await expect(page.getByRole('heading', { name: "There's no page here" })).toBeVisible();
});
