import { expect, test } from '@playwright/test';
import { seed } from './support/seed';
import { mockSpeech, willHear } from './support/speech';

test('Emma remembers what you tell her in a guided conversation', async ({ page }) => {
  await mockSpeech(page);
  await seed(page);
  await page.goto('/emma/meet-emma');
  await expect(page.getByText('¿Cómo te llamas?')).toBeVisible();

  const say = async (text: string) => {
    await willHear(page, text);
    await page.getByRole('button', { name: 'Tap and answer Emma' }).click();
  };

  await say('hola emma me llamo charlie');
  await expect(page.getByText('¡Encantada, Charlie!')).toBeVisible();
  await say('bien gracias y tú');
  await expect(page.getByText('¿De dónde eres?')).toBeVisible();
  await say('soy de escocia');
  await expect(page.getByText('¡Ah, Escocia!', { exact: false })).toBeVisible();
});

test('Emma corrects a mistake gently and lets you try again', async ({ page }) => {
  await mockSpeech(page);
  await seed(page);
  await page.goto('/emma/favourites');
  await expect(page.getByText('¿cuál es tu color favorito?', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Reply by typing' }).click();

  const type = async (text: string) => {
    await page.fill('#reply-input', text);
    await page.getByRole('button', { name: 'Send' }).click();
  };
  await type('el azul');
  await expect(page.getByText('¿Y tienes un número favorito?')).toBeVisible();
  await type('el siete');
  await expect(page.getByText('¿Te gusta el café?')).toBeVisible();
  await type('yo gusto el café');

  await expect(page.getByText('Almost! ❤️').first()).toBeVisible();
  await expect(page.getByText('In Spanish we normally say:')).toBeVisible();
  await expect(page.getByText(/Me gusta el café/).first()).toBeVisible();
});
