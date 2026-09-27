'use client';

import { useEffect } from 'react';
import { EmmaText } from '@/components/emma/EmmaText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/primitives';
import { SpeakerButton } from '@/components/voice/SpeakerButton';
import { useSpeaker } from '@/components/voice/hooks';
import type { IntroExercise, TipExercise } from '@/types/curriculum';
import { ActionBar, PromptBubble } from '../parts';
import type { ExerciseProps } from '../types';

/** Teaches a new word: Emma says it, then the player hears and sees it. */
export function IntroCard({ exercise, env, onDone }: ExerciseProps<IntroExercise>) {
  const { say } = useSpeaker();
  const lines = exercise.lines?.length ? exercise.lines : [`*${exercise.spanish}* — ${exercise.english}.`];
  const script = lines.join(' ');
  const isPhrase = exercise.spanish.includes(' ');

  useEffect(() => {
    if (!env.autoplay) return;
    const t = window.setTimeout(() => void say(script), 350);
    return () => window.clearTimeout(t);
  }, [exercise.id, env.autoplay, say, script]);

  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-6">
        <PromptBubble text={script} name={env.name} />
        <Card className="mt-6 animate-enter px-6 pt-6 pb-7 text-center">
          <p className="text-xs font-extrabold tracking-[0.18em] text-terracotta uppercase">{isPhrase ? 'New phrase' : 'New word'}</p>
          <p lang="es" className="mt-3 font-display text-[44px] leading-[1.05] font-semibold text-brick [font-variation-settings:'SOFT'_50,'WONK'_1]">
            {exercise.spanish}
          </p>
          {env.showPronunciation && exercise.pronunciation && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cream-deep px-3 py-1 text-sm font-extrabold tracking-wide text-ink-soft">
              <span aria-hidden>🗣️</span>
              <span className="sr-only">Pronounced</span>
              {exercise.pronunciation}
            </p>
          )}
          <p className="mt-3 text-xl font-bold text-ink-soft">{exercise.english}</p>
          <div className="mt-5 flex justify-center">
            <SpeakerButton text={exercise.spanish} size="lg" label={`Hear “${exercise.spanish}”`} />
          </div>
          {exercise.note && (
            <p className="mt-6 flex gap-2 rounded-2xl bg-sun-light px-4 py-3 text-left text-[15px]">
              <span aria-hidden>💡</span>
              <EmmaText text={exercise.note} name={env.name} />
            </p>
          )}
          {exercise.example && (
            <div className="mt-4 rounded-2xl border-2 border-dashed border-sand px-4 py-3 text-left">
              <p lang="es" className="spanish text-lg">
                {exercise.example.spanish}
              </p>
              <p className="text-sm text-ink-soft">{exercise.example.english}</p>
            </div>
          )}
        </Card>
      </div>
      <ActionBar hidden={env.locked}>
        <Button size="lg" block onClick={onDone} data-autofocus>
          Continue
        </Button>
      </ActionBar>
    </>
  );
}

/** Grammar / pronunciation / culture tip. */
export function TipCard({ exercise, env, onDone }: ExerciseProps<TipExercise>) {
  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-6">
        <Card className="animate-enter overflow-hidden">
          <div className="flex items-center gap-3 bg-sun-light px-5 py-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-paper text-xl" aria-hidden>
              💡
            </span>
            <div>
              <p className="text-xs font-extrabold tracking-[0.16em] text-honey-dark uppercase">Emma&rsquo;s tip</p>
              <h2 className="font-display text-xl leading-tight font-semibold">{exercise.title}</h2>
            </div>
          </div>
          <div className="px-5 py-5">
            <p className="text-[17px] leading-relaxed">
              <EmmaText text={exercise.body} name={env.name} />
            </p>
            {exercise.examples && exercise.examples.length > 0 && (
              <ul className="mt-5 space-y-2">
                {exercise.examples.map((ex) => (
                  <li key={ex.spanish} className="flex items-center gap-3 rounded-2xl bg-cream px-3 py-2.5">
                    <SpeakerButton text={ex.spanish} size="sm" showSlow={false} label={`Hear “${ex.spanish}”`} />
                    <div className="min-w-0">
                      <p lang="es" className="spanish text-lg leading-tight">
                        {ex.spanish}
                      </p>
                      <p className="text-sm text-ink-soft">
                        {ex.english}
                        {env.showPronunciation && ex.pronunciation && <span className="text-ink-faint"> · {ex.pronunciation}</span>}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
      <ActionBar hidden={env.locked}>
        <Button size="lg" block onClick={onDone}>
          Got it
        </Button>
      </ActionBar>
    </>
  );
}
