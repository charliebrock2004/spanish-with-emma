import type { Metadata } from 'next';
import { Onboarding, type FirstLesson } from '@/components/onboarding/Onboarding';
import { getLessonSummaries } from '@/lib/curriculum';
import type { LevelId } from '@/types/curriculum';

export const metadata: Metadata = { title: 'Welcome' };

export default function WelcomePage() {
  const firstLessons = {} as Record<LevelId, FirstLesson | undefined>;
  for (const lesson of getLessonSummaries()) {
    if (lesson.order === 1) firstLessons[lesson.level] = { id: lesson.id, title: lesson.title, emoji: lesson.emoji };
  }
  return <Onboarding firstLessons={firstLessons} />;
}
