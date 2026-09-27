import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { ReviewHub } from '@/components/review/ReviewHub';
import { countExercisesByLesson } from '@/lib/curriculum';

export const metadata: Metadata = { title: 'Review' };

export default function ReviewPage() {
  return (
    <AppShell>
      <ReviewHub sentenceLessons={countExercisesByLesson('order')} conversationLessons={countExercisesByLesson('conversation')} />
    </AppShell>
  );
}
