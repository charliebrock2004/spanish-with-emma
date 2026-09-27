'use client';

import { useEffect, useState } from 'react';
import { EmmaFullBody } from '@/components/emma/EmmaFigure';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Confetti } from '@/components/ui/Confetti';
import { AnimatedNumber } from '@/components/ui/primitives';
import type { VocabLike } from '@/lib/progress/srs';
import type { StreakUpdate } from '@/lib/progress/streak';
import { XP } from '@/lib/progress/xp';
import { soundService } from '@/services/sound/SoundService';
import { voiceService } from '@/services/voice/VoiceService';
import { useGameStore } from '@/store/gameStore';
import type { GameDef } from './catalog';

export interface GameOutcome {
  score: number;
  correct: number;
  answered: number;
  seconds: number;
  /** Per-word results, fed into spaced review. */
  words: Array<{ word: VocabLike; correct: boolean }>;
  listeningCorrect?: number;
  /** XP already awarded during the game (session-based games). */
  earlierXp?: number;
}

export interface GameSummary extends GameOutcome {
  xp: number;
  best: number;
  newBest: boolean;
  streak: StreakUpdate;
}

/** Saves a finished game: spaced review, XP, streak, personal best. Call once. */
export function recordGame(game: GameDef, outcome: GameOutcome): GameSummary {
  const store = useGameStore.getState();
  if (outcome.words.length) store.recordVocab(outcome.words);
  const xp = XP.gameComplete + Math.min(50, XP.gameCorrect * outcome.correct);
  const result = store.completeSession(
    {
      kind: 'game',
      id: game.id,
      title: game.title,
      accuracy: outcome.answered ? outcome.correct / outcome.answered : 1,
      seconds: outcome.seconds,
      xp,
      earlierXp: outcome.earlierXp,
    },
    {
      score: outcome.score,
      speedRoundScore: game.id === 'speed-round' ? outcome.score : undefined,
      listeningCorrect: outcome.listeningCorrect,
    },
  );
  return { ...outcome, xp: xp + (outcome.earlierXp ?? 0), best: result.best, newBest: result.newBest, streak: result.streak };
}

function emmaVerdict(summary: GameSummary) {
  const accuracy = summary.answered ? summary.correct / summary.answered : 1;
  if (summary.newBest && summary.best > 0) return '¡Nuevo récord! Your best score yet.';
  if (accuracy >= 0.9) return '¡Increíble! Your brain is on fire today.';
  if (accuracy >= 0.7) return '¡Muy bien! Quick and accurate.';
  return 'Good practice — the tricky ones will stick next time.';
}

export function GameResults({ game, summary, onReplay }: { game: GameDef; summary: GameSummary; onReplay: () => void }) {
  const [line] = useState(() => emmaVerdict(summary));
  const missed = summary.words
    .filter((w) => !w.correct)
    .filter((w, i, all) => all.findIndex((x) => x.word.id === w.word.id) === i)
    .slice(0, 8);

  useEffect(() => {
    soundService.play(summary.newBest ? 'levelUp' : 'complete');
    const t = window.setTimeout(() => void voiceService.say(line.replace(/¡[^!]*!/, (m) => `*${m}*`)), 700);
    return () => window.clearTimeout(t);
  }, [line, summary.newBest]);

  return (
    <div className="paper flex min-h-dvh flex-col safe-top">
      {summary.newBest && summary.best > 0 && <Confetti intensity={120} />}
      <div className="mx-auto w-full max-w-xl flex-1 px-5 pt-6 pb-4">
        <div className="flex items-end gap-3">
          <EmmaFullBody height={180} celebrating={summary.newBest} className="w-auto shrink-0" />
          <div className="mb-8 animate-pop rounded-3xl rounded-bl-md bg-paper px-4 py-3 shadow-card">
            <p className="text-[17px] leading-snug font-bold">{line}</p>
          </div>
        </div>

        <p className="mt-4 flex items-center gap-2 text-sm font-extrabold tracking-[0.14em] text-ink-soft uppercase">
          <span aria-hidden>{game.emoji}</span> {game.title}
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <p className="font-display text-[56px] leading-none font-semibold tabular-nums">
            <AnimatedNumber value={summary.score} duration={1100} />
          </p>
          <p className="text-ink-soft">points</p>
          {summary.newBest && summary.best > 0 ? (
            <span className="ml-auto animate-pop rounded-full bg-sun px-3 py-1 text-sm font-black">🏆 New best</span>
          ) : (
            <span className="ml-auto text-sm font-bold text-ink-soft">Best: {summary.best}</span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-sun-light px-3 py-3 text-center">
            <p className="text-xs font-extrabold tracking-wide text-honey-dark uppercase">XP</p>
            <p className="mt-1 text-2xl font-black">+{summary.xp}</p>
          </div>
          <div className="rounded-2xl bg-sage-light px-3 py-3 text-center">
            <p className="text-xs font-extrabold tracking-wide text-sage-dark uppercase">Correct</p>
            <p className="mt-1 text-2xl font-black tabular-nums">
              {summary.correct}/{summary.answered}
            </p>
          </div>
          <div className="rounded-2xl bg-sky-light px-3 py-3 text-center">
            <p className="text-xs font-extrabold tracking-wide text-[#3d6a8c] uppercase">Streak</p>
            <p className="mt-1 text-2xl font-black">🔥 {summary.streak.state.current}</p>
          </div>
        </div>

        {missed.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-extrabold text-ink-soft">Words to practise</p>
            <ul className="mt-2 divide-y divide-sand/60 rounded-2xl bg-paper px-4 shadow-card">
              {missed.map(({ word }) => (
                <li key={word.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span lang="es" className="spanish text-[17px]">
                    {word.spanish}
                  </span>
                  <span className="text-right text-sm text-ink-soft">{word.english}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-faint">They&rsquo;ll come back in your next smart review.</p>
          </div>
        )}
      </div>
      <div className="sticky bottom-0 mx-auto w-full max-w-xl space-y-2 bg-cream/95 px-5 pt-3 backdrop-blur safe-bottom">
        <Button size="lg" block onClick={onReplay}>
          Play again
        </Button>
        <ButtonLink href="/review" variant="ghost" size="md" block>
          Back to review
        </ButtonLink>
      </div>
    </div>
  );
}
