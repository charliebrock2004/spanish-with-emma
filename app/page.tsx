import { AppShell } from '@/components/layout/AppShell';
import { HomeScreen } from '@/components/home/HomeScreen';
import { getLessonSummaries, getLevels } from '@/lib/curriculum';

export default function HomePage() {
  return (
    <AppShell>
      <HomeScreen lessons={getLessonSummaries()} levels={getLevels()} />
    </AppShell>
  );
}
