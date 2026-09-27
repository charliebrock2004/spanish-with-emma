'use client';

import { useCallback, useMemo, useState } from 'react';
import { checkTypedAnswer } from '@/lib/text/answer';
import { hashString, personalise, seededRandom, shuffle } from '@/lib/utils';
import type { WordOrderExercise as WordOrderExerciseType } from '@/types/curriculum';
import { ActionBar, CheckButton, PromptBubble, WordTiles } from '../parts';
import type { ExerciseProps } from '../types';

export function WordOrderExercise({ exercise, env, onAnswer }: ExerciseProps<WordOrderExerciseType>) {
  const tiles = useMemo(() => {
    const all = [...exercise.tiles, ...exercise.distractors.slice(0, env.profile.orderDistractors)];
    const random = seededRandom(hashString(exercise.id));
    let mixed = shuffle(all, random);
    // Never hand the player the answer already in order.
    for (let i = 0; i < 4 && mixed.slice(0, exercise.tiles.length).join(' ') === exercise.tiles.join(' '); i++) {
      mixed = shuffle(all, random);
    }
    return mixed;
  }, [exercise, env.profile.orderDistractors]);

  const [chosen, setChosen] = useState<number[]>([]);
  const [status, setStatus] = useState<'correct' | 'wrong' | null>(null);

  const submit = useCallback(() => {
    if (chosen.length === 0 || status) return;
    const sentence = chosen.map((i) => tiles[i]).join(' ');
    const result = checkTypedAnswer(sentence, [exercise.answer, ...exercise.alternatives], { lang: exercise.lang, name: env.name });
    setStatus(result.correct ? 'correct' : 'wrong');
    onAnswer({
      correct: result.correct,
      given: personalise(sentence, env.name),
      expected: personalise(exercise.answer, env.name),
      expectedLang: exercise.lang,
      mistakeType: result.correct ? undefined : result.mistakeType === 'vocabulary' ? 'vocabulary' : 'word-order',
    });
  }, [chosen, status, tiles, exercise, env.name, onAnswer]);

  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-6">
        <PromptBubble text={exercise.lang === 'es' ? 'Build this sentence in Spanish.' : 'What does this mean? Build it in English.'} name={env.name} />
        <p
          lang={exercise.lang === 'es' ? 'en' : 'es'}
          className={
            exercise.lang === 'es'
              ? 'mt-6 animate-enter text-center text-2xl font-extrabold'
              : 'mt-6 animate-enter text-center font-display text-3xl font-semibold text-brick'
          }
        >
          {personalise(exercise.prompt, env.name)}
        </p>
        <div className="mt-8">
          <WordTiles
            tiles={tiles}
            chosen={chosen}
            onChoose={(i) => setChosen((c) => [...c, i])}
            onRemove={(p) => setChosen((c) => c.filter((_, idx) => idx !== p))}
            lang={exercise.lang}
            name={env.name}
            locked={env.locked || Boolean(status)}
            status={status}
          />
        </div>
      </div>
      <ActionBar hidden={env.locked}>
        <CheckButton disabled={chosen.length === 0 || Boolean(status)} onClick={submit} />
      </ActionBar>
    </>
  );
}
