'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { blastCard, wordStream, type BlastCard } from '@/lib/games/rounds';
import type { VocabLike } from '@/lib/progress/srs';
import { cn, seededRandom } from '@/lib/utils';
import { soundService } from '@/services/sound/SoundService';
import type { ArcadeProps } from './types';
import { GameShell } from './GameShell';
import { useCountdown } from './useCountdown';

function cardMaker(pool: VocabLike[], seed: number) {
  const random = seededRandom(seed);
  const stream = wordStream(pool, random);
  return () => blastCard(stream(), pool, random);
}

/** True or false, fast. Every five in a row adds a point to each answer. */
export function VocabBlastGame({ game, pool, seed, onFinish, onClose }: ArcadeProps) {
  const seconds = game.seconds ?? 45;
  const [nextCard] = useState(() => cardMaker(pool, seed));
  const [card, setCard] = useState<BlastCard>(() => nextCard());
  const [verdict, setVerdict] = useState<'right' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [count, setCount] = useState(0);
  const results = useRef<Array<{ word: VocabLike; correct: boolean }>>([]);
  const over = useRef(false);
  const timer = useRef<number | null>(null);
  const answerRef = useRef<(yes: boolean) => void>(() => {});

  const end = () => {
    if (over.current) return;
    over.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    const right = results.current.filter((r) => r.correct).length;
    onFinish({ score, correct: right, answered: results.current.length, seconds, words: results.current });
  };
  const timeLeft = useCountdown(seconds, end);

  const answer = (yes: boolean) => {
    if (verdict || over.current) return;
    const correct = yes === card.isMatch;
    results.current.push({ word: card.word, correct });
    if (correct) {
      soundService.play('correct');
      setScore((s) => s + 1 + Math.floor(combo / 5));
      setCombo((c) => c + 1);
    } else {
      soundService.play('incorrect');
      setCombo(0);
    }
    setVerdict(correct ? 'right' : 'wrong');
    timer.current = window.setTimeout(
      () => {
        if (over.current) return;
        setVerdict(null);
        setCard(nextCard());
        setCount((n) => n + 1);
      },
      correct ? 200 : 1100,
    );
  };

  useEffect(() => {
    answerRef.current = answer;
  });

  // Keyboard: ← / N for false, → / Y for true.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'n') answerRef.current(false);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'y') answerRef.current(true);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <GameShell game={game} progress={timeLeft / seconds} timeLeft={timeLeft} score={score} combo={combo} onClose={onClose}>
      <p className="text-center text-sm font-extrabold text-ink-soft">Does it mean this?</p>
      <div
        key={count}
        className={cn(
          'mx-auto mt-6 w-full max-w-sm animate-pop rounded-[2rem] border-2 bg-paper px-6 py-8 text-center shadow-lift transition-colors',
          verdict === 'right' && 'border-sage bg-sage-light',
          verdict === 'wrong' && 'animate-shake border-brick bg-[#fbe3de]',
          !verdict && 'border-transparent',
        )}
      >
        <p lang="es" className="spanish font-display text-[40px] leading-tight font-semibold">
          {card.spanish}
        </p>
        <p className="mt-3 text-sm font-extrabold tracking-[0.2em] text-ink-faint uppercase">means</p>
        <p className="mt-2 font-display text-[30px] leading-tight font-semibold">{card.english}</p>
        <p className={cn('mt-3 h-6 text-sm font-bold text-brick', verdict === 'wrong' ? 'opacity-100' : 'opacity-0')} aria-live="polite">
          {verdict === 'wrong' && (card.isMatch ? 'It does!' : `No — it means “${card.word.english}”`)}
        </p>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-4 pt-6">
        <button
          type="button"
          onClick={() => answer(false)}
          aria-label="No, it doesn't"
          className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl bg-brick text-white shadow-[0_5px_0_#5e1f16] active:translate-y-[3px] active:shadow-[0_2px_0_#5e1f16]"
        >
          <Icon name="x" size={34} strokeWidth={3} />
          <span className="text-sm font-black tracking-wide uppercase">Nope</span>
        </button>
        <button
          type="button"
          onClick={() => answer(true)}
          aria-label="Yes, it does"
          className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl bg-sage text-white shadow-[0_5px_0_var(--color-sage-dark)] active:translate-y-[3px] active:shadow-[0_2px_0_var(--color-sage-dark)]"
        >
          <Icon name="check" size={34} strokeWidth={3} />
          <span className="text-sm font-black tracking-wide uppercase">Yes</span>
        </button>
      </div>
    </GameShell>
  );
}
