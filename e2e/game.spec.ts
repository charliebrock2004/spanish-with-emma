import { expect, test, type Page } from '@playwright/test';
import { learnerState, seed } from './support/seed';
import { mockSpeech, spoken } from './support/speech';

/**
 * The game layer: rewards, quests, achievements, chests, the shop, levels,
 * streaks, voice settings and layout. Each test seeds a known save (version 2,
 * so no migration runs) and plays a short, real flow.
 */

const DAY = 86_400_000;
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => dateKey(new Date());
const yesterday = () => dateKey(new Date(Date.now() - DAY));

type Save = ReturnType<typeof learnerState>['state'] & Record<string, unknown>;

/** A learner with a known wallet, as a current (v2) save. */
function gameState(overrides: Record<string, unknown> = {}) {
  const base = learnerState();
  return {
    version: 2,
    state: {
      ...base.state,
      coins: 100,
      streak: { current: 1, longest: 1, lastActiveDate: today(), freezes: 1, frozenDates: [], runStart: today() },
      ...overrides,
    } as Save,
  };
}

function quest(metric: string, title: string, done: boolean) {
  return { id: `${today()}:${metric}`, metric, target: 1, progress: done ? 1 : 0, title, emoji: '🎯', reward: { xp: 60, coins: 15 }, done };
}

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('spanish-with-emma') ?? '{}').state);

/** The one-question "Fix my mistakes" review from the seed. */
async function playMistakesReview(page: Page) {
  await page.goto('/review/mistakes');
  await page.getByRole('button', { name: 'buenos días', exact: true }).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('+10 XP').first()).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: '1 mistake fixed!' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockSpeech(page);
});

test('earning XP and coins from a session', async ({ page }) => {
  await seed(page, gameState({ xp: 500 }));
  await playMistakesReview(page);
  const rewards = page.getByRole('list', { name: 'Rewards' });
  await expect(rewards.getByText('Review complete')).toBeVisible();
  await expect(rewards.getByText('+20 XP')).toBeVisible();
  const state = await saved(page);
  expect(state.xp).toBeGreaterThanOrEqual(530);
  expect(state.coins).toBeGreaterThanOrEqual(105);
  expect(state.stats.reviewSessions).toBe(1);
});

test('completing a quest, the daily chest and an achievement', async ({ page }) => {
  await seed(
    page,
    gameState({
      xp: 500,
      quests: { date: today(), quests: [quest('lessons', 'Complete a lesson', true), quest('games', 'Play a game', true), quest('reviews', 'Finish a review session', false)] },
    }),
  );
  await playMistakesReview(page);
  const toast = page.getByTestId('toast');
  await expect(toast.filter({ hasText: 'Quest complete' })).toBeVisible({ timeout: 15_000 });
  await expect(toast.filter({ hasText: 'Chest earned' })).toBeVisible({ timeout: 15_000 });
  await expect(toast.filter({ hasText: 'Achievement unlocked' }).first()).toBeVisible({ timeout: 20_000 });
  const state = await saved(page);
  expect(state.quests.quests.every((q: { done: boolean }) => q.done)).toBe(true);
  expect(state.chests.some((c: { kind: string; openedAt: number | null }) => c.kind === 'daily' && !c.openedAt)).toBe(true);
  expect(state.achievements['first-quest']).toBeTruthy();
  expect(state.stats.questsCompleted).toBe(1);
  expect(state.claimed[`quest:${today()}:reviews`]).toBeTruthy();
});

test('opening a chest pays out once', async ({ page }) => {
  await seed(page, gameState({ chests: [{ id: 'chest:test', kind: 'daily', source: 'A test chest', earnedAt: Date.now(), openedAt: null, prizes: null }] }));
  await page.goto('/');
  await expect(page.getByText('A chest is waiting!')).toBeVisible();
  await page.getByRole('button', { name: 'Open', exact: true }).first().click();
  await page.getByRole('button', { name: 'What could be inside?' }).click();
  await expect(page.getByText('Plus one of:')).toBeVisible();
  await page.getByRole('button', { name: 'Open the chest' }).click();
  await expect(page.getByText('40 coins')).toBeVisible();
  await page.getByRole('button', { name: 'Collect' }).click();
  const state = await saved(page);
  expect(state.coins).toBeGreaterThanOrEqual(140);
  expect(state.chests[0].openedAt).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Hola Charlie/ })).toBeVisible();
  await expect(page.getByText('A chest is waiting!')).toHaveCount(0);
  expect((await saved(page)).coins).toBe(state.coins);
});

test('buying and wearing a cosmetic', async ({ page }) => {
  await seed(page, gameState({ coins: 1000 }));
  await page.goto('/shop');
  await page.locator('[data-item="outfit-flamenco"]').click();
  await page.getByRole('button', { name: /Buy for 500/ }).click();
  await page.getByRole('button', { name: 'Wear it now' }).click();
  await expect(page.getByTestId('hud-coins')).toContainText('525'); // 500 back from 1,000, +25 for the "Treat Yourself" achievement
  await page.goto('/');
  await expect(page.locator('main img[src*="/emma/outfits/outfit-flamenco/"]').first()).toBeVisible();
  const state = await saved(page);
  expect(state.inventory.owned['outfit-flamenco']).toBeTruthy();
  expect(state.inventory.equipped.outfit).toBe('outfit-flamenco');
  // Already owned: it can't be bought twice.
  await page.goto('/shop');
  await page.locator('[data-item="outfit-flamenco"]').click();
  await expect(page.getByRole('button', { name: /Buy for/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Equipped', exact: true })).toBeVisible();
});

test('the shop refuses what you can’t afford and shows exclusives as silhouettes', async ({ page }) => {
  await seed(page, gameState({ coins: 50 }));
  await page.goto('/shop');
  await page.locator('[data-item="outfit-mediterraneo"]').click();
  await expect(page.getByRole('button', { name: /Buy for 750/ })).toBeDisabled();
  await expect(page.getByText(/You need 700 more coins/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-item="outfit-gold"]')).toHaveAttribute('aria-label', /Locked item: Reach player level 20/);
  expect((await saved(page)).coins).toBe(50);
});

test('levelling up', async ({ page }) => {
  await seed(page, gameState({ xp: 140 }));
  await playMistakesReview(page);
  await expect(page.getByRole('dialog', { name: /Level up!/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'You reached level 2' })).toBeVisible();
  await page.getByRole('button', { name: '¡Vamos!' }).click();
  const state = await saved(page);
  expect(state.claimed['level:2']).toBeTruthy();
});

test('keeping a streak reaches a milestone', async ({ page }) => {
  await seed(page, gameState({ xp: 500, streak: { current: 2, longest: 2, lastActiveDate: yesterday(), freezes: 1, frozenDates: [], runStart: dateKey(new Date(Date.now() - 2 * DAY)) } }));
  await playMistakesReview(page);
  await expect(page.getByText('3 day streak').first()).toBeVisible();
  // The milestone first, then the level-up its XP caused.
  await expect(page.getByRole('dialog', { name: /3 day streak/ })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: '¡Vamos!' }).click();
  await expect(page.getByRole('dialog', { name: /Level up!/ })).toBeVisible();
  await page.getByRole('button', { name: '¡Vamos!' }).click();
  const state = await saved(page);
  expect(state.streak.current).toBe(3);
  await page.goto('/quests');
  await expect(page.getByRole('heading', { name: '3 day streak' })).toBeVisible();
});

test('voice settings: expressive voice, effects volume and Emma’s device voice as the fallback', async ({ page }) => {
  await seed(page, gameState());
  await page.goto('/settings');
  const expressive = page.getByRole('switch', { name: 'Expressive voice' });
  await expect(expressive).toHaveAttribute('aria-checked', 'true');
  await expressive.click();
  // The seed has sound effects off; switching them on shows the volume.
  await page.getByRole('switch', { name: 'Sound effects' }).click();
  await expect(page.getByRole('slider', { name: 'Effects volume' })).toBeVisible();
  // No cloud voice on this server: Emma speaks with the device's voices.
  await page.getByRole('button', { name: 'Hear Emma' }).click();
  await expect.poll(async () => (await spoken(page)).join(' | ')).toMatch(/¡Hola, Charlie!/);
  const lines = await spoken(page);
  expect(lines.some((l) => l.startsWith('[Mónica]'))).toBe(true);
  const state = await saved(page);
  expect(state.settings.expressiveVoice).toBe(false);
});

test('a full game: countdown, play, results with rewards', async ({ page }) => {
  await seed(page, gameState());
  await page.goto('/play/listen-pick');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  const answers = page.getByRole('group', { name: 'What does it mean?' });
  await answers.waitFor();
  for (let i = 0; i < 10; i++) {
    const buttons = answers.getByRole('button');
    await buttons.first().click();
    await page.waitForTimeout(1900);
    if (await page.getByText('points').isVisible().catch(() => false)) {
      if (await page.getByRole('button', { name: 'Play again' }).isVisible().catch(() => false)) break;
    }
  }
  await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('list', { name: 'Rewards' }).getByText('Game complete')).toBeVisible();
  const state = await saved(page);
  expect(state.stats.gamesPlayed).toBe(1);
  expect(state.gameCoins.coins).toBeGreaterThan(0);
});

for (const width of [320, 390]) {
  test(`mobile layout has no sideways scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await seed(page, gameState({ coins: 1234 }));
    for (const path of ['/', '/learn', '/quests', '/shop', '/profile', '/review', '/emma', '/settings']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });
}
