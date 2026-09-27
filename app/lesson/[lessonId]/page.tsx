import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LessonPlayer } from '@/components/game/LessonPlayer';
import { getAllLessonIds, getLesson, getLessonSummaries, getLevels, getVocabulary } from '@/lib/curriculum';

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllLessonIds().map((lessonId) => ({ lessonId }));
}

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }): Promise<Metadata> {
  const { lessonId } = await params;
  return { title: getLesson(lessonId)?.title ?? 'Lesson' };
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();

  // Only the words this lesson touches are sent to the browser.
  const ids = new Set(lesson.exercises.flatMap((e) => e.vocabIds));
  for (const v of lesson.vocabulary) ids.add(v.id);
  const vocab = getVocabulary()
    .filter((v) => ids.has(v.id))
    .map(({ id, spanish, english, category, difficulty }) => ({ id, spanish, english, category, difficulty }));

  return (
    <LessonPlayer
      lesson={{
        id: lesson.id,
        title: lesson.title,
        level: lesson.level,
        exercises: lesson.exercises,
        words: lesson.vocabulary.map(({ spanish, english }) => ({ spanish, english })),
      }}
      vocab={vocab}
      summaries={getLessonSummaries()}
      levels={getLevels()}
    />
  );
}
