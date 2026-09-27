import type { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { ShopScreen } from '@/components/shop/ShopScreen';

export const metadata: Metadata = { title: 'Shop' };

export default function ShopPage() {
  return (
    <AppShell>
      <ShopScreen />
    </AppShell>
  );
}
