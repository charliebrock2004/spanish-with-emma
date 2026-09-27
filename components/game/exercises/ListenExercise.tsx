'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SpeakerButton } from '@/components/voice/SpeakerButton';
import { checkTypedAnswer } from '@/lib/text/answer';
import { normalizeText, stripAccents } from '@/lib/text/normalize';
import { hashString, seededRandom, shuffle } from '@/lib/utils';
import type { ListenExercise as ListenExerciseType } from '@/types/curriculum';
import { ActionBar, AnswerInput, CheckButton, OptionButton, PromptBubble, type OptionState } from '../parts';
import type { ExerciseProps } from '../types';

const same = (a: string, b: string) => stripAccents(normalizeText(a)) === stripAccents(normalizeText(b));

export function ListenExercise({ exercise, env, onAnswer, onDone }: ExerciseProps<ListenExerciseType>) {
  const mode = exercise.mode === 'type' || (env.profile.dictation && exercise.audio.split(' ').length > 1) ? 'type' : 'choose';
  const options = useMemo(() => {
    const count = Math.max(2, Math.min(env.profile.choiceOptions, exercise.distractors.length + 1));
    return shuffle([exercise.audio, ...exercise.distractors.slice(0, count - 1)], seededRandom(hashString(exercise.id)));
  }, [exercise, env.profile.choiceOptions]);
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = useCallback(() => {
    if (submitted) return;
    if (mode === 'choose') {
      if (!selected) return;
      setSubmitted(true);
      onAnswer({
        correct: same(selected, exercise.audio),
        given: selected,
        expected: exercise.audio,
        expectedLang: 'es',
        mistakeType: 'listening',
      });
    } else {
      if (!text.trim()) return;
      setSubmitted(true);
      const result = checkTypedAnswer(text, [exercise.audio], { lang: 'es', name: env.name });
      onAnswer({
        correct: result.correct,
        given: text,
        expected: exercise.audio,
        expectedLang: 'es',
        nearMiss: result.nearMiss,
        mistakeType: 'listening',
      });
    }
  }, [submitted, mode, selected, text, exercise.audio, env.name, onAnswer]);

  useEffect(() => {
    if (mode !== 'choose') return;
    const onKey = (e: KeyboardEvent) => {
      if (env.locked || submitted) return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) setSelected(options[n - 1]);
      if (e.key === 'Enter' && selected) submit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, options, selected, submit, env.locked, submitted]);

  // No speech output at all on this device: be honest and move on.
  if (!env.canSpeak) {
    return (
      <>
        <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-4">
          <PromptBubble
            text="Your device can't play my voice right now, so let's skip this listening one. You can switch voices in Settings."
            name={env.name}
            state="confused"
          />
        </div>
        <ActionBar hidden={env.locked}>
          <Button size="lg" block onClick={onDone}>
            Skip
          </Button>
        </ActionBar>
      </>
    );
  }

  const stateFor = (option: string): OptionState => {
    if (!submitted) return selected === option ? 'selected' : 'idle';
    if (same(option, exercise.audio)) return 'correct';
    if (option === selected) return 'wrong';
    return 'dim';
  };

  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-6">
        <PromptBubble text={mode === 'choose' ? 'Listen. What did I say?' : 'Listen, then type what you hear.'} name={env.name} />
        <div className="mt-8 flex animate-enter justify-center">
          <SpeakerButton
            text={exercise.audio}
            size="xl"
            autoPlay={env.autoplay}
            rateFactor={env.profile.rateFactor}
            label="Play what Emma said"
          />
        </div>
        <div className="mt-8">
          {mode === 'choose' ? (
            <div className="grid gap-3" role="group" aria-label="What did Emma say?">
              {options.map((option, i) => (
                <OptionButton
                  key={option}
                  index={i}
                  lang="es"
                  state={stateFor(option)}
                  disabled={submitted || env.locked}
                  onClick={() => setSelected(option)}
                >
                  {option}
                </OptionButton>
              ))}
            </div>
          ) : (
            <AnswerInput
              value={text}
              onChange={setText}
              onSubmit={submit}
              placeholder="Escribe lo que oyes…"
              lang="es"
              locked={env.locked || submitted}
              label="What you heard, in Spanish"
            />
          )}
        </div>
      </div>
      <ActionBar hidden={env.locked}>
        <CheckButton disabled={submitted || (mode === 'choose' ? !selected : !text.trim())} onClick={submit} />
      </ActionBar>
    </>
  );
}
