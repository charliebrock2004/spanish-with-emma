import type { LessonSummary, LevelId } from '@/types/curriculum';
import type { LessonRecord } from '@/types/progress';

export type LessonStatus = 'completed' | 'current' | 'available' | 'locked';

export interface JourneyLesson extends LessonSummary {
  status: LessonStatus;
}

export interface LevelProgress {
  level: LevelId;
  done: number;
  total: number;
  unlocked: boolean;
  complete: boolean;
}

export interface Journey {
  lessons: JourneyLesson[];
  current: JourneyLesson | null;
  currentLevel: LevelId;
  levels: LevelProgress[];
  /** Every lesson in the curriculum is complete. */
  finished: boolean;
}

export const LEVEL_IDS: LevelId[] = [1, 2, 3, 4, 5, 6];

/**
 * Works out what's unlocked. A level opens when the previous level is finished
 * (or when onboarding placed the player there). Lessons within a level open one
 * after another; levels below the placement level are fully open for revision.
 */
export function computeJourney(
  summaries: LessonSummary[],
  completed: Record<string, LessonRecord>,
  placementLevel: LevelId,
): Journey {
  const byLevel = new Map<LevelId, LessonSummary[]>();
  for (const lesson of summaries) {
    const list = byLevel.get(lesson.level) ?? [];
    list.push(lesson);
    byLevel.set(lesson.level, list);
  }

  const levels: LevelProgress[] = [];
  const levelUnlocked = new Map<LevelId, boolean>();
  for (const level of LEVEL_IDS) {
    const list = byLevel.get(level) ?? [];
    const done = list.filter((l) => completed[l.id]).length;
    const complete = list.length > 0 && done === list.length;
    const prev = levels[levels.length - 1];
    const unlocked = level <= placementLevel || level === 1 || Boolean(prev?.complete);
    levelUnlocked.set(level, unlocked);
    levels.push({ level, done, total: list.length, unlocked, complete });
  }

  const lessons: JourneyLesson[] = [];
  for (const level of LEVEL_IDS) {
    const list = byLevel.get(level) ?? [];
    const unlocked = levelUnlocked.get(level) ?? false;
    const revision = level < placementLevel;
    list.forEach((lesson, i) => {
      let status: LessonStatus;
      if (completed[lesson.id]) status = 'completed';
      else if (!unlocked) status = 'locked';
      else if (revision || i === 0 || completed[list[i - 1].id]) status = 'available';
      else status = 'locked';
      lessons.push({ ...lesson, status });
    });
  }

  // The "current" lesson: next open lesson from the placement level onwards,
  // falling back to anything left open below it.
  const open = lessons.filter((l) => l.status === 'available');
  const current = open.find((l) => l.level >= placementLevel) ?? open[0] ?? null;
  if (current) current.status = 'current';

  const highestUnlocked = [...levels].reverse().find((l) => l.unlocked)?.level ?? 1;
  return {
    lessons,
    current,
    currentLevel: current?.level ?? highestUnlocked,
    levels,
    finished: lessons.length > 0 && lessons.every((l) => l.status === 'completed'),
  };
}
