'use client';

import { useEffect, useState } from 'react';
import { EmmaBubble } from '@/components/cosmetics/cosmetics';
import { EmmaFullBody } from '@/components/emma/EmmaFigure';
import { emmaLine } from '@/components/emma/lines';
import { CoinIcon, XpIcon } from '@/components/game-ui/icons';
import { LevelProgressBar } from '@/components/game/LessonComplete';
import { DailyQuestList } from '@/components/quests/QuestParts';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Sparks } from '@/components/game-ui/Sparks';
import { Confetti } from '@/components/ui/Confetti';
import { AnimatedNumber } from '@/components/ui/primitives';
import type { VocabLike } from '@/lib/progress/srs';
import { soundService } from '@/services/sound/SoundService';
import { voiceService } from '@/services/voice/VoiceService';
import { useGameStore } from '@/store/gameStore';
import type { SessionResult } from '@/types/game';
import { cn } from '@/lib/utils';
import type { GameDef } from './catalog';
import { MEDAL_EMOJI, MEDAL_NAME, medalFor, medalRank, nextMedal } from './medals';

export interface GameOutcome {
  score: number;
  correct: number;
  answered: number;
  seconds: number;
  /** Per-word results, fed into spaced review. */
  words: Array<{ word: VocabLike; correct: boolean }>;
  listeningCorrect?: number;
  /** Longest run of right answers. */
  bestCombo?: number;
  /** Earned during the game by answers (games built from lessons). */
  earlier?: { xp: number; coins: number };
}

export interface GameSummary extends GameOutcome {
  result: SessionResult;
  /** The personal best before this game (for "new medal"). */
  previousBest: number;
}

/** The medal this score earned, a "new medal" stamp when it beats your old best medal, and what's next. */
function MedalRow({ game, score, previousBest }: { game: GameDef; score: number; previousBest: number }) {
  const medal = medalFor(game, score);
  const improved = medalRank(medal) > medalRank(medalFor(game, previousBest));
  const next = nextMedal(game, score);
  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 shadow-card">
      <span className={cn('relative grid h-14 w-14 shrink-0 place-items-center rounded-full text-4xl', medal ? 'bg-sun-light' : 'bg-cream-deep opacity-50')} aria-hidden>
        <span className={cn(medal && 'animate-slam [animation-delay:700ms]')}>{medal ? MEDAL_EMOJI[medal] : '🥉'}</span>
        {improved && <Sparks key={medal} count={12} distance={40} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">
          {medal ? `${MEDAL_NAME[medal]} medal` : 'No medal yet'}
          {improved && <span className="ml-2 animate-pop rounded-full bg-terracotta px-2 py-0.5 text-[10px] font-black tracking-wide text-white uppercase [animation-delay:900ms]">New!</span>}
        </p>
        <p className="text-sm text-ink-soft">
          {next ? `${MEDAL_EMOJI[next.medal]} ${MEDAL_NAME[next.medal]} at ${next.score} — ${next.toGo} more points` : 'The top medal. ¡Qué crack!'}
        </p>
      </div>
    </div>
  );
}

/** Saves a finished game: spaced review, rewards, streak, personal best. Call once per play. */
export function recordGame(game: GameDef, outcome: GameOutcome, play: { sessionId: string; xpBefore: number }): GameSummary {
  const store = useGameStore.getState();
  const previousBest = store.gameBests[game.id] ?? 0;
  if (outcome.words.length) store.recordVocab(outcome.words);
  const result = store.completeSession(
    {
      kind: 'game',
      id: game.id,
      sessionId: play.sessionId,
      title: game.title,
      accuracy: outcome.answered ? outcome.correct / outcome.answered : 1,
      seconds: outcome.seconds,
      earlier: outcome.earlier,
      xpBefore: play.xpBefore,
    },
    {
      score: outcome.score,
      correct: outcome.correct,
      answered: outcome.answered,
      // Speed Demon counts right answers, not points.
      speedRoundScore: game.id === 'speed-round' ? outcome.correct : undefined,
      listeningCorrect: outcome.listeningCorrect,
      bestCombo: outcome.bestCombo,
    },
  );
  return { ...outcome, result, previousBest };
}

function emmaVerdict(summary: GameSummary, record: boolean) {
  const accuracy = summary.answered ? summary.correct / summary.answered : 1;
  if (record) return emmaLine('newRecord');
  if (accuracy >= 0.9) return '¡Increíble! Your brain is on fire today.';
  if (accuracy >= 0.7) return '¡Muy bien! Quick and accurate.';
  return 'Good practice — the tricky ones will stick next time.';
}

export function GameResults({ game, summary, onReplay }: { game: GameDef; summary: GameSummary; onReplay: () => void }) {
  const { result } = summary;
  // A record needs something to beat: the very first game just sets the bar.
  const record = result.lines.some((l) => l.label === 'New record');
  const [line] = useState(() => emmaVerdict(summary, record));
  const quests = useGameStore((s) => s.quests);
  const setToastsPaused = useGameStore((s) => s.setToastsPaused);
  const missed = summary.words
    .filter((w) => !w.correct)
    .filter((w, i, all) => all.findIndex((x) => x.word.id === w.word.id) === i)
    .slice(0, 8);

  useEffect(() => {
    soundService.play(record ? 'record' : 'complete');
    const coin = window.setTimeout(() => soundService.play('coin'), 900);
    const t = window.setTimeout(() => void voiceService.say(line.replace(/¡[^!]*!/, (m) => `*${m}*`), { style: record ? 'excited' : 'cheerful' }), 700);
    setToastsPaused(true, 'game-results');
    const resume = window.setTimeout(() => setToastsPaused(false, 'game-results'), 2400);
    return () => {
      window.clearTimeout(coin);
      window.clearTimeout(t);
      window.clearTimeout(resume);
      setToastsPaused(false, 'game-results');
    };
  }, [line, record, setToastsPaused]);

  return (
    <div className="paper flex min-h-dvh flex-col safe-top">
      {record && <Confetti intensity={140} />}
      <div className="mx-auto w-full max-w-xl flex-1 px-5 pt-6 pb-4">
        <div className="flex items-end gap-3">
          <EmmaFullBody height={180} celebrating={record || summary.correct === summary.answered} className="w-auto shrink-0" />
          <EmmaBubble className="mb-8 animate-pop">
            <p className="text-[17px] leading-snug font-bold">{line}</p>
          </EmmaBubble>
        </div>

        <p className="mt-4 flex items-center gap-2 text-sm font-extrabold tracking-[0.14em] text-ink-soft uppercase">
          <span aria-hidden>{game.emoji}</span> {game.title}
        </p>
        <div className="mt-1 flex items-baseline gap-3">
          <p className="font-display text-[56px] leading-none font-semibold tabular-nums">
            <AnimatedNumber value={summary.score} duration={1100} />
          </p>
          <p className="text-ink-soft">points</p>
          {record ? (
            <span className="ml-auto animate-slam rounded-xl border-4 border-terracotta px-2.5 py-0.5 font-display text-lg font-semibold tracking-wide text-terracotta uppercase [animation-delay:600ms] rotate-[6deg]">
              New record
            </span>
          ) : (
            <span className="ml-auto text-sm font-bold text-ink-soft">Best: {result.best}</span>
          )}
        </div>

        <MedalRow game={game} score={summary.score} previousBest={summary.previousBest} />

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-sun-light px-2 py-3 text-center">
            <p className="flex items-center justify-center gap-1 text-xs font-extrabold tracking-wide text-honey-dark uppercase">
              <XpIcon size={14} /> XP
            </p>
            <p className="mt-1 text-2xl font-black">
              +<AnimatedNumber value={result.total.xp} duration={1300} />
            </p>
          </div>
          <div className="rounded-2xl bg-[#fff4d6] px-2 py-3 text-center">
            <p className="flex items-center justify-center gap-1 text-xs font-extrabold tracking-wide text-[#8f5d0f] uppercase">
              <CoinIcon size={14} /> Coins
            </p>
            <p className="mt-1 text-2xl font-black">
              +<AnimatedNumber value={result.total.coins} duration={1300} />
            </p>
          </div>
          <div className="rounded-2xl bg-sage-light px-2 py-3 text-center">
            <p className="text-xs font-extrabold tracking-wide text-sage-dark uppercase">Correct</p>
            <p className="mt-1 text-2xl font-black tabular-nums">
              {summary.correct}/{summary.answered}
            </p>
          </div>
        </div>

        <ul className="mt-3 divide-y divide-sand/60 rounded-2xl bg-paper px-4 shadow-card" aria-label="Rewards">
          {result.lines.map((row, i) => (
            <li key={row.label} className="flex animate-enter items-center justify-between gap-3 py-2.5" style={{ animationDelay: `${250 + i * 130}ms` }}>
              <span className={cn('font-bold', row.label === 'New record' ? 'text-terracotta' : 'text-ink-soft')}>{row.label === 'New record' ? '🏆 New record' : row.label}</span>
              <span className="flex items-center gap-2 font-black">
                {row.xp > 0 && <span className="text-honey-dark">+{row.xp} XP</span>}
                {row.coins > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[#8f5d0f]">
                    +{row.coins} <CoinIcon size={15} />
                  </span>
                )}
              </span>
            </li>
          ))}
          {summary.bestCombo !== undefined && summary.bestCombo >= 3 && (
            <li className="py-2.5 text-sm text-ink-soft">🔥 Best combo: {summary.bestCombo} in a row</li>
          )}
        </ul>

        <LevelProgressBar from={result.xpBefore} to={result.xpAfter} className="mt-3" />

        {quests && (
          <section className="mt-4 rounded-2xl bg-paper px-4 py-3 shadow-card" aria-label="Today's quests">
            <p className="text-xs font-extrabold tracking-[0.14em] text-ink-soft uppercase">Today&rsquo;s quests</p>
            <DailyQuestList daily={quests} compact />
          </section>
        )}

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
          Back to games
        </ButtonLink>
      </div>
    </div>
  );
}
