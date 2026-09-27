import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { EmmaHub } from '@/components/conversation/EmmaHub';
import { SCENARIOS } from '@/data/conversations/scenarios';
import { SPECIAL_SCENES } from '@/data/conversations/specials';
import { getLevels } from '@/lib/curriculum';

export const metadata: Metadata = { title: 'Talk to Emma' };

export default function EmmaPage() {
  // Only the card details go to the browser; each scene's script loads with its own page.
  const card = ({ id, level, emoji, title, description }: (typeof SCENARIOS)[number]) => ({ id, level, emoji, title, description });
  return (
    <AppShell>
      <EmmaHub scenarios={SCENARIOS.map(card)} specials={SPECIAL_SCENES.map(card)} levels={getLevels()} />
    </AppShell>
  );
}
