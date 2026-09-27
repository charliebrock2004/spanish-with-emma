'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { SessionSkeleton } from '@/components/layout/SessionSkeleton';
import { useReadyPlayer } from '@/components/layout/useReadyPlayer';
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
  const ready = useReadyPlayer();
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<{ summary: CompletionSummary; next: LessonSummary | null } | null>(null);
  const [levelUp, setLevelUp] = useState<{ completed: LevelMeta; next: LevelMeta | null } | null>(null);

  const onFinish = useCallback(
    (session: SessionResult) => {
      const store = useGameStore.getState();
      const levelIds = summaries.filter((s) => s.level === lesson.level).map((s) => s.id);
      const levelDone = levelIds.every((id) => id === lesson.id || store.completedLessons[id]);
      const newLevel = levelDone && !store.completedLevels.includes(lesson.level);
      const outcome = store.completeLesson({
        lessonId: lesson.id,
        sessionId: session.sessionId,
        title: lesson.title,
        level: lesson.level,
        accuracy: session.accuracy,
        perfect: session.perfect,
        seconds: session.seconds,
        answers: session.answers,
        levelCompleted: levelDone ? lesson.level : null,
        xpBefore: session.xpBefore,
      });
      const after = useGameStore.getState();
      const journey = computeJourney(summaries, after.completedLessons, after.profile.placementLevel);
      setResult({
        next: journey.current,
        summary: {
          title: lesson.title,
          lines: outcome.lines,
          total: outcome.total,
          accuracy: session.accuracy,
          seconds: session.seconds,
          perfect: session.perfect,
          stars: outcome.stars,
          firstPerfect: outcome.firstPerfect,
          streak: outcome.streak,
          words: lesson.words,
          xpBefore: outcome.xpBefore,
          xpAfter: outcome.xpAfter,
          chestId: outcome.chestId,
          bestCombo: session.bestCombo,
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

  if (!ready) return <SessionSkeleton label="Loading lesson" />;

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
