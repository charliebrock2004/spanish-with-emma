import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { SettingsScreen } from '@/components/settings/SettingsScreen';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsScreen />
    </AppShell>
  );
}
