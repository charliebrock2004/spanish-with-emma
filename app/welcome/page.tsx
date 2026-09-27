import type { Metadata } from 'next';
import { Onboarding } from '@/components/onboarding/Onboarding';
import { getLessonSummaries } from '@/lib/curriculum';
import type { LevelId } from '@/types/curriculum';

export const metadata: Metadata = { title: 'Welcome' };

export default function WelcomePage() {
  const firstLessons = {} as Record<LevelId, string | undefined>;
  for (const lesson of getLessonSummaries()) {
    if (lesson.order === 1) firstLessons[lesson.level] = lesson.id;
  }
  return <Onboarding firstLessons={firstLessons} />;
}
