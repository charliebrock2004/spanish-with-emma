'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { EmmaPortrait } from '@/components/emma/EmmaFigure';
import { ExerciseSession, type SessionResult } from '@/components/game/ExerciseSession';
import { LessonComplete, type CompletionSummary } from '@/components/game/LessonComplete';
import { SessionSkeleton } from '@/components/layout/SessionSkeleton';
import { useReadyPlayer } from '@/components/layout/useReadyPlayer';
import { ButtonLink } from '@/components/ui/Button';
import { useVoiceCapabilities } from '@/components/voice/hooks';
import { useNow } from '@/lib/hooks/useNow';
import { XP } from '@/lib/progress/xp';
import { distractorPool, mistakeSession, resolvedMistakeIds, smartReviewSession, type WordLite } from '@/lib/review/build';
import { playerLevel, useGameStore } from '@/store/gameStore';
import type { Exercise } from '@/types/curriculum';
import type { VocabLike } from '@/lib/progress/srs';

export type ReviewMode = 'smart' | 'mistakes';

const TITLES: Record<ReviewMode, string> = { smart: 'Smart review', mistakes: 'Fix my mistakes' };

export function ReviewSession({ mode, curriculum }: { mode: ReviewMode; curriculum: WordLite[] }) {
  const ready = useReadyPlayer();
  const caps = useVoiceCapabilities();
  const now = useNow();
  const pausedUntil = useGameStore((s) => s.settings.speakingPausedUntil);
  // The plan is fixed when the session starts, so wait until we know the time and the mic.
  if (!ready || !caps.ready || !now) return <SessionSkeleton label="Loading review" />;
  const speaking = caps.canListen && !(pausedUntil && pausedUntil > now);
  return <ReviewRun mode={mode} curriculum={curriculum} now={now} speaking={speaking} />;
}

interface Plan {
  exercises: Exercise[];
  pool: VocabLike[];
  mistakeIds: Record<string, string[]>;
  due: boolean;
}

function makePlan(mode: ReviewMode, curriculum: WordLite[], now: number, speaking: boolean): Plan {
  const state = useGameStore.getState();
  const level = playerLevel(state);
  const pool = distractorPool(state.vocab, curriculum, level);
  const seed = String(now);
  if (mode === 'smart') {
    const { exercises, due } = smartReviewSession(state.vocab, curriculum, level, { now, speaking, seed });
    return { exercises, pool, mistakeIds: {}, due };
  }
  const { exercises, mistakeIds } = mistakeSession(state.mistakes, [...pool, ...curriculum], { seed });
  return { exercises, pool: [...pool, ...curriculum], mistakeIds, due: true };
}

function EmptyState({ mode }: { mode: ReviewMode }) {
  const smart = mode === 'smart';
  return (
    <div className="paper flex min-h-dvh flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
      <EmmaPortrait state={smart ? 'thinking' : 'celebrating'} width={150} className="w-[150px]" fade />
      <h1 className="mt-2 font-display text-[28px] leading-tight font-semibold">
        {smart ? 'Nothing to review yet' : 'No mistakes to fix 🎉'}
      </h1>
      <p className="mt-2 max-w-xs text-ink-soft">
        {smart
          ? 'Finish a lesson and I’ll bring its words back at just the right moments.'
          : 'Every mistake you make gets saved here so we can fix it together. Right now the list is clean.'}
      </p>
      <div className="mt-6 w-full max-w-xs space-y-3">
        <ButtonLink href={smart ? '/learn' : '/review'} size="lg" block>
          {smart ? 'Start a lesson' : 'Back to review'}
        </ButtonLink>
      </div>
    </div>
  );
}

function ReviewRun({ mode, curriculum, now, speaking }: { mode: ReviewMode; curriculum: WordLite[]; now: number; speaking: boolean }) {
  const router = useRouter();
  const level = useGameStore(playerLevel);
  const completeSession = useGameStore((s) => s.completeSession);
  const [plan] = useState(() => makePlan(mode, curriculum, now, speaking));
  const [summary, setSummary] = useState<CompletionSummary | null>(null);

  const onFinish = useCallback(
    (result: SessionResult) => {
      const resolved = resolvedMistakeIds(plan.mistakeIds, result.correctExerciseIds);
      const outcome = completeSession(
        {
          kind: 'review',
          id: mode,
          title: TITLES[mode],
          accuracy: result.accuracy,
          seconds: result.seconds,
          xp: XP.reviewComplete,
          earlierXp: result.answersXp,
        },
        { resolvedMistakes: resolved },
      );
      const ids = new Set(plan.exercises.flatMap((e) => e.vocabIds));
      const words = plan.pool.filter((w, i, all) => ids.has(w.id) && all.findIndex((x) => x.id === w.id) === i);
      setSummary({
        title: TITLES[mode],
        heading: mode === 'mistakes' ? (resolved.length ? `${resolved.length} mistake${resolved.length === 1 ? '' : 's'} fixed!` : 'Review complete!') : 'Review complete!',
        xp: result.answersXp + XP.reviewComplete,
        accuracy: result.accuracy,
        seconds: result.seconds,
        perfect: result.perfect,
        streak: outcome.streak,
        words: words.map(({ spanish, english }) => ({ spanish, english })),
        breakdown: [
          { label: 'Answers', xp: result.answersXp },
          { label: 'Review complete', xp: XP.reviewComplete },
        ],
      });
    },
    [plan, mode, completeSession],
  );

  if (plan.exercises.length === 0) return <EmptyState mode={mode} />;

  if (summary) {
    return (
      <LessonComplete
        summary={summary}
        emmaSays={
          mode === 'mistakes'
            ? '¡Mucho mejor! Mistakes are just the bits we haven’t practised yet.'
            : summary.perfect
              ? '¡Perfecto! Those words are really sticking.'
              : 'Nice review. The tricky ones will come back a bit sooner.'
        }
        primaryLabel="Back to review"
        onPrimary={() => router.push('/review')}
        secondaryLabel="Home"
        onSecondary={() => router.push('/')}
      />
    );
  }

  return (
    <ExerciseSession
      sessionKey={`review-${mode}-${now}`}
      exercises={plan.exercises}
      vocab={plan.pool}
      level={level}
      onFinish={onFinish}
      onExit={() => router.push('/review')}
    />
  );
}
