import type { Page } from '@playwright/test';
import type { Exercise } from '@/types/curriculum';
import { willHear } from './speech';

/** Clicks the button in `group` whose text is exactly `text` (ignoring keyboard hints). */
export async function pick(page: Page, groupName: string, text: string) {
  const buttons = page.getByRole('group', { name: groupName }).getByRole('button');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const label = (await buttons.nth(i).innerText()).replace(/^\s*\d\s*/, '').trim();
    if (label === text) return buttons.nth(i).click();
  }
  throw new Error(`No "${text}" in ${groupName}`);
}

/** Answers one exercise correctly. `afterAnswer` runs when the feedback panel is up, before continuing. */
export async function play(page: Page, exercise: Exercise, afterAnswer?: () => Promise<void>) {
  const next = async () => {
    await page.locator('[data-tier]').waitFor();
    if (afterAnswer) await afterAnswer();
    await page.getByRole('button', { name: /^(Continue|Got it)$/ }).last().click();
  };
  switch (exercise.type) {
    case 'intro':
      return page.getByRole('button', { name: 'Continue' }).click();
    case 'tip':
      return page.getByRole('button', { name: 'Got it' }).click();
    case 'speak':
      await willHear(page, exercise.accept[0] ?? exercise.spanish);
      await page.getByRole('button', { name: 'Tap to speak' }).click();
      return next();
    case 'choice':
      await pick(page, 'Answer options', exercise.answer);
      await page.getByRole('button', { name: 'Check' }).click();
      return next();
    case 'listen':
      await pick(page, 'What did Emma say?', exercise.audio);
      await page.getByRole('button', { name: 'Check' }).click();
      return next();
    case 'match':
      for (const pair of exercise.pairs) {
        await pick(page, 'Spanish', pair.spanish);
        await pick(page, 'English', pair.english);
      }
      return next();
    case 'translate':
      // Beginners get a word bank; switch to the keyboard and type the answer.
      if (await page.getByRole('button', { name: 'Use keyboard' }).isVisible()) await page.getByRole('button', { name: 'Use keyboard' }).click();
      await page.getByRole('textbox').fill(exercise.answers[0]);
      await page.getByRole('button', { name: 'Check' }).click();
      return next();
    case 'order':
      for (const tile of exercise.tiles) {
        await page.locator('[aria-label="Word bank"] button:not([aria-hidden])', { hasText: tile }).first().click();
      }
      await page.getByRole('button', { name: 'Check' }).click();
      return next();
    case 'conversation':
      for (const turn of exercise.turns) {
        if (!turn.reply) continue;
        await page.getByRole('button', { name: turn.reply.hint, exact: true }).click();
      }
      return next();
  }
}
