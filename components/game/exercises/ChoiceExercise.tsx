'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SpeakerButton } from '@/components/voice/SpeakerButton';
import { normalizeText, stripAccents } from '@/lib/text/normalize';
import { cn, hashString, personalise, seededRandom, shuffle } from '@/lib/utils';
import type { ChoiceExercise as ChoiceExerciseType } from '@/types/curriculum';
import { ActionBar, CheckButton, OptionButton, PromptBubble, type OptionState } from '../parts';
import type { ExerciseProps } from '../types';

const same = (a: string, b: string) => stripAccents(normalizeText(a)) === stripAccents(normalizeText(b));

export function ChoiceExercise({ exercise, env, onAnswer }: ExerciseProps<ChoiceExerciseType>) {
  const options = useMemo(() => {
    const count = Math.max(2, Math.min(env.profile.choiceOptions, exercise.distractors.length + 1));
    const list = [exercise.answer, ...exercise.distractors.slice(0, count - 1)];
    return shuffle(list, seededRandom(hashString(exercise.id)));
  }, [exercise, env.profile.choiceOptions]);

  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = useCallback(() => {
    if (!selected || submitted) return;
    setSubmitted(true);
    const correct = same(selected, exercise.answer);
    onAnswer({
      correct,
      given: selected,
      expected: exercise.answer,
      expectedLang: exercise.optionsLang,
      mistakeType: exercise.variant === 'fill' || exercise.variant === 'question' ? 'grammar' : 'vocabulary',
    });
  }, [selected, submitted, exercise, onAnswer]);

  // Keyboard: 1–5 to choose, Enter to check.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (env.locked || submitted) return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) setSelected(options[n - 1]);
      if (e.key === 'Enter' && selected) submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [options, selected, submit, env.locked, submitted]);

  const stateFor = (option: string): OptionState => {
    if (!submitted) return selected === option ? 'selected' : 'idle';
    if (same(option, exercise.answer)) return 'correct';
    if (option === selected) return 'wrong';
    return 'dim';
  };

  const [before, after] = (exercise.display ?? '').split('___');
  const isFill = exercise.variant === 'fill';
  const autoAudio = exercise.variant === 'meaning' && exercise.audio;

  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-6">
        <PromptBubble text={exercise.prompt} name={env.name} />

        {exercise.display && (
          <div className="mt-6 flex animate-enter flex-col items-center gap-3 text-center">
            {isFill ? (
              <p lang="es" className="font-display text-[28px] leading-snug font-semibold">
                {personalise(before, env.name)}
                <span
                  className={cn(
                    'mx-1 inline-block min-w-20 border-b-4 px-2 pb-0.5 transition-colors',
                    selected ? 'border-terracotta text-brick' : 'border-sand text-transparent',
                  )}
                >
                  {selected ?? '···'}
                </span>
                {personalise(after ?? '', env.name)}
              </p>
            ) : (
              <p
                lang={exercise.displayLang}
                className={cn(
                  'font-display leading-tight font-semibold',
                  exercise.displayLang === 'es' ? 'text-[40px] text-brick' : 'text-[30px] text-ink',
                )}
              >
                {exercise.displayLang === 'en' ? `“${personalise(exercise.display, env.name)}”` : personalise(exercise.display, env.name)}
              </p>
            )}
            {exercise.displayTranslation && <p className="text-ink-soft">{exercise.displayTranslation}</p>}
            {(autoAudio || (exercise.audio && exercise.variant === 'question')) && (
              <SpeakerButton text={exercise.audio!} autoPlay={Boolean(autoAudio) && env.autoplay && env.canSpeak} size="md" />
            )}
          </div>
        )}

        <div className="mt-8 grid gap-3" role="group" aria-label="Answer options">
          {options.map((option, i) => (
            <OptionButton
              key={option}
              index={i}
              lang={exercise.optionsLang}
              state={stateFor(option)}
              disabled={submitted || env.locked}
              onClick={() => setSelected(option)}
            >
              {personalise(option, env.name)}
            </OptionButton>
          ))}
        </div>
      </div>
      <ActionBar hidden={env.locked}>
        <CheckButton disabled={!selected || submitted} onClick={submit} />
      </ActionBar>
    </>
  );
}
