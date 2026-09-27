import { expect, test } from '@playwright/test';
import { learnerState, seed } from './support/seed';
import { mockSpeech } from './support/speech';

const state = learnerState();
const meanings = new Map(Object.values(state.state.vocab).map((w) => [w.spanish, w.english]));

test.beforeEach(async ({ page }) => {
  await mockSpeech(page);
  await seed(page, state);
});

test('the review hub shows due words, mistakes and games', async ({ page }) => {
  await page.goto('/review');
  await expect(page.getByText(/words? ready for review/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fix my mistakes' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Word Match/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your words' })).toBeVisible();
});

test('smart review starts a session of due words', async ({ page }) => {
  await page.goto('/review/smart');
  await expect(page.getByRole('button', { name: 'Leave lesson' })).toBeVisible();
  await expect(page.getByText('Quick review').first()).toBeVisible();
});

test('fixing a mistake resolves it', async ({ page }) => {
  await page.goto('/review/mistakes');
  await expect(page.getByText('How do you say "good morning" in Spanish?')).toBeVisible();
  await page.getByRole('button', { name: 'buenos días', exact: true }).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: '1 mistake fixed!' })).toBeVisible();
});

test('Word Match can be played to the end', async ({ page }) => {
  await page.goto('/play/word-match');
  await page.getByRole('button', { name: 'Start' }).click();
  for (let board = 0; board < 3; board++) {
    const spanishTiles = page.locator('[aria-label="Spanish words"] button:not([disabled])');
    if ((await spanishTiles.count()) === 0) break;
    while ((await spanishTiles.count()) > 0) {
      const tile = spanishTiles.first();
      const spanish = (await tile.innerText()).trim();
      await tile.click();
      await page.locator('[aria-label="English meanings"] button:not([disabled])', { hasText: meanings.get(spanish)! }).first().click();
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(600);
  }
  await expect(page.getByText('points')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();
});
