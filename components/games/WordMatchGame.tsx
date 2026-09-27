'use client';

import { useEffect, useRef, useState } from 'react';
import { matchRounds } from '@/lib/games/rounds';
import type { VocabLike } from '@/lib/progress/srs';
import { cn, seededRandom, shuffle } from '@/lib/utils';
import { soundService } from '@/services/sound/SoundService';
import { voiceService } from '@/services/voice/VoiceService';
import { useGameStore } from '@/store/gameStore';
import type { ArcadeProps } from './types';
import { GameShell } from './GameShell';

type Side = 'es' | 'en';

/** Three boards of five pairs. 10 points a pair, −2 for a mix-up, and a bonus for speed. */
export function WordMatchGame({ game, pool, seed, onFinish, onClose }: ArcadeProps) {
  const autoplay = useGameStore((s) => s.settings.autoplayAudio);
  const [boards] = useState(() => matchRounds(pool, seededRandom(seed), 3, 5));
  const [layouts] = useState(() =>
    boards.map((board, i) => {
      const random = seededRandom(seed + i + 1);
      return { es: shuffle(board, random), en: shuffle(board, random) };
    }),
  );
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<{ side: Side; id: string } | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const missed = useRef(new Set<string>());
  const started = useRef(0);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  useEffect(() => {
    started.current = Date.now();
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const board = boards[round] ?? [];
  const totalPairs = boards.reduce((n, b) => n + b.length, 0);
  const donePairs = boards.slice(0, round).reduce((n, b) => n + b.length, 0) + matched.length;

  const finish = (finalScore: number, endedAt: number) => {
    if (finished.current) return;
    finished.current = true;
    const seconds = Math.round((endedAt - started.current) / 1000);
    const bonus = Math.max(0, 90 - seconds);
    const all = boards.flat();
    onFinish({
      score: finalScore + bonus,
      correct: all.filter((w) => !missed.current.has(w.id)).length,
      answered: all.length,
      seconds,
      words: all.map((word) => ({ word, correct: !missed.current.has(word.id) })),
    });
  };

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const tap = (side: Side, word: VocabLike) => {
    if (matched.includes(word.id) || wrong.length) return;
    if (side === 'es' && autoplay) void voiceService.saySpanish(word.spanish);
    if (!picked || picked.side === side) {
      soundService.play('tap');
      setPicked({ side, id: word.id });
      return;
    }
    if (picked.id === word.id) {
      soundService.play('match');
      const next = [...matched, word.id];
      const nextScore = score + 10;
      setMatched(next);
      setScore(nextScore);
      setPicked(null);
      if (next.length === board.length) {
        later(() => {
          if (round + 1 < boards.length) {
            setRound(round + 1);
            setMatched([]);
          } else {
            finish(nextScore, Date.now());
          }
        }, 450);
      }
      return;
    }
    soundService.play('incorrect');
    missed.current.add(word.id);
    missed.current.add(picked.id);
    setScore((s) => Math.max(0, s - 2));
    setWrong([`${picked.side}:${picked.id}`, `${side}:${word.id}`]);
    setPicked(null);
    later(() => setWrong([]), 550);
  };

  const tile = (side: Side, word: VocabLike) => {
    const key = `${side}:${word.id}`;
    const isMatched = matched.includes(word.id);
    const isPicked = picked?.side === side && picked.id === word.id;
    const isWrong = wrong.includes(key);
    return (
      <button
        key={key}
        type="button"
        lang={side}
        disabled={isMatched}
        onClick={() => tap(side, word)}
        aria-pressed={isPicked}
        className={cn(
          'min-h-[58px] rounded-2xl border-2 px-3 py-2 text-[16px] leading-tight font-bold transition-all duration-200',
          isMatched && 'scale-95 border-transparent bg-sage-light text-sage-dark opacity-0',
          !isMatched && !isPicked && !isWrong && 'border-sand bg-paper shadow-[0_3px_0_var(--color-sand)] active:translate-y-[2px] active:shadow-none',
          isPicked && 'border-terracotta bg-terracotta-light text-terracotta-dark shadow-[0_3px_0_var(--color-terracotta)]',
          isWrong && 'animate-shake border-brick bg-[#fbe3de] text-brick',
          side === 'es' && !isMatched && 'spanish',
        )}
      >
        {side === 'es' ? word.spanish : word.english}
      </button>
    );
  };

  const layout = layouts[round];

  return (
    <GameShell game={game} progress={totalPairs ? donePairs / totalPairs : 0} score={score} onClose={onClose}>
      <p className="text-center text-sm font-extrabold text-ink-soft">
        Board {Math.min(round + 1, boards.length)} of {boards.length}
      </p>
      {layout && (
        <div key={round} className="mt-4 grid animate-enter grid-cols-2 gap-3">
          <div className="grid gap-3" role="group" aria-label="Spanish words">
            {layout.es.map((w) => tile('es', w))}
          </div>
          <div className="grid gap-3" role="group" aria-label="English meanings">
            {layout.en.map((w) => tile('en', w))}
          </div>
        </div>
      )}
      <p className="mt-auto pt-6 text-center text-xs font-bold text-ink-faint">Tap a word, then its meaning</p>
    </GameShell>
  );
}
