import type { Metadata } from 'next';
import { EmmaPortrait } from '@/components/emma/EmmaFigure';
import { ButtonLink } from '@/components/ui/Button';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="paper flex min-h-dvh flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
      <EmmaPortrait state="confused" width={160} className="w-[160px]" fade priority />
      <h1 className="mt-2 font-display text-[30px] leading-tight font-semibold">¡Uy! Me he perdido.</h1>
      <p className="mt-2 max-w-xs text-ink-soft">Oops — I can’t find that page. Let’s get you back to your Spanish.</p>
      <ButtonLink href="/" size="lg" className="mt-6">
        Back home
      </ButtonLink>
    </main>
  );
}
