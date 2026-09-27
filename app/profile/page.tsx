import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { ProfileScreen } from '@/components/profile/ProfileScreen';
import { getLessonSummaries, getLevels } from '@/lib/curriculum';

export const metadata: Metadata = { title: 'Profile' };

export default function ProfilePage() {
  return (
    <AppShell>
      <ProfileScreen lessons={getLessonSummaries()} levels={getLevels()} />
    </AppShell>
  );
}
