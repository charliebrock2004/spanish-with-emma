'use client';

import { Icon } from '@/components/ui/Icon';
import { voiceService } from '@/services/voice/VoiceService';
import { cn } from '@/lib/utils';
import { useVoiceStatus } from './hooks';

/** A small animated waveform: moves while Emma speaks (or while you're heard), rests when paused. */
export function VoiceWave({ active, bars = 5, className, tone = 'terracotta' }: { active: boolean; bars?: number; className?: string; tone?: 'terracotta' | 'light' }) {
  return (
    <span className={cn('inline-flex h-4 items-center gap-[3px]', className)} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={cn('w-[3px] origin-center rounded-full', tone === 'light' ? 'bg-white' : 'bg-terracotta')}
          style={{
            height: `${[55, 90, 70, 100, 60, 85, 50][i % 7]}%`,
            animation: active ? `talk-bar ${0.7 + (i % 3) * 0.15}s ease-in-out ${i * 0.09}s infinite` : undefined,
            transform: active ? undefined : 'scaleY(0.35)',
          }}
        />
      ))}
    </span>
  );
}

/**
 * Inline controls while Emma is talking: a live waveform, pause/resume and
 * stop. Renders nothing when she's quiet.
 */
export function VoiceControls({ className, showStop = false }: { className?: string; showStop?: boolean }) {
  const { speaking, paused, preparing } = useVoiceStatus();
  if (!speaking) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} role="group" aria-label="Emma's voice">
      <VoiceWave active={!paused && !preparing} />
      <button
        type="button"
        onClick={() => voiceService.togglePause()}
        aria-label={paused ? 'Resume Emma' : 'Pause Emma'}
        className="grid h-8 w-8 place-items-center rounded-full bg-terracotta-light text-terracotta-dark active:scale-95"
      >
        <Icon name={paused ? 'play' : 'pause'} size={16} filled={paused} strokeWidth={paused ? 0 : 2.6} />
      </button>
      {showStop && (
        <button type="button" onClick={() => voiceService.stop()} aria-label="Stop Emma" className="grid h-8 w-8 place-items-center rounded-full text-ink-soft active:scale-95">
          <Icon name="stop" size={14} filled strokeWidth={0} />
        </button>
      )}
    </span>
  );
}
