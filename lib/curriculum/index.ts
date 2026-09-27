import 'server-only';
import { COURSE } from '@/data/curriculum';
import type { WordLite } from '@/lib/review/build';
import type { Exercise, Lesson, LessonSummary, LevelMeta, TaggedExercise, VocabItem } from '@/types/curriculum';
import { buildCurriculum, type BuiltCurriculum } from './build';

/**
 * Server-side access to the curriculum. Lesson data never ships in the client
 * bundle — pages pass just what they need to client components as props.
 */
let cache: BuiltCurriculum | null = null;

function curriculum(): BuiltCurriculum {
  cache ??= buildCurriculum(COURSE);
  return cache;
}

export function getLevels(): LevelMeta[] {
  return curriculum().levels;
}

export function getLessonSummaries(): LessonSummary[] {
  return curriculum().summaries;
}

export function getLesson(id: string): Lesson | undefined {
  return curriculum().lessons.find((l) => l.id === id);
}

export function getAllLessonIds(): string[] {
  return curriculum().lessons.map((l) => l.id);
}

export function getVocabulary(): VocabItem[] {
  return curriculum().vocabulary;
}

/** Every word, trimmed to what reviews and games need. */
export function getWordList(): WordLite[] {
  return curriculum().vocabulary.map(({ id, spanish, english, category, difficulty, level }) => ({ id, spanish, english, category, difficulty, level }));
}

/** All exercises of one kind, tagged with their lesson (games only use lessons the player has done). */
export function getExercisesOfType<T extends Exercise['type']>(type: T): Array<TaggedExercise<T>> {
  return curriculum().lessons.flatMap((lesson) =>
    lesson.exercises
      .filter((e): e is Extract<Exercise, { type: T }> => e.type === type && !e.isReview)
      .map((e) => ({ ...e, lessonId: lesson.id })),
  );
}

/** How many exercises of a kind each lesson has. */
export function countExercisesByLesson(type: Exercise['type']): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const lesson of curriculum().lessons) {
    const n = lesson.exercises.filter((e) => e.type === type).length;
    if (n) counts[lesson.id] = n;
  }
  return counts;
}
