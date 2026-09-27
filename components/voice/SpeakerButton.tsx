'use client';

import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useSpeaker } from './hooks';

/**
 * Plays Spanish with Emma's Spanish voice. Optionally auto-plays once, and
 * offers a slow (🐢) version for tricky phrases.
 */
export function SpeakerButton({
  text,
  size = 'md',
  autoPlay = false,
  showSlow = true,
  label = 'Play audio',
  rateFactor = 1,
  className,
}: {
  text: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  autoPlay?: boolean;
  showSlow?: boolean;
  label?: string;
  rateFactor?: number;
  className?: string;
}) {
  const { say, activeKey } = useSpeaker();
  const played = useRef<string | null>(null);
  const normalKey = `normal:${text}`;
  const slowKey = `slow:${text}`;

  useEffect(() => {
    if (!autoPlay || played.current === text) return;
    played.current = text;
    const t = window.setTimeout(() => void say(`*${text}*`, { key: `normal:${text}`, rateFactor }), 250);
    return () => window.clearTimeout(t);
  }, [autoPlay, text, say, rateFactor]);

  const dims = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  }[size];
  const iconSize = { sm: 18, md: 22, lg: 28, xl: 40 }[size];
  const playing = activeKey === normalKey;

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => void say(`*${text}*`, { key: normalKey, rateFactor })}
        aria-label={label}
        className={cn(
          'relative grid shrink-0 place-items-center rounded-full bg-terracotta text-white shadow-[0_4px_0_var(--color-terracotta-dark)] transition-transform active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-terracotta-dark)]',
          dims,
          playing && 'animate-glow',
        )}
      >
        <Icon name="speaker" size={iconSize} strokeWidth={2.4} />
      </button>
      {showSlow && (
        <button
          type="button"
          onClick={() => void say(`*${text}*`, { key: slowKey, rateFactor: 0.65 })}
          aria-label="Play slowly"
          className={cn(
            'grid place-items-center rounded-full border-2 border-sand bg-paper text-ink-soft transition-colors hover:text-terracotta',
            size === 'xl' || size === 'lg' ? 'h-12 w-12' : 'h-10 w-10',
            activeKey === slowKey && 'border-terracotta text-terracotta',
          )}
        >
          <Icon name="turtle" size={size === 'xl' || size === 'lg' ? 24 : 20} />
        </button>
      )}
    </div>
  );
}
