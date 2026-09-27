'use client';

import { useEffect, useRef, useState } from 'react';
import { speedQuestion, wordStream, type ChoiceQuestion } from '@/lib/games/rounds';
import type { VocabLike } from '@/lib/progress/srs';
import { cn, seededRandom } from '@/lib/utils';
import { soundService } from '@/services/sound/SoundService';
import type { ArcadeProps } from './types';
import { GameShell } from './GameShell';
import { useCombo } from './useCombo';
import { useCountdown } from './useCountdown';

function questionMaker(pool: VocabLike[], seed: number) {
  const random = seededRandom(seed);
  const stream = wordStream(pool, random);
  let i = 0;
  return () => speedQuestion(stream(), pool, random, i++);
}

/** As many right answers as possible in 60 seconds. */
export function SpeedRoundGame({ game, pool, seed, onFinish, onClose }: ArcadeProps) {
  const seconds = game.seconds ?? 60;
  const [nextQuestion] = useState(() => questionMaker(pool, seed));
  const [q, setQ] = useState<ChoiceQuestion>(() => nextQuestion());
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const combo = useCombo();
  const points = useRef(0);
  const [count, setCount] = useState(0);
  const results = useRef<Array<{ word: VocabLike; correct: boolean }>>([]);
  const over = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const end = () => {
    if (over.current) return;
    over.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    const right = results.current.filter((r) => r.correct).length;
    onFinish({ score: points.current, correct: right, answered: results.current.length, seconds, words: results.current, bestCombo: combo.best.current });
  };

  const timeLeft = useCountdown(seconds, end);

  const answer = (option: string) => {
    if (chosen || over.current) return;
    const correct = option === q.answer;
    results.current.push({ word: q.word, correct });
    setChosen(option);
    if (correct) {
      soundService.play('correct');
      points.current += 10 * combo.hit();
      setScore(points.current);
    } else {
      soundService.play('incorrect');
      combo.miss();
    }
    timer.current = window.setTimeout(
      () => {
        if (over.current) return;
        setChosen(null);
        setQ(nextQuestion());
        setCount((n) => n + 1);
      },
      correct ? 220 : 900,
    );
  };

  return (
    <GameShell game={game} progress={timeLeft / seconds} timeLeft={timeLeft} score={score} combo={combo.combo} onClose={onClose}>
      <div key={count} className="flex flex-1 animate-enter flex-col">
        <p className="text-center text-sm font-extrabold text-ink-soft">
          {q.promptLang === 'es' ? 'What does this mean?' : 'How do you say this in Spanish?'}
        </p>
        <p
          lang={q.promptLang}
          className={cn('mt-6 text-center text-[38px] leading-tight font-semibold', q.promptLang === 'es' ? 'spanish font-display' : 'font-display')}
        >
          {q.prompt}
        </p>
        <div className="mt-auto grid grid-cols-2 gap-3 pt-6" role="group" aria-label="Answers">
          {q.options.map((option) => {
            const isAnswer = option === q.answer;
            const isChosen = option === chosen;
            return (
              <button
                key={option}
                type="button"
                lang={q.optionsLang}
                onClick={() => answer(option)}
                disabled={Boolean(chosen)}
                className={cn(
                  'min-h-[76px] rounded-2xl border-2 px-3 text-[17px] leading-tight font-bold transition-colors duration-100',
                  !chosen && 'border-sand bg-paper shadow-[0_3px_0_var(--color-sand)] active:translate-y-[2px] active:shadow-none',
                  chosen && isAnswer && 'border-sage bg-sage-light text-sage-dark',
                  chosen && isChosen && !isAnswer && 'animate-shake border-brick bg-[#fbe3de] text-brick',
                  chosen && !isAnswer && !isChosen && 'border-sand/60 bg-paper text-ink-faint',
                  q.optionsLang === 'es' && 'spanish',
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
