import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { QuestsScreen } from '@/components/quests/QuestsScreen';

export const metadata: Metadata = { title: 'Quests' };

export default function QuestsPage() {
  return (
    <AppShell>
      <QuestsScreen />
    </AppShell>
  );
}
