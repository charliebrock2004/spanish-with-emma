import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { LevelMap } from '@/components/learn/LevelMap';
import { getLessonSummaries, getLevels } from '@/lib/curriculum';

export const metadata: Metadata = { title: 'Your journey' };

export default function LearnPage() {
  return (
    <AppShell>
      <LevelMap lessons={getLessonSummaries()} levels={getLevels()} />
    </AppShell>
  );
}
