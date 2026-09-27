import { expect, test } from '@playwright/test';
import { mockSpeech, spoken, willHear } from './support/speech';

test('a new learner meets Emma and says their first Spanish word', async ({ page }) => {
  await mockSpeech(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);

  await page.getByRole('button', { name: '¡Hola, Emma!' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: /completely new/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.fill('#player-name', 'Charlie');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Start learning/ }).click();

  await expect(page).toHaveURL(/\/lesson\/l1-hola$/);
  await expect(page.getByText('That means hello', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Speak: the fake microphone hears "hola".
  await willHear(page, 'hola');
  await page.getByRole('button', { name: 'Tap to speak' }).click();
  await expect(page.getByText("¡Perfecto! That's your first Spanish word.")).toBeVisible();
  await expect(page.getByText('+15 XP').first()).toBeVisible();

  // Emma voiced the Spanish with the Spanish voice.
  expect((await spoken(page)).some((line) => line.startsWith('[Mónica]'))).toBe(true);
});

test('the lesson player offers typing when the microphone is blocked', async ({ page }) => {
  await mockSpeech(page);
  await page.goto('/welcome');
  await page.getByRole('button', { name: '¡Hola, Emma!' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: /completely new/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.fill('#player-name', 'Sam');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Start learning/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await willHear(page, '__denied__');
  await page.getByRole('button', { name: 'Tap to speak' }).click();
  await expect(page.getByText(/microphone/i).first()).toBeVisible();
});
