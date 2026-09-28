'use client';

import { useEffect, useRef } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import type { EmmaState } from '@/components/emma/emma';
import { EmmaText } from '@/components/emma/EmmaText';
import { Button } from '@/components/ui/Button';
import { Confetti } from '@/components/ui/Confetti';
import { Icon } from '@/components/ui/Icon';
import { SpeakerButton } from '@/components/voice/SpeakerButton';
import { CoinIcon, XpIcon } from '@/components/game-ui/icons';
import { Sparks } from '@/components/game-ui/Sparks';
import { comboMultiplier } from '@/lib/game/economy';
import { cn } from '@/lib/utils';

/**
 * How big a moment an answer is. Each tier escalates on the one before, so
 * the big ones stand out: most right answers are a quick, tidy "yes"; a combo
 * step sparks; ten in a row catches fire; a milestone (the final challenge, a
 * first word) gets its own ribbon. Wrong answers are always gentle.
 */
export type FeedbackTier = 'wrong' | 'almost' | 'correct' | 'combo' | 'fire' | 'milestone';

export interface Feedback {
  correct: boolean;
  tier: FeedbackTier;
  /** A ribbon above the title for milestones ("Final challenge", "First word"). */
  badge?: string;
  title: string;
  /** The right answer (shown when wrong, or for a near miss). */
  expected?: string;
  expectedLang?: 'es' | 'en';
  /** Extra explanation or correction (Emma-markup). */
  note?: string;
  xp: number;
  coins: number;
  /** XP was doubled by a boost. */
  boosted: boolean;
  /** Correct answers in a row (0 after a mistake). */
  combo: number;
  /** This answer raised the combo multiplier. */
  comboStep: boolean;
  /** A near miss (typo, accents, almost-right pronunciation). */
  almost: boolean;
  canRetry: boolean;
}

const EMMA_FOR: Record<FeedbackTier, EmmaState> = {
  wrong: 'wrong',
  almost: 'almost',
  correct: 'correct',
  combo: 'excited',
  fire: 'celebrating',
  milestone: 'proud',
};

const PANEL: Record<FeedbackTier, string> = {
  wrong: 'bg-honey-light',
  almost: 'bg-honey-light',
  correct: 'bg-sage-light',
  combo: 'bg-gradient-to-b from-[#f4f0cf] to-sage-light',
  fire: 'bg-gradient-to-b from-sun-light via-[#fbe3cf] to-terracotta-light',
  milestone: 'bg-gradient-to-b from-sun-light to-[#fff4d6]',
};

/** Slides up after every answer: a gentle correction or a celebration sized to the moment. */
export function FeedbackPanel({
  feedback,
  name,
  onContinue,
  onRetry,
}: {
  feedback: Feedback;
  name: string;
  onContinue: () => void;
  onRetry: () => void;
}) {
  const continueRef = useRef<HTMLButtonElement>(null);
  const { correct, tier } = feedback;
  const multiplier = comboMultiplier(feedback.combo);
  const big = tier === 'combo' || tier === 'fire' || tier === 'milestone';

  useEffect(() => {
    const t = window.setTimeout(() => continueRef.current?.focus({ preventScroll: true }), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onContinue();
      }
    };
    // Defer so the Enter that submitted the answer doesn't also skip the feedback.
    const k = window.setTimeout(() => window.addEventListener('keydown', onKey), 250);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(k);
      window.removeEventListener('keydown', onKey);
    };
  }, [onContinue]);

  const titleTone = correct ? (tier === 'fire' ? 'text-terracotta-dark' : tier === 'milestone' ? 'text-honey-dark' : 'text-sage-dark') : 'text-honey-dark';

  return (
    <div role={correct ? 'status' : 'alert'} className={cn('fixed inset-x-0 bottom-0 z-30 animate-sheet rounded-t-[2rem] px-5 pt-5 shadow-lift safe-bottom', PANEL[tier])} data-tier={tier}>
      {(tier === 'fire' || tier === 'milestone') && <Confetti intensity={tier === 'fire' ? 70 : 55} origin={0.8} className="z-[31]" />}
      <div className="mx-auto max-w-xl">
        {feedback.badge && (
          <p className="mb-2 inline-flex animate-slam items-center gap-1.5 rounded-full bg-sun px-3 py-1 text-xs font-black tracking-[0.14em] text-ink uppercase shadow-card">
            <span aria-hidden>★</span> {feedback.badge}
          </p>
        )}
        <div className="flex items-start gap-3">
          <span className="relative shrink-0">
            <EmmaAvatar state={EMMA_FOR[tier]} size={52} />
            {big && <Sparks key={feedback.title} count={tier === 'combo' ? 10 : 14} distance={tier === 'combo' ? 40 : 52} />}
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <p className={cn('flex items-start gap-2 text-[21px] leading-tight font-extrabold', titleTone)}>
              {/* Right or not is never colour alone: a tick or an arrow leads the line. */}
              <span
                className={cn('mt-0.5 grid h-6 w-6 shrink-0 animate-pop place-items-center rounded-full text-white', correct ? 'bg-sage' : 'bg-honey-dark/80')}
                aria-hidden
              >
                <Icon name={correct ? 'check' : 'arrowRight'} size={14} strokeWidth={3.4} />
              </span>
              <span className={cn('min-w-0', big && 'origin-left animate-count')}>
                <EmmaText text={feedback.title} name={name} />
              </span>
            </p>
            <span className="sr-only">{correct ? 'Correct.' : 'Not quite.'}</span>
            {feedback.expected && (
              <div className="mt-2">
                <p className={cn('text-sm font-bold', correct ? 'text-sage-dark/80' : 'text-honey-dark/90')}>{correct ? 'Correct answer:' : 'In Spanish we normally say:'}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <p lang={feedback.expectedLang} className={cn('text-xl leading-snug', feedback.expectedLang === 'es' ? 'spanish' : 'font-extrabold')}>
                    {feedback.expected}
                  </p>
                  {feedback.expectedLang === 'es' && <SpeakerButton text={feedback.expected} size="sm" showSlow={false} label="Hear the correct answer" />}
                </div>
              </div>
            )}
            {feedback.note && (
              <p className="mt-2 text-[15px] leading-snug text-ink">
                <EmmaText text={feedback.note} name={name} />
              </p>
            )}
          </div>
          {feedback.xp > 0 && (
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className={cn('relative inline-flex animate-pop items-center gap-1 rounded-full px-2.5 py-1 font-black text-ink shadow-card', big ? 'bg-sun text-base' : 'bg-sun text-sm')}>
                +{feedback.xp} XP
                {feedback.boosted && <span aria-label="boosted">⚡</span>}
                <span className="pointer-events-none absolute -top-1 right-2 animate-rise" aria-hidden>
                  <XpIcon size={16} />
                </span>
              </span>
              {feedback.coins > 0 && (
                <span className="inline-flex animate-pop items-center gap-1 rounded-full bg-[#fff4d6] px-2 py-0.5 text-xs font-black text-[#8f5d0f] [animation-delay:120ms]">
                  +{feedback.coins} <CoinIcon size={14} />
                  <span className="sr-only">coin{feedback.coins === 1 ? '' : 's'}</span>
                </span>
              )}
              {multiplier > 1 && (
                <span
                  className={cn(
                    'relative inline-flex items-center rounded-full px-2 py-0.5 text-xs font-black tracking-wide uppercase',
                    feedback.comboStep ? 'animate-slam bg-terracotta text-white' : 'bg-terracotta-light text-terracotta-dark',
                  )}
                >
                  ×{multiplier} combo
                  {feedback.comboStep && <Sparks count={8} distance={30} size={5} />}
                </span>
              )}
            </span>
          )}
        </div>
        <div className="mt-5 flex gap-3">
          {feedback.canRetry && (
            <Button variant="secondary" size="lg" className="flex-1" onClick={onRetry}>
              Try again
            </Button>
          )}
          <Button ref={continueRef} variant={correct ? 'success' : 'honey'} size="lg" className="flex-1" onClick={onContinue}>
            {correct ? 'Continue' : 'Got it'}
          </Button>
        </div>
      </div>
    </div>
  );
}
