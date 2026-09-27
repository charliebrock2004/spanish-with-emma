'use client';

import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import type { ListenState } from './hooks';

/** The big microphone button: tap to speak, tap again to stop. */
export function MicButton({
  state,
  level = 0,
  onStart,
  onStop,
  disabled,
  size = 88,
  label = 'Tap to speak',
}: {
  state: ListenState;
  level?: number;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  size?: number;
  label?: string;
}) {
  const listening = state === 'listening';
  const processing = state === 'processing';
  const scale = listening ? 1 + Math.min(0.18, level * 0.25) : 1;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        {listening && (
          <>
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-terracotta/35" />
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-terracotta/25 [animation-delay:0.5s]" />
          </>
        )}
        <button
          type="button"
          disabled={disabled || processing}
          onClick={listening ? onStop : onStart}
          aria-label={listening ? 'Stop and check' : processing ? 'Checking what you said' : label}
          aria-pressed={listening}
          className={cn(
            'relative grid h-full w-full place-items-center rounded-full text-white transition-[transform,background-color,box-shadow] duration-150',
            'shadow-[0_6px_0_var(--color-terracotta-dark)] active:translate-y-[4px] active:shadow-[0_2px_0_var(--color-terracotta-dark)]',
            listening ? 'bg-brick shadow-[0_6px_0_#5e1f16]' : 'bg-terracotta',
            (disabled || processing) && 'opacity-60',
          )}
          style={{ transform: `scale(${scale})` }}
        >
          {processing ? (
            <Spinner className="h-8 w-8 border-4" label="Checking" />
          ) : listening ? (
            <Icon name="stop" size={size * 0.34} filled strokeWidth={0} />
          ) : (
            <Icon name="mic" size={size * 0.4} strokeWidth={2.2} />
          )}
        </button>
      </div>
      <p className="text-sm font-extrabold text-ink-soft" aria-live="polite">
        {listening ? 'Listening… tap when you’re done' : processing ? 'Checking…' : label}
      </p>
    </div>
  );
}
