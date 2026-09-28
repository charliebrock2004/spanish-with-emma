import { expect, test, type Page } from '@playwright/test';
import { COURSE } from '@/data/curriculum';
import { buildCurriculum } from '@/lib/curriculum/build';
import { play } from './support/lesson';
import { mockSpeech } from './support/speech';

/**
 * A brand-new learner's first session, start to finish: onboarding, the
 * welcome chest, the whole first lesson answered perfectly (with combos),
 * the results, the celebrations that follow and today's quests.
 * Set QA_SHOTS=<dir> to save a screenshot of every step.
 */

const shots = process.env.QA_SHOTS;
let step = 0;
async function snap(page: Page, name: string) {
  if (!shots) return;
  step += 1;
  await page.screenshot({ path: `${shots}/${String(step).padStart(2, '0')}-${name}.png` });
}

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('spanish-with-emma') ?? '{}').state);

test.beforeEach(async ({ page }) => {
  await mockSpeech(page);
});

test('a new learner’s first session, start to finish', async ({ page }) => {
  test.setTimeout(180_000);
  const lesson = buildCurriculum(COURSE).lessons.find((l) => l.id === 'l1-hola')!;

  // Onboarding.
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
  await snap(page, 'welcome');
  await page.getByRole('button', { name: '¡Hola, Emma!' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: /completely new/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.fill('#player-name', 'Alex');
  await page.getByRole('button', { name: 'Continue' }).click();
  // The trip starts in Madrid: a boarding pass with the first lesson on it.
  await expect(page.getByText('Tarjeta de embarque')).toBeVisible();
  await snap(page, 'ready');
  await page.getByRole('button', { name: /go to Madrid/ }).click();
  await expect(page.getByText('¡Buen viaje!')).toBeVisible();

  // The first lesson, answered perfectly.
  await expect(page).toHaveURL(/\/lesson\/l1-hola$/);
  for (const exercise of lesson.exercises) {
    await play(page, exercise);
    if (exercise.type === 'match' || exercise.type === 'conversation') await snap(page, `lesson-${exercise.type}`);
  }

  // Results: three stars, the perfect bonus, XP and coins.
  await expect(page.getByRole('heading', { name: 'Perfect lesson!' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
  const rewards = page.getByRole('list', { name: 'Rewards' });
  await expect(rewards.getByText('Perfect lesson')).toBeVisible();
  await expect(rewards.getByText('+50 XP')).toBeVisible();
  await snap(page, 'results');

  // Then the celebrations: the first level-up is a full-screen moment.
  await expect(page.getByRole('dialog', { name: /Level up!/ })).toBeVisible({ timeout: 15_000 });
  await snap(page, 'level-up');
  while (await page.getByRole('button', { name: '¡Vamos!' }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: '¡Vamos!' }).click();
    await page.waitForTimeout(400);
  }

  const state = await saved(page);
  expect(state.completedLessons['l1-hola'].stars).toBe(3);
  expect(state.stats.perfectLessons).toBe(1);
  expect(state.stats.bestCombo).toBeGreaterThanOrEqual(10);
  expect(state.xp).toBeGreaterThan(300);
  expect(state.coins).toBeGreaterThan(0);
  expect(state.achievements['getting-started']).toBeTruthy();
  expect(state.achievements['perfect-lesson']).toBeTruthy();
  expect(state.quests.quests[0]).toMatchObject({ metric: 'lessons', done: true });
  expect(state.streak.current).toBe(1);

  // Home: the welcome chest from onboarding is waiting.
  await page.getByRole('button', { name: 'Back to the map' }).or(page.getByRole('button', { name: 'Next lesson' })).first().click();
  await page.goto('/');
  await expect(page.getByText(/chest.* waiting/)).toBeVisible();
  await snap(page, 'home-after');
  await page.getByRole('button', { name: 'Open', exact: true }).first().click();
  await page.getByRole('button', { name: 'Open the chest' }).click();
  await expect(page.getByText('100 coins')).toBeVisible();
  await snap(page, 'welcome-chest');
  await page.getByRole('button', { name: 'Collect' }).click();
  expect((await saved(page)).chests.find((c: { kind: string }) => c.kind === 'welcome').openedAt).toBeTruthy();

  // Profile shows the new player.
  await page.goto('/profile');
  await expect(page.getByText(/Player level \d+/)).toBeVisible();
  await snap(page, 'profile');
});
