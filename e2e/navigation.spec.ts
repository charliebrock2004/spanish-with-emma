import { expect, test } from '@playwright/test';
import { seed } from './support/seed';
import { mockSpeech } from './support/speech';

test.beforeEach(async ({ page }) => {
  await mockSpeech(page);
  await seed(page);
});

test('home shows today’s progress and the next lesson', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Hola Charlie/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Continue quest/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Daily quests|Today complete/ })).toBeVisible();
  // The HUD: player level, streak and coins.
  await expect(page.getByRole('link', { name: /Player level \d+/ })).toBeVisible();
  await expect(page.getByTestId('hud-coins')).toBeVisible();
});

test('every tab in the bottom navigation works', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' }).last();

  await nav.getByRole('link', { name: 'Learn' }).click();
  await expect(page.getByRole('heading', { name: 'Your journey' })).toBeVisible();
  await expect(page.getByText('First Words').first()).toBeVisible();

  await nav.getByRole('link', { name: 'Emma' }).click();
  await expect(page.getByRole('heading', { name: 'Talk to Emma' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Guided conversations' })).toBeVisible();

  await nav.getByRole('link', { name: 'Review' }).click();
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();
  await expect(page.getByText('Smart review').first()).toBeVisible();

  await nav.getByRole('link', { name: 'Profile' }).click();
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  await expect(page.getByText('Achievements')).toBeVisible();
});

test('the level map lists all six levels', async ({ page }) => {
  await page.goto('/learn');
  for (const title of ['First Words', 'Everyday Basics', 'Real Life', 'Travel Spanish', 'Conversation', 'Fluent Foundations']) {
    await expect(page.getByRole('heading', { name: title }).first()).toBeAttached();
  }
});
