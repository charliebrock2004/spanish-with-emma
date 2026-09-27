'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { computeJourney } from '@/lib/progress/journey';
import type { VocabLike } from '@/lib/progress/srs';
import { useGameStore } from '@/store/gameStore';
import type { Exercise, LessonSummary, LevelId, LevelMeta } from '@/types/curriculum';
import { ExerciseSession, type SessionResult } from './ExerciseSession';
import { LessonComplete, LevelUpCelebration, type CompletionSummary } from './LessonComplete';

export interface LessonPayload {
  id: string;
  title: string;
  level: LevelId;
  exercises: Exercise[];
  words: Array<{ spanish: string; english: string }>;
}

function SessionSkeleton() {
  return (
    <div className="paper flex h-dvh flex-col px-4 pt-4" aria-busy="true" aria-label="Loading lesson">
      <div className="skeleton mx-auto h-4 w-full max-w-xl rounded-full" />
      <div className="skeleton mx-auto mt-8 h-20 w-full max-w-xl rounded-2xl" />
      <div className="skeleton mx-auto mt-6 h-64 w-full max-w-xl rounded-[var(--radius-card)]" />
    </div>
  );
}

export function LessonPlayer({
  lesson,
  vocab,
  summaries,
  levels,
}: {
  lesson: LessonPayload;
  vocab: VocabLike[];
  summaries: LessonSummary[];
  levels: LevelMeta[];
}) {
  const router = useRouter();
  const hydrated = useGameStore((s) => s.hydrated);
  const onboarded = useGameStore((s) => s.profile.onboarded);
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<{ summary: CompletionSummary; next: LessonSummary | null } | null>(null);
  const [levelUp, setLevelUp] = useState<{ completed: LevelMeta; next: LevelMeta | null } | null>(null);

  useEffect(() => {
    if (hydrated && !onboarded) router.replace('/welcome');
  }, [hydrated, onboarded, router]);

  const onFinish = useCallback(
    (session: SessionResult) => {
      const store = useGameStore.getState();
      const levelIds = summaries.filter((s) => s.level === lesson.level).map((s) => s.id);
      const levelDone = levelIds.every((id) => id === lesson.id || store.completedLessons[id]);
      const newLevel = levelDone && !store.completedLevels.includes(lesson.level);
      const outcome = store.completeLesson({
        lessonId: lesson.id,
        title: lesson.title,
        level: lesson.level,
        accuracy: session.accuracy,
        perfect: session.perfect,
        seconds: session.seconds,
        answersXp: session.answersXp,
        levelCompleted: levelDone ? lesson.level : null,
      });
      const after = useGameStore.getState();
      const journey = computeJourney(summaries, after.completedLessons, after.profile.placementLevel);
      setResult({
        next: journey.current,
        summary: {
          title: lesson.title,
          xp: outcome.totalXp,
          accuracy: session.accuracy,
          seconds: session.seconds,
          perfect: session.perfect,
          streak: outcome.streak,
          words: lesson.words,
          breakdown: [
            { label: 'Answers', xp: session.answersXp },
            { label: 'Lesson complete', xp: outcome.bonus.completion },
            { label: 'Perfect lesson', xp: outcome.bonus.perfect },
            { label: `Level ${lesson.level} milestone`, xp: outcome.bonus.milestone },
          ],
        },
      });
      if (newLevel) {
        const completed = levels.find((l) => l.id === lesson.level)!;
        const next = levels.find((l) => l.id === lesson.level + 1) ?? null;
        setLevelUp({ completed, next });
      }
    },
    [lesson, summaries, levels],
  );

  if (!hydrated || !onboarded) return <SessionSkeleton />;

  if (result) {
    return (
      <>
        <LessonComplete
          summary={result.summary}
          primaryLabel={result.next ? 'Next lesson' : 'Back to the map'}
          onPrimary={() => router.push(result.next ? `/lesson/${result.next.id}` : '/learn')}
          secondaryLabel={result.next ? 'Back to the map' : undefined}
          onSecondary={() => router.push('/learn')}
        />
        {levelUp && <LevelUpCelebration completed={levelUp.completed} next={levelUp.next} onContinue={() => setLevelUp(null)} />}
      </>
    );
  }

  return (
    <ExerciseSession
      key={run}
      sessionKey={`${lesson.id}:${run}`}
      exercises={lesson.exercises}
      vocab={vocab}
      level={lesson.level}
      lessonId={lesson.id}
      useHearts
      injectReview
      onFinish={onFinish}
      onExit={() => router.push('/learn')}
      onRestart={() => setRun((r) => r + 1)}
    />
  );
}
