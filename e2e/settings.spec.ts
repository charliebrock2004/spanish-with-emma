import { expect, test } from '@playwright/test';
import { seed } from './support/seed';
import { mockSpeech, willHear } from './support/speech';

test.beforeEach(async ({ page }) => {
  await mockSpeech(page);
  await seed(page);
});

test('the microphone test reports what Emma heard', async ({ page }) => {
  await page.goto('/settings');
  await willHear(page, 'hola me llamo charlie');
  await page.getByRole('button', { name: 'Test microphone' }).click();
  await expect(page.getByText('It works! I heard:')).toBeVisible();
  await expect(page.getByText('hola me llamo charlie')).toBeVisible();
});

test('settings are saved on the device', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: /Spanish/ }).first().click();
  await page.getByRole('switch', { name: 'Reduce motion' }).click();
  await expect(page.locator('html')).toHaveClass(/reduce-motion/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('spanish-with-emma') ?? '{}').state.settings);
  expect(saved.voiceMode).toBe('spanish');
  expect(saved.reduceMotion).toBe(true);
});

test('device voices are listed, with the Scottish voice marked', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('combobox').nth(1)).toContainText('Fiona');
  await expect(page.getByRole('option', { name: /Scottish/ })).toBeAttached();
});
