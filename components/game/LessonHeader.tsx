'use client';

import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/primitives';
import { playerLevel, useGameStore } from '@/store/gameStore';
import { voiceService } from '@/services/voice/VoiceService';
import { cn } from '@/lib/utils';

/** Quick switch between Emma's Spanish-only voice and her Scottish-English explanations. */
export function VoiceModeToggle() {
  const voiceMode = useGameStore((s) => s.settings.voiceMode);
  const level = useGameStore(playerLevel);
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

export function LessonHeader({
  progress,
  hearts,
  onClose,
  showHearts = true,
}: {
  progress: number;
  hearts: number;
  onClose: () => void;
  showHearts?: boolean;
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
        <ProgressBar value={progress} max={1} label="Lesson progress" className="flex-1" />
        <VoiceModeToggle />
        {showHearts && <Hearts count={hearts} />}
      </div>
    </header>
  );
}
