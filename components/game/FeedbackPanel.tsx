'use client';

import { useEffect, useRef } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { EmmaText } from '@/components/emma/EmmaText';
import { Button } from '@/components/ui/Button';
import { SpeakerButton } from '@/components/voice/SpeakerButton';
import { cn } from '@/lib/utils';

export interface Feedback {
  correct: boolean;
  title: string;
  /** The right answer (shown when wrong, or for a near miss). */
  expected?: string;
  expectedLang?: 'es' | 'en';
  /** Extra explanation or correction (Emma-markup). */
  note?: string;
  xp: number;
  canRetry: boolean;
}

/** Slides up after every answer: a gentle correction or a small celebration. */
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
  const { correct } = feedback;

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

  return (
    <div
      role={correct ? 'status' : 'alert'}
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 animate-sheet rounded-t-[2rem] px-5 pt-5 shadow-lift safe-bottom',
        correct ? 'bg-sage-light' : 'bg-honey-light',
      )}
    >
      <div className="mx-auto max-w-xl">
        <div className="flex items-start gap-3">
          <EmmaAvatar state={correct ? 'celebrating' : 'encouraging'} size={52} />
          <div className="min-w-0 flex-1 pt-1">
            <p className={cn('text-[21px] leading-tight font-extrabold', correct ? 'text-sage-dark' : 'text-honey-dark')}>
              <EmmaText text={feedback.title} name={name} />
            </p>
            {feedback.expected && (
              <div className="mt-2">
                <p className={cn('text-sm font-bold', correct ? 'text-sage-dark/80' : 'text-honey-dark/90')}>
                  {correct ? 'Correct answer:' : 'In Spanish we normally say:'}
                </p>
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
            <span className="shrink-0 animate-pop rounded-full bg-sun px-2.5 py-1 text-sm font-black text-ink shadow-card">+{feedback.xp} XP</span>
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
