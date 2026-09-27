import { expect, test, type Page } from '@playwright/test';
import { COURSE } from '@/data/curriculum';
import { buildCurriculum } from '@/lib/curriculum/build';
import type { Exercise } from '@/types/curriculum';
import { mockSpeech, willHear } from './support/speech';

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

/** Clicks the button in `group` whose text is exactly `text` (ignoring keyboard hints). */
async function pick(page: Page, groupName: string, text: string) {
  const buttons = page.getByRole('group', { name: groupName }).getByRole('button');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const label = (await buttons.nth(i).innerText()).replace(/^\s*\d\s*/, '').trim();
    if (label === text) return buttons.nth(i).click();
  }
  throw new Error(`No "${text}" in ${groupName}`);
}

async function continueAfterFeedback(page: Page) {
  const next = page.getByRole('button', { name: /^(Continue|Got it)$/ }).last();
  await next.click();
}

async function play(page: Page, exercise: Exercise) {
  switch (exercise.type) {
    case 'intro':
      await page.getByRole('button', { name: 'Continue' }).click();
      return;
    case 'tip':
      await page.getByRole('button', { name: 'Got it' }).click();
      return;
    case 'speak':
      await willHear(page, exercise.accept[0] ?? exercise.spanish);
      await page.getByRole('button', { name: 'Tap to speak' }).click();
      await continueAfterFeedback(page);
      return;
    case 'choice':
      await pick(page, 'Answer options', exercise.answer);
      await page.getByRole('button', { name: 'Check' }).click();
      await continueAfterFeedback(page);
      return;
    case 'listen':
      await pick(page, 'What did Emma say?', exercise.audio);
      await page.getByRole('button', { name: 'Check' }).click();
      await continueAfterFeedback(page);
      return;
    case 'match':
      for (const pair of exercise.pairs) {
        await pick(page, 'Spanish', pair.spanish);
        await pick(page, 'English', pair.english);
      }
      await continueAfterFeedback(page);
      return;
    case 'translate':
      // Beginners get a word bank; switch to the keyboard and type the answer.
      if (await page.getByRole('button', { name: 'Use keyboard' }).isVisible()) await page.getByRole('button', { name: 'Use keyboard' }).click();
      await page.getByRole('textbox').fill(exercise.answers[0]);
      await page.getByRole('button', { name: 'Check' }).click();
      await continueAfterFeedback(page);
      return;
    case 'order':
      for (const tile of exercise.tiles) {
        await page.locator('[aria-label="Word bank"] button:not([aria-hidden])', { hasText: tile }).first().click();
      }
      await page.getByRole('button', { name: 'Check' }).click();
      await continueAfterFeedback(page);
      return;
    case 'conversation':
      for (const turn of exercise.turns) {
        if (!turn.reply) continue;
        await page.getByRole('button', { name: turn.reply.hint, exact: true }).click();
      }
      await continueAfterFeedback(page);
      return;
  }
}

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
  await snap(page, 'ready');
  await page.getByRole('button', { name: /Start learning/ }).click();

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
