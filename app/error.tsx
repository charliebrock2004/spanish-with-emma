'use client';

import { useEffect } from 'react';
import { EmmaPortrait } from '@/components/emma/EmmaFigure';
import { Button, ButtonLink } from '@/components/ui/Button';

/** Friendly fallback if a screen crashes. Progress is saved on the device, so nothing is lost. */
export default function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="paper flex min-h-dvh flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
      <EmmaPortrait state="confused" width={160} className="w-[160px]" fade />
      <h1 className="mt-2 font-display text-[30px] leading-tight font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-xs text-ink-soft">Don’t worry — your progress is safe. Let’s try that again.</p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/" size="md" variant="ghost">
          Back home
        </ButtonLink>
      </div>
    </main>
  );
}
