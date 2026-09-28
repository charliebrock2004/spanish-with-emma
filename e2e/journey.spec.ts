import { expect, test } from '@playwright/test';
import { COURSE } from '@/data/curriculum';
import { buildCurriculum } from '@/lib/curriculum/build';
import { play } from './support/lesson';
import { learnerState, seed } from './support/seed';
import { mockSpeech } from './support/speech';

/**
 * The journey across Spain: finishing a region is a moment (a passport stamp
 * and a train to the next city), and the map and Home move on with you.
 * Along the way: the lesson's pacing (a final challenge) and its biggest
 * answer moments (a first word, combos).
 */

const lessons = buildCurriculum(COURSE).lessons;

test.beforeEach(async ({ page }) => {
  await mockSpeech(page);
});

test('finishing Madrid: a final challenge, a passport stamp and the train to Salamanca', async ({ page }) => {
  test.setTimeout(120_000);
  const state = learnerState();
  const now = Date.now();
  // Every Madrid lesson done but the first; no words yet, so nothing extra slips in and the first spoken word is a milestone.
  state.state.completedLessons = Object.fromEntries(
    lessons
      .filter((l) => l.level === 1 && l.id !== 'l1-hola')
      .map((l) => [l.id, { level: 1, completedAt: now - 86_400_000, bestAccuracy: 1, perfect: true, attempts: 1, xpEarned: 80 }]),
  ) as typeof state.state.completedLessons;
  (state.state as Record<string, unknown>).vocab = {};
  (state.state as Record<string, unknown>).mistakes = [];
  await seed(page, state);

  await page.goto('/lesson/l1-hola');
  const lesson = lessons.find((l) => l.id === 'l1-hola')!;
  const tiers: string[] = [];
  for (const [i, exercise] of lesson.exercises.entries()) {
    if (i === lesson.exercises.length - 1) await expect(page.getByRole('status').filter({ hasText: 'Final challenge' })).toBeVisible();
    await play(page, exercise, async () => {
      tiers.push((await page.locator('[data-tier]').getAttribute('data-tier')) ?? '');
    });
  }
  // The first word said out loud, and the final challenge, are milestones; a run of right answers makes combos.
  expect(tiers[0]).toBe('milestone');
  expect(tiers.at(-1)).toBe('milestone');
  expect(tiers).toContain('combo');
  expect(tiers).toContain('fire');

  const moment = page.getByRole('dialog', { name: 'Madrid complete. Next stop: Salamanca' });
  await expect(moment).toBeVisible({ timeout: 15_000 });
  await expect(moment.getByRole('img', { name: 'Madrid complete' })).toBeVisible();
  await expect(moment.getByText('¿Sabías que…?')).toBeVisible();
  await moment.getByRole('button', { name: 'Travel to Salamanca' }).click();
  await expect(page.getByText('Madrid complete!')).toBeVisible();

  await page.goto('/learn');
  await expect(page.getByRole('img', { name: /Journey: 1 of 6 stops complete, now in Salamanca/ })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Stop 1: Madrid, complete' }).getByRole('img', { name: 'Madrid complete' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Stop 2: Salamanca' })).toContainText('You are here');
  await expect(page.getByRole('article', { name: /Stop 3: Barcelona, not reached yet/ })).toContainText('lessons more in Salamanca to travel here');

  await page.goto('/');
  await expect(page.getByRole('link', { name: /Your journey: Salamanca, 0 of \d+ lessons/ })).toBeVisible();
});
