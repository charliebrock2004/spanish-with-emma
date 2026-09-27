'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { AccentKeys } from '@/components/game/parts';
import { MicButton } from '@/components/voice/MicButton';
import { useListener } from '@/components/voice/hooks';
import { voiceErrorMessage, isPermanent } from '@/services/voice/errors';
import { cn } from '@/lib/utils';

export type ReplyMode = 'tap' | 'voice' | 'type';

export interface Reply {
  text: string;
  /** Recogniser alternatives (voice only). */
  transcripts: string[];
  via: ReplyMode;
}

/**
 * How the player answers Emma: speak (default when a mic is available), type,
 * or — for beginners — tap one of a few suggested replies.
 */
export function ReplyComposer({
  onReply,
  options,
  canListen,
  defaultMode,
  disabled,
  placeholder = 'Escribe tu respuesta…',
}: {
  onReply: (reply: Reply) => void;
  options?: string[];
  canListen: boolean;
  defaultMode: ReplyMode;
  disabled?: boolean;
  placeholder?: string;
}) {
  const initial: ReplyMode = defaultMode === 'voice' && !canListen ? (options?.length ? 'tap' : 'type') : defaultMode;
  const [mode, setMode] = useState<ReplyMode>(initial);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listener = useListener('es-ES');

  useEffect(() => {
    if (mode === 'type') inputRef.current?.focus();
  }, [mode]);

  const speak = async () => {
    const result = await listener.start();
    if (result) onReply({ text: result.transcripts[0], transcripts: result.transcripts, via: 'voice' });
  };

  const sendTyped = () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    onReply({ text: value, transcripts: [value], via: 'type' });
  };

  const modeButton = (target: ReplyMode, icon: 'mic' | 'keyboard' | 'chat', label: string) => (
    <button
      type="button"
      onClick={() => {
        listener.cancel();
        setMode(target);
      }}
      aria-pressed={mode === target}
      aria-label={label}
      className={cn(
        'grid h-11 w-11 place-items-center rounded-full transition-colors',
        mode === target ? 'bg-terracotta-light text-terracotta' : 'text-ink-faint hover:bg-cream-deep hover:text-ink',
      )}
    >
      <Icon name={icon} size={20} />
    </button>
  );

  return (
    <div className={cn('space-y-3', disabled && 'pointer-events-none opacity-60')}>
      {mode === 'tap' && options && (
        <div className="grid gap-2" role="group" aria-label="Suggested replies">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              lang="es"
              onClick={() => onReply({ text: option, transcripts: [option], via: 'tap' })}
              className="min-h-14 rounded-2xl border-2 border-sand bg-paper px-4 py-2 text-left text-[17px] font-bold shadow-[0_3px_0_var(--color-sand)] active:translate-y-[2px] active:shadow-none"
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {mode === 'voice' && (
        <div className="flex flex-col items-center">
          {listener.interim && listener.state === 'listening' && (
            <p lang="es" className="mb-2 max-w-full truncate rounded-full bg-paper px-4 py-1.5 text-sm font-bold text-ink-soft shadow-card">
              {listener.interim}…
            </p>
          )}
          {listener.error && (
            <p className="mb-2 rounded-2xl bg-honey-light px-4 py-2 text-center text-sm font-bold text-honey-dark" role="alert">
              {voiceErrorMessage(listener.error)}
              {isPermanent(listener.error) && (
                <button type="button" className="ml-2 underline" onClick={() => setMode(options?.length ? 'tap' : 'type')}>
                  {options?.length ? 'Choose a reply' : 'Type instead'}
                </button>
              )}
            </p>
          )}
          <MicButton state={listener.state} level={listener.level} onStart={speak} onStop={listener.stop} size={76} label="Tap and answer Emma" />
        </div>
      )}

      {mode === 'type' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendTyped();
          }}
          className="space-y-1"
        >
          <div className="flex items-center gap-2 rounded-full border-2 border-sand bg-paper py-1 pr-1 pl-4 focus-within:border-terracotta">
            <label htmlFor="reply-input" className="sr-only">
              Your reply in Spanish
            </label>
            <input
              id="reply-input"
              ref={inputRef}
              lang="es"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              autoCorrect="off"
              className="h-12 min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none placeholder:text-ink-faint"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label="Send"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-terracotta text-white disabled:opacity-40"
            >
              <Icon name="send" size={18} />
            </button>
          </div>
          <AccentKeys inputRef={inputRef} onInsert={setText} />
        </form>
      )}

      <div className="flex items-center justify-center gap-1" role="group" aria-label="How to reply">
        {canListen && modeButton('voice', 'mic', 'Reply by speaking')}
        {modeButton('type', 'keyboard', 'Reply by typing')}
        {options && options.length > 0 && modeButton('tap', 'chat', 'Choose a reply')}
      </div>
    </div>
  );
}
