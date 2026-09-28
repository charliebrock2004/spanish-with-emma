'use client';

import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/primitives';
import { FlameIcon } from '@/components/game-ui/icons';
import { comboMultiplier, nextComboStep } from '@/lib/game/economy';
import { curriculumLevel, useGameStore } from '@/store/gameStore';
import { voiceService } from '@/services/voice/VoiceService';
import { cn } from '@/lib/utils';

/** Quick switch between Emma's Spanish-only voice and her Scottish-English explanations. */
export function VoiceModeToggle() {
  const voiceMode = useGameStore((s) => s.settings.voiceMode);
  const level = useGameStore(curriculumLevel);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const effective = voiceMode === 'auto' ? (level <= 3 ? 'scottish' : 'spanish') : voiceMode;
  const next = effective === 'spanish' ? 'scottish' : 'spanish';
  return (
    <button
      type="button"
      onClick={() => {
        voiceService.stop();
        updateSettings({ voiceMode: next });
      }}
      aria-label={
        effective === 'spanish'
          ? 'Emma speaks Spanish only. Switch to Scottish English explanations'
          : 'Emma explains in Scottish English. Switch to Spanish only'
      }
      title={effective === 'spanish' ? 'Spanish only' : 'Scottish English explanations'}
      className="grid h-10 min-w-10 place-items-center rounded-full border-2 border-sand bg-paper px-2 text-lg leading-none"
    >
      <span aria-hidden>{effective === 'spanish' ? '🇪🇸' : '🏴󠁧󠁢󠁳󠁣󠁴󠁿'}</span>
    </button>
  );
}

export function Hearts({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <div
      className={cn('flex items-center gap-1 font-black tabular-nums', count <= 1 ? 'text-terracotta' : 'text-brick')}
      role="img"
      aria-label={`${count} of ${max} hearts left`}
    >
      <span key={count} className="animate-pop text-xl leading-none" aria-hidden>
        {count > 0 ? '❤️' : '💔'}
      </span>
      <span>{count}</span>
    </div>
  );
}

/** The combo meter: appears from 2 in a row, and shows the multiplier from 3. */
export function ComboMeter({ combo }: { combo: number }) {
  if (combo < 2) return null;
  const multiplier = comboMultiplier(combo);
  const next = nextComboStep(combo);
  return (
    <span
      key={multiplier}
      className={cn(
        'inline-flex h-9 shrink-0 animate-pop items-center gap-0.5 rounded-full px-2 text-sm font-black tabular-nums shadow-card',
        multiplier >= 5 ? 'bg-terracotta text-white' : multiplier > 1 ? 'bg-sun text-ink' : 'bg-paper text-ink-soft',
      )}
      role="status"
      aria-label={multiplier > 1 ? `${combo} in a row: ${multiplier} times XP` : `${combo} in a row — ${next! - combo} more for double XP`}
    >
      <FlameIcon size={18} className={cn(multiplier > 1 && 'animate-flicker')} />
      {multiplier > 1 ? `×${multiplier}` : combo}
    </span>
  );
}

export function LessonHeader({
  progress,
  hearts,
  onClose,
  showHearts = true,
  combo = 0,
  glint,
}: {
  progress: number;
  hearts: number;
  onClose: () => void;
  showHearts?: boolean;
  combo?: number;
  /** Changes on every right answer, sweeping a highlight along the bar. */
  glint?: number;
}) {
  return (
    <header className="sticky top-0 z-20 bg-cream/95 backdrop-blur safe-top">
      <div className="mx-auto flex max-w-xl items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Leave lesson"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-cream-deep"
        >
          <Icon name="x" size={24} />
        </button>
        <ProgressBar value={progress} max={1} label="Lesson progress" className="flex-1" tone={comboMultiplier(combo) > 1 ? 'sun' : 'warm'} glint={glint || undefined} />
        <ComboMeter combo={combo} />
        <VoiceModeToggle />
        {showHearts && <Hearts count={hearts} />}
      </div>
    </header>
  );
}
