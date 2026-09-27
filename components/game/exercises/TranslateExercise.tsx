'use client';

import { useCallback, useMemo, useState } from 'react';
import { SpeakerButton } from '@/components/voice/SpeakerButton';
import { Icon } from '@/components/ui/Icon';
import { checkTypedAnswer } from '@/lib/text/answer';
import { detectCommonMistake } from '@/lib/text/mistakes';
import { toTiles } from '@/lib/text/normalize';
import { hashString, personalise, seededRandom, shuffle } from '@/lib/utils';
import type { TranslateExercise as TranslateExerciseType } from '@/types/curriculum';
import { ActionBar, AnswerInput, CheckButton, PromptBubble, WordTiles } from '../parts';
import type { ExerciseProps } from '../types';

export function TranslateExercise({ exercise, env, onAnswer }: ExerciseProps<TranslateExerciseType>) {
  const answerLang = exercise.from === 'en' ? 'es' : 'en';
  const [mode, setMode] = useState<'type' | 'bank'>(env.profile.wordBank ? 'bank' : 'type');
  const [text, setText] = useState('');
  const [chosen, setChosen] = useState<number[]>([]);
  const [status, setStatus] = useState<'correct' | 'wrong' | null>(null);
  const [hintShown, setHintShown] = useState(false);

  const canonical = personalise(exercise.answers[0], env.name);
  const tiles = useMemo(() => {
    const words = toTiles(canonical);
    return shuffle([...words, ...exercise.bankDistractors.slice(0, Math.max(2, 5 - words.length))], seededRandom(hashString(exercise.id)));
  }, [canonical, exercise]);

  const given = mode === 'bank' ? chosen.map((i) => tiles[i]).join(' ') : text;

  const submit = useCallback(() => {
    if (!given.trim() || status) return;
    const result = checkTypedAnswer(given, exercise.answers, { lang: answerLang, name: env.name });
    setStatus(result.correct ? 'correct' : 'wrong');
    const hint = !result.correct && answerLang === 'es' ? detectCommonMistake(given) : null;
    onAnswer({
      correct: result.correct,
      given,
      expected: personalise(result.expected, env.name),
      expectedLang: answerLang,
      nearMiss: result.nearMiss,
      mistakeType: hint?.type ?? result.mistakeType,
      correction: hint?.message,
      retryable: !result.correct,
    });
  }, [given, status, exercise.answers, answerLang, env.name, onAnswer]);

  const prompt =
    exercise.from === 'en' ? 'Translate this into Spanish.' : 'What does this mean in English?';
  const firstWord = toTiles(canonical)[0];

  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-6">
        <PromptBubble text={prompt} name={env.name} />
        <div className="mt-6 flex animate-enter items-center gap-3 rounded-2xl bg-paper px-4 py-4 shadow-card">
          {exercise.from === 'es' && <SpeakerButton text={personalise(exercise.text, env.name)} size="sm" showSlow={false} autoPlay={env.autoplay && env.canSpeak} />}
          <p lang={exercise.from} className={exercise.from === 'es' ? 'spanish text-2xl' : 'text-2xl font-extrabold'}>
            {personalise(exercise.text, env.name)}
          </p>
        </div>

        <div className="mt-6">
          {mode === 'type' ? (
            <AnswerInput
              value={text}
              onChange={setText}
              onSubmit={submit}
              placeholder={answerLang === 'es' ? 'Escribe en español…' : 'Type in English…'}
              lang={answerLang}
              locked={env.locked || Boolean(status)}
              status={status}
              label={answerLang === 'es' ? 'Your answer in Spanish' : 'Your answer in English'}
            />
          ) : (
            <WordTiles
              tiles={tiles}
              chosen={chosen}
              onChoose={(i) => setChosen((c) => [...c, i])}
              onRemove={(p) => setChosen((c) => c.filter((_, idx) => idx !== p))}
              lang={answerLang}
              name={env.name}
              locked={env.locked || Boolean(status)}
              status={status}
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'type' ? 'bank' : 'type'))}
            disabled={Boolean(status)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-terracotta hover:bg-terracotta-light"
          >
            <Icon name={mode === 'type' ? 'shuffle' : 'keyboard'} size={18} />
            {mode === 'type' ? 'Use word bank' : 'Use keyboard'}
          </button>
          {env.profile.hints && mode === 'type' && !status && (
            <button
              type="button"
              onClick={() => setHintShown(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-ink-soft hover:bg-cream-deep"
            >
              <Icon name="bulb" size={18} />
              {hintShown ? (
                <span>
                  Starts with <span lang={answerLang} className="text-brick">“{exercise.hint ?? firstWord}…”</span>
                </span>
              ) : (
                'Hint'
              )}
            </button>
          )}
        </div>
      </div>
      <ActionBar hidden={env.locked}>
        <CheckButton disabled={!given.trim() || Boolean(status)} onClick={submit} />
      </ActionBar>
    </>
  );
}
