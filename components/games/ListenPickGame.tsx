'use client';

import { useEffect, useRef, useState } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { Icon } from '@/components/ui/Icon';
import { useVoiceStatus } from '@/components/voice/hooks';
import { distinctWords, listenQuestion } from '@/lib/games/rounds';
import type { VocabLike } from '@/lib/progress/srs';
import { cn, seededRandom, shuffle } from '@/lib/utils';
import { soundService } from '@/services/sound/SoundService';
import { voiceService } from '@/services/voice/VoiceService';
import type { ArcadeProps } from './types';
import { GameShell } from './GameShell';
import { useCombo } from './useCombo';

const ROUNDS = 10;

/** Emma says a word; pick what it means. 10 points each, multiplied by the combo. */
export function ListenPickGame({ game, pool, seed, onFinish, onClose }: ArcadeProps) {
  const [questions] = useState(() => {
    const random = seededRandom(seed);
    return distinctWords(shuffle(pool, random))
      .slice(0, ROUNDS)
      .map((w) => listenQuestion(w, pool, random));
  });
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const combo = useCombo();
  const points = useRef(0);
  const { speaking } = useVoiceStatus();
  const results = useRef<Array<{ word: VocabLike; correct: boolean }>>([]);
  const started = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    started.current = Date.now();
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      voiceService.stop();
    };
  }, []);

  const q = questions[index];

  useEffect(() => {
    if (!q) return;
    const t = window.setTimeout(() => void voiceService.saySpanish(q.prompt), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const play = (slow = false) => {
    if (q) void voiceService.saySpanish(q.prompt, slow ? { rateFactor: 0.65 } : {});
  };

  const answer = (option: string) => {
    if (!q || chosen) return;
    const correct = option === q.answer;
    setChosen(option);
    results.current.push({ word: q.word, correct });
    soundService.play(correct ? 'correct' : 'incorrect');
    if (correct) {
      points.current += 10 * combo.hit();
      setScore(points.current);
    } else combo.miss();
    timers.current.push(
      window.setTimeout(
        () => {
          if (index + 1 < questions.length) {
            setChosen(null);
            setIndex(index + 1);
            return;
          }
          const right = results.current.filter((r) => r.correct).length;
          onFinish({
            score: points.current,
            bestCombo: combo.best.current,
            correct: right,
            answered: results.current.length,
            seconds: Math.round((Date.now() - started.current) / 1000),
            words: results.current,
            listeningCorrect: right,
          });
        },
        correct ? 800 : 1700,
      ),
    );
  };

  if (!q) return null;

  return (
    <GameShell game={game} progress={(index + (chosen ? 1 : 0)) / questions.length} score={score} combo={combo.combo} onClose={onClose}>
      <p className="text-center text-sm font-extrabold text-ink-soft">
        Word {index + 1} of {questions.length}
      </p>
      <div className="mt-6 flex flex-col items-center">
        <button
          type="button"
          onClick={() => play()}
          aria-label="Hear the word again"
          className="relative rounded-full bg-paper p-2 shadow-lift transition-transform active:scale-95"
        >
          <EmmaAvatar state={speaking ? 'speaking' : 'happy'} size={112} animated={speaking} />
          <span className="absolute -right-1 bottom-1 grid h-11 w-11 place-items-center rounded-full bg-terracotta text-white shadow-card">
            <Icon name="speaker" size={20} />
          </span>
        </button>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={() => play(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-extrabold text-ink-soft hover:bg-cream-deep">
            <Icon name="turtle" size={18} /> Slower
          </button>
        </div>
        <p
          lang="es"
          className={cn('spanish mt-2 h-8 text-2xl transition-opacity duration-300', chosen ? 'opacity-100' : 'opacity-0')}
          aria-hidden={!chosen}
        >
          {q.prompt}
        </p>
      </div>
      <div className="mt-auto grid gap-3 pt-4" role="group" aria-label="What does it mean?">
        {q.options.map((option) => {
          const isAnswer = option === q.answer;
          const isChosen = option === chosen;
          return (
            <button
              key={option}
              type="button"
              onClick={() => answer(option)}
              disabled={Boolean(chosen)}
              className={cn(
                'min-h-14 rounded-2xl border-2 px-4 text-left text-[17px] font-bold transition-colors duration-150',
                !chosen && 'border-sand bg-paper shadow-[0_3px_0_var(--color-sand)] active:translate-y-[2px] active:shadow-none',
                chosen && isAnswer && 'border-sage bg-sage-light text-sage-dark',
                chosen && isChosen && !isAnswer && 'animate-shake border-brick bg-[#fbe3de] text-brick',
                chosen && !isAnswer && !isChosen && 'border-sand/60 bg-paper text-ink-faint',
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
