'use client';

import { EmmaBubble } from '@/components/cosmetics/cosmetics';
import { useRef, type ReactNode, type RefObject } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import type { EmmaState } from '@/components/emma/emma';
import { EmmaText } from '@/components/emma/EmmaText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useVoiceStatus } from '@/components/voice/hooks';
import { cn, personalise } from '@/lib/utils';

/** Emma asking the question. */
export function PromptBubble({
  text,
  name,
  state,
  className,
  children,
}: {
  text: string;
  name: string;
  state?: EmmaState;
  className?: string;
  children?: ReactNode;
}) {
  const { speaking, paused, preparing } = useVoiceStatus();
  const emma: EmmaState = state ?? (speaking && !paused && !preparing ? 'speaking' : preparing ? 'thinking' : 'happy');
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <EmmaAvatar state={emma} size={52} />
      <EmmaBubble tail="none" className="relative mt-1 min-w-0 flex-1 rounded-2xl rounded-tl-md">
        <h2 className="text-[17px] leading-snug font-bold">
          <EmmaText text={text} name={name} />
        </h2>
        {children}
      </EmmaBubble>
    </div>
  );
}

/** Bottom action area for an exercise (Check / Continue). */
export function ActionBar({ children, hidden }: { children: ReactNode; hidden?: boolean }) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 mt-auto border-t border-sand/60 bg-cream/95 px-4 pt-3 backdrop-blur safe-bottom',
        hidden && 'invisible',
      )}
    >
      <div className="mx-auto w-full max-w-xl">{children}</div>
    </div>
  );
}

export function CheckButton({ disabled, onClick, label = 'Check' }: { disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <Button size="lg" block disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  );
}

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim';

export function OptionButton({
  children,
  state,
  onClick,
  lang,
  index,
  disabled,
}: {
  children: ReactNode;
  state: OptionState;
  onClick: () => void;
  lang?: 'es' | 'en';
  index?: number;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      lang={lang}
      aria-pressed={state === 'selected'}
      className={cn(
        'relative flex min-h-[3.75rem] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[17px] font-bold transition-all duration-150',
        state === 'idle' && 'border-sand bg-paper shadow-[0_3px_0_var(--color-sand)] active:translate-y-[2px] active:shadow-none',
        state === 'selected' && 'border-terracotta bg-terracotta-light/60 text-brick shadow-[0_3px_0_var(--color-terracotta)]',
        state === 'correct' && 'animate-pop border-sage bg-sage-light text-sage-dark shadow-[0_3px_0_var(--color-sage)]',
        state === 'wrong' && 'animate-shake border-honey bg-honey-light text-honey-dark shadow-[0_3px_0_var(--color-honey)]',
        state === 'dim' && 'border-sand/60 bg-paper/60 text-ink-faint',
      )}
    >
      {index !== undefined && (
        <kbd
          className={cn(
            'hidden h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-xs font-black sm:grid',
            state === 'selected' ? 'border-terracotta text-terracotta' : 'border-sand text-ink-faint',
          )}
          aria-hidden
        >
          {index + 1}
        </kbd>
      )}
      <span className={cn('min-w-0 flex-1', lang === 'es' && 'font-display text-lg font-semibold')}>{children}</span>
      {state === 'correct' && <Icon name="check" size={22} strokeWidth={3} />}
    </button>
  );
}

/** Tappable word tiles: the answer line and the bank of words. */
export function WordTiles({
  tiles,
  chosen,
  onChoose,
  onRemove,
  lang,
  name,
  locked,
  status,
}: {
  tiles: string[];
  chosen: number[];
  onChoose: (index: number) => void;
  onRemove: (position: number) => void;
  lang: 'es' | 'en';
  name: string;
  locked?: boolean;
  status?: 'correct' | 'wrong' | null;
}) {
  return (
    <div className="space-y-6">
      <div
        className={cn(
          'flex min-h-[7.5rem] flex-wrap content-start gap-2 border-b-2 border-dashed border-sand pb-4',
          status === 'wrong' && 'animate-shake',
        )}
        aria-label="Your answer"
        aria-live="polite"
      >
        {chosen.length === 0 && <span className="pt-2 text-ink-faint">Tap the words in order…</span>}
        {chosen.map((tileIndex, position) => (
          <button
            key={`${tileIndex}-${position}`}
            type="button"
            disabled={locked}
            onClick={() => onRemove(position)}
            lang={lang}
            className={cn(
              'animate-pop rounded-xl border-2 bg-paper px-3 py-2 text-[17px] font-bold shadow-[0_3px_0_var(--color-sand)]',
              status === 'correct' ? 'border-sage text-sage-dark' : status === 'wrong' ? 'border-honey text-honey-dark' : 'border-sand',
            )}
          >
            {personalise(tiles[tileIndex], name)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2" aria-label="Word bank">
        {tiles.map((tile, i) => {
          const used = chosen.includes(i);
          return (
            <button
              key={`${tile}-${i}`}
              type="button"
              disabled={used || locked}
              onClick={() => onChoose(i)}
              lang={lang}
              aria-hidden={used || undefined}
              className={cn(
                'rounded-xl border-2 px-3 py-2 text-[17px] font-bold transition-all duration-150',
                used
                  ? 'border-transparent bg-cream-deep text-transparent shadow-none'
                  : 'border-sand bg-paper shadow-[0_3px_0_var(--color-sand)] active:translate-y-[2px] active:shadow-none',
              )}
            >
              {personalise(tile, name)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const ACCENTS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'];

/** Handy accent keys (iPhone users can also long-press letters). */
export function AccentKeys({ inputRef, onInsert }: { inputRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>; onInsert: (value: string) => void }) {
  const insert = (char: string) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + char + el.value.slice(end);
    onInsert(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + char.length, start + char.length);
    });
  };
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto py-1" aria-label="Spanish characters">
      {ACCENTS.map((c) => (
        <button
          key={c}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert(c)}
          className="h-10 min-w-10 shrink-0 rounded-xl border-2 border-sand bg-paper px-2 text-lg font-bold text-ink-soft shadow-[0_2px_0_var(--color-sand)] active:translate-y-[2px] active:shadow-none"
          aria-label={`Insert ${c}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/** Multi-line answer box that submits on Enter. */
export function AnswerInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  lang,
  locked,
  status,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  lang: 'es' | 'en';
  locked?: boolean;
  status?: 'correct' | 'wrong' | null;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor="answer-input">
        {label}
      </label>
      <textarea
        id="answer-input"
        ref={ref}
        value={value}
        lang={lang}
        rows={3}
        autoCapitalize="sentences"
        autoCorrect="off"
        spellCheck={false}
        readOnly={locked}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        className={cn(
          'w-full resize-none rounded-2xl border-2 bg-paper px-4 py-3 text-lg font-semibold outline-none transition-colors placeholder:text-ink-faint focus:border-terracotta',
          status === 'correct' ? 'border-sage' : status === 'wrong' ? 'animate-shake border-honey' : 'border-sand',
        )}
      />
      {lang === 'es' && !locked && <AccentKeys inputRef={ref} onInsert={onChange} />}
    </div>
  );
}
