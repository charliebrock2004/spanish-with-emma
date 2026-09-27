import 'server-only';
import { COURSE } from '@/data/curriculum';
import type { Lesson, LessonSummary, LevelMeta, VocabItem } from '@/types/curriculum';
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
