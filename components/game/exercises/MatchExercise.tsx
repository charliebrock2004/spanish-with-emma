'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { voiceService } from '@/services/voice/VoiceService';
import { soundService } from '@/services/sound/SoundService';
import { cn, hashString, seededRandom, shuffle } from '@/lib/utils';
import type { MatchExercise as MatchExerciseType } from '@/types/curriculum';
import { PromptBubble } from '../parts';
import type { ExerciseProps } from '../types';

/** Tap a Spanish word, then its meaning. Spanish tiles speak when tapped. */
export function MatchExercise({ exercise, env, onAnswer }: ExerciseProps<MatchExerciseType>) {
  const [left, right] = useMemo(() => {
    const random = seededRandom(hashString(exercise.id));
    return [shuffle(exercise.pairs, random), shuffle(exercise.pairs, random)];
  }, [exercise.id, exercise.pairs]);
  const [pickedLeft, setPickedLeft] = useState<string | null>(null);
  const [pickedRight, setPickedRight] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<[string, string] | null>(null);
  const missed = useRef(new Set<string>());
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const finish = (allMatched: string[]) => {
    if (allMatched.length !== exercise.pairs.length) return;
    timers.current.push(
      window.setTimeout(() => {
        onAnswer({
          correct: missed.current.size === 0,
          given: '',
          expected: '',
          expectedLang: 'en',
          mistakeType: 'vocabulary',
          vocabResults: exercise.pairs.map((p) => ({ id: p.id, correct: !missed.current.has(p.id) })),
          xp: 10,
        });
      }, 350),
    );
  };

  const resolve = (leftId: string, rightId: string) => {
    if (leftId === rightId) {
      soundService.play('match');
      const next = [...matched, leftId];
      setMatched(next);
      setPickedLeft(null);
      setPickedRight(null);
      finish(next);
      return;
    }
    soundService.play('incorrect');
    missed.current.add(leftId);
    missed.current.add(rightId);
    setWrong([leftId, rightId]);
    timers.current.push(
      window.setTimeout(() => {
        setWrong(null);
        setPickedLeft(null);
        setPickedRight(null);
      }, 650),
    );
  };

  const pickLeft = (id: string, spanish: string) => {
    if (wrong) return;
    if (env.canSpeak) void voiceService.saySpanish(spanish);
    setPickedLeft(id);
    if (pickedRight) resolve(id, pickedRight);
  };

  const pickRight = (id: string) => {
    if (wrong) return;
    setPickedRight(id);
    if (pickedLeft) resolve(pickedLeft, id);
  };

  const tileClass = (id: string, picked: string | null) => {
    const isMatched = matched.includes(id);
    const isWrong = Boolean(wrong?.includes(id)) && picked === id;
    return cn(
      'min-h-[3.75rem] w-full rounded-2xl border-2 px-3 py-2 text-[16px] font-bold transition-all duration-200',
      isMatched && 'scale-[0.97] border-sage/40 bg-sage-light/60 text-sage-dark/50',
      !isMatched && isWrong && 'animate-shake border-honey bg-honey-light text-honey-dark',
      !isMatched && !isWrong && picked === id && 'border-terracotta bg-terracotta-light/60 text-brick shadow-[0_3px_0_var(--color-terracotta)]',
      !isMatched &&
        !isWrong &&
        picked !== id &&
        'border-sand bg-paper shadow-[0_3px_0_var(--color-sand)] active:translate-y-[2px] active:shadow-none',
    );
  };

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-10">
      <PromptBubble text="Match the pairs. Tap a Spanish word to hear it." name={env.name} />
      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="space-y-3" role="group" aria-label="Spanish">
          {left.map((p) => (
            <button
              key={p.id}
              type="button"
              lang="es"
              disabled={matched.includes(p.id) || env.locked}
              aria-pressed={pickedLeft === p.id}
              onClick={() => pickLeft(p.id, p.spanish)}
              className={cn(tileClass(p.id, pickedLeft), 'font-display text-[17px] font-semibold')}
            >
              {p.spanish}
            </button>
          ))}
        </div>
        <div className="space-y-3" role="group" aria-label="English">
          {right.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={matched.includes(p.id) || env.locked}
              aria-pressed={pickedRight === p.id}
              onClick={() => pickRight(p.id)}
              className={tileClass(p.id, pickedRight)}
            >
              {p.english}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
