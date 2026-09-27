import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { EmmaHub } from '@/components/conversation/EmmaHub';
import { SCENARIOS } from '@/data/conversations/scenarios';
import { getLevels } from '@/lib/curriculum';

export const metadata: Metadata = { title: 'Talk to Emma' };

export default function EmmaPage() {
  // Only the card details go to the browser; each scene's script loads with its own page.
  const scenarios = SCENARIOS.map(({ id, level, emoji, title, description }) => ({ id, level, emoji, title, description }));
  return (
    <AppShell>
      <EmmaHub scenarios={scenarios} levels={getLevels()} />
    </AppShell>
  );
}
