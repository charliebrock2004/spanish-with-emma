'use client';

import { useEffect, useState } from 'react';
import { EmmaFullBody } from '@/components/emma/EmmaFigure';
import { emmaLine } from '@/components/emma/lines';
import { Button } from '@/components/ui/Button';
import { Confetti } from '@/components/ui/Confetti';
import { AnimatedNumber } from '@/components/ui/primitives';
import { soundService } from '@/services/sound/SoundService';
import { voiceService } from '@/services/voice/VoiceService';
import type { StreakUpdate } from '@/lib/progress/streak';
import type { LevelMeta } from '@/types/curriculum';
import { cn } from '@/lib/utils';

export interface CompletionSummary {
  title: string;
  heading?: string;
  xp: number;
  breakdown: Array<{ label: string; xp: number }>;
  accuracy: number;
  seconds: number;
  perfect: boolean;
  streak?: StreakUpdate;
  words: Array<{ spanish: string; english: string }>;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

function streakText(update: StreakUpdate) {
  const n = update.state.current;
  switch (update.event) {
    case 'started':
      return 'Your streak starts today!';
    case 'restarted':
      return 'A fresh streak — day one. Welcome back!';
    case 'saved':
      return 'Saved by a streak freeze — phew!';
    case 'extended':
      return n >= 7 ? 'Incredible consistency.' : 'Come back tomorrow to keep it going.';
    default:
      return "You've already practised today.";
  }
}

/** Big, tasteful level-up moment. */
export function LevelUpCelebration({
  completed,
  next,
  onContinue,
}: {
  completed: LevelMeta;
  next: LevelMeta | null;
  onContinue: () => void;
}) {
  useEffect(() => {
    soundService.play('levelUp');
    const line = next
      ? `*¡Enhorabuena!* You've finished Level ${completed.id}. Welcome to ${next.title}!`
      : "*¡Enhorabuena!* You've finished the whole journey. I'm so proud of you.";
    const t = window.setTimeout(() => void voiceService.say(line), 600);
    return () => window.clearTimeout(t);
  }, [completed, next]);

  return (
    <div className="fixed inset-0 z-40 flex animate-fade flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-terracotta to-brick px-6 pt-12 pb-8 text-center text-white safe-top safe-bottom">
      <Confetti intensity={170} origin={0.3} />
      <div className="animate-pop">
        <p className="text-sm font-extrabold tracking-[0.22em] text-white/80 uppercase">Level {completed.id} complete</p>
        <p className="mt-3 text-6xl" aria-hidden>
          {completed.emoji}
          {next && <span className="mx-3 text-4xl text-white/70">→</span>}
          {next?.emoji}
        </p>
        <h1 className="mt-4 font-display text-[40px] leading-[1.05] font-semibold">¡Enhorabuena!</h1>
        <p className="mx-auto mt-3 max-w-xs text-lg text-white/90">
          {next ? (
            <>
              You&rsquo;ve unlocked <strong>Level {next.id}: {next.title}</strong>.
            </>
          ) : (
            <>You&rsquo;ve completed the whole journey — from ¡hola! to Fluent Foundations.</>
          )}
        </p>
        <p className="mt-4 inline-flex rounded-full bg-sun px-4 py-1.5 font-black text-ink">+100 XP level bonus</p>
      </div>
      <EmmaFullBody height={260} celebrating className="relative my-4 max-h-[36dvh] w-auto drop-shadow-xl" />
      <Button variant="secondary" size="lg" block className="max-w-sm" onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}

export function LessonComplete({
  summary,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  summary: CompletionSummary;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const [line] = useState(() => (summary.perfect ? emmaLine('perfectLesson') : emmaLine('lessonDone')));

  useEffect(() => {
    soundService.play('complete');
    const t = window.setTimeout(() => soundService.play('xp'), 700);
    const s = window.setTimeout(() => void voiceService.say(line.replace(/¡[^!]*!/, (m) => `*${m}*`)), 900);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(s);
    };
  }, [line]);

  const accuracy = Math.round(summary.accuracy * 100);

  return (
    <div className="paper flex min-h-dvh flex-col safe-top">
      <Confetti intensity={summary.perfect ? 140 : 90} />
      <div className="mx-auto w-full max-w-xl flex-1 px-5 pt-6 pb-4">
        <div className="flex items-end gap-3">
          <EmmaFullBody height={200} celebrating priority className="w-auto shrink-0" />
          <div className="mb-10 animate-pop rounded-3xl rounded-bl-md bg-paper px-4 py-3 shadow-card">
            <p className="text-[17px] leading-snug font-bold">{line}</p>
          </div>
        </div>

        <h1 className="mt-4 font-display text-[34px] leading-tight font-semibold">
          {summary.heading ?? (summary.perfect ? 'Perfect lesson! ⭐' : 'Lesson complete!')}
        </h1>
        <p className="text-ink-soft">{summary.title}</p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-sun-light px-3 py-3 text-center">
            <p className="text-xs font-extrabold tracking-wide text-honey-dark uppercase">XP</p>
            <p className="mt-1 text-2xl font-black">
              +<AnimatedNumber value={summary.xp} duration={1400} />
            </p>
          </div>
          <div className="rounded-2xl bg-sage-light px-3 py-3 text-center">
            <p className="text-xs font-extrabold tracking-wide text-sage-dark uppercase">Accuracy</p>
            <p className="mt-1 text-2xl font-black">{accuracy}%</p>
          </div>
          <div className="rounded-2xl bg-sky-light px-3 py-3 text-center">
            <p className="text-xs font-extrabold tracking-wide text-[#3d6a8c] uppercase">Time</p>
            <p className="mt-1 text-2xl font-black">{formatTime(summary.seconds)}</p>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-sand/60 rounded-2xl bg-paper px-4 shadow-card">
          {summary.breakdown
            .filter((row) => row.xp > 0)
            .map((row, i) => (
              <li key={row.label} className="flex animate-enter items-center justify-between py-3" style={{ animationDelay: `${200 + i * 120}ms` }}>
                <span className="font-bold text-ink-soft">{row.label}</span>
                <span className="font-black text-honey-dark">+{row.xp} XP</span>
              </li>
            ))}
        </ul>

        {summary.streak && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-terracotta-light/70 px-4 py-3">
            <span className={cn('text-3xl', summary.streak.event === 'extended' && 'animate-bounce-soft')} aria-hidden>
              🔥
            </span>
            <div>
              <p className="font-extrabold">
                {summary.streak.state.current} day streak{summary.streak.state.current === 1 ? '' : ''}
              </p>
              <p className="text-sm text-ink-soft">{streakText(summary.streak)}</p>
            </div>
          </div>
        )}

        {summary.words.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-extrabold text-ink-soft">Words you practised</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.words.slice(0, 12).map((w) => (
                <span key={w.spanish} className="rounded-full bg-paper px-3 py-1.5 text-sm shadow-card" title={w.english}>
                  <span lang="es" className="font-bold text-brick">
                    {w.spanish}
                  </span>{' '}
                  <span className="text-ink-faint">· {w.english}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="sticky bottom-0 mx-auto w-full max-w-xl space-y-2 bg-cream/95 px-5 pt-3 backdrop-blur safe-bottom">
        <Button size="lg" block onClick={onPrimary}>
          {primaryLabel}
        </Button>
        {secondaryLabel && onSecondary && (
          <Button variant="ghost" size="md" block onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
