import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { accessibilityViolations, expectNoBrokenFigures, watchErrors } from './helpers';

test.describe('playground', () => {
  test('draw a graph, edit a weight, and run every algorithm on it', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/#/playground');
    await page.getByRole('combobox').selectOption('empty');
    const canvas = page.getByRole('application');
    const box = (await canvas.boundingBox())!;
    const at = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });

    // Three vertices, then A → B and B → C.
    for (const [fx, fy] of [
      [0.2, 0.5],
      [0.5, 0.3],
      [0.8, 0.5],
    ]) {
      await page.mouse.click(at(fx, fy).x, at(fx, fy).y); // add
      await page.mouse.click(at(0.5, 0.9).x, at(0.5, 0.9).y); // clear selection
    }
    await page.mouse.click(at(0.2, 0.5).x, at(0.2, 0.5).y);
    await page.mouse.click(at(0.5, 0.3).x, at(0.5, 0.3).y);
    await expect(page.getByRole('heading', { name: 'Edge A → B' })).toBeVisible();
    await page.getByRole('spinbutton').fill('-2');
    await page.mouse.click(at(0.5, 0.3).x, at(0.5, 0.3).y);
    await page.mouse.click(at(0.8, 0.5).x, at(0.8, 0.5).y);
    await expect(page.getByRole('heading', { name: 'Edge B → C' })).toBeVisible();
    await page.getByRole('spinbutton').fill('5');

    await page.getByRole('tab', { name: /Run an algorithm/ }).click();
    const algorithms = page.getByRole('group', { name: 'Algorithm' });
    for (const name of ['Dijkstra', 'Bellman–Ford', 'Hybrid']) {
      await algorithms.getByRole('button', { name }).click();
      await page.getByRole('button', { name: 'Jump to the end' }).click();
      await expect(page.locator('figure p[aria-live]')).toContainText('Done');
    }
    await algorithms.getByRole('button', { name: '2022 algorithm' }).click();
    await expect(page.locator('figure')).toContainText('scaling rounds');
    // The 2025 algorithm refuses negative edges, with an explanation.
    await algorithms.getByRole('button', { name: '2025 algorithm' }).click();
    await expect(page.getByText(/needs non-negative weights/)).toBeVisible();

    await expectNoBrokenFigures(page);
    expect(errors).toEqual([]);
  });

  test('saves a graph as JSON and opens it again', async ({ page }) => {
    await page.goto('/#/playground');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save as JSON' }).click();
    const file = await (await download).path();
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    expect(saved.n).toBe(8);

    await page.getByRole('combobox').selectOption('empty');
    await page.locator('input[type=file]').setInputFiles(file);
    await expect(page.getByText(/Loaded/)).toBeVisible();
    await expect(page.getByRole('application').locator('g[transform]')).toHaveCount(8);

    await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"n": 3}') });
    await expect(page.getByText(/Couldn't load that file/)).toBeVisible();
  });

  test('has no accessibility violations', async ({ page }) => {
    await page.goto('/#/playground');
    await expect(page.getByRole('application')).toBeVisible();
    expect(await accessibilityViolations(page)).toEqual([]);
  });
});
