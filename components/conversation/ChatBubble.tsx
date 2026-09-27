'use client';

import { useState } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import type { EmmaState } from '@/components/emma/emma';
import { EmmaText } from '@/components/emma/EmmaText';
import { Icon } from '@/components/ui/Icon';
import { useSpeaker } from '@/components/voice/hooks';
import { cn, personalise } from '@/lib/utils';

export function EmmaBubble({
  text,
  translation,
  name,
  state = 'happy',
  showAvatar = true,
  tone = 'default',
  lang = 'es',
}: {
  text: string;
  translation?: string;
  name: string;
  state?: EmmaState;
  showAvatar?: boolean;
  tone?: 'default' | 'correction';
  lang?: 'es' | 'en';
}) {
  const [showEnglish, setShowEnglish] = useState(false);
  const { say, activeKey } = useSpeaker();
  const shown = personalise(text, name);
  const playing = activeKey === `bubble:${text}`;

  return (
    <div className="flex animate-enter items-end gap-2">
      <div className="w-10 shrink-0">{showAvatar && <EmmaAvatar state={playing ? 'speaking' : state} size={40} animated={false} />}</div>
      <div
        className={cn(
          'relative max-w-[82%] rounded-3xl rounded-bl-md px-4 py-3 shadow-card',
          tone === 'correction' ? 'border border-honey/40 bg-honey-light' : 'bg-paper',
        )}
      >
        <p className="text-[17px] leading-snug font-semibold" lang={lang}>
          <EmmaText text={shown} lang={lang} />
        </p>
        {showEnglish && translation && <p className="mt-1.5 text-sm text-ink-soft">{personalise(translation, name)}</p>}
        <div className="mt-1.5 flex gap-1">
          <button
            type="button"
            onClick={() => void say(lang === 'es' ? `*${shown.replace(/\*/g, '')}*` : shown, { key: `bubble:${text}`, includeEnglish: true })}
            aria-label="Hear Emma say this"
            className={cn('grid h-9 w-9 place-items-center rounded-full text-ink-faint hover:bg-cream-deep hover:text-terracotta', playing && 'text-terracotta')}
          >
            <Icon name="speaker" size={18} />
          </button>
          {translation && (
            <button
              type="button"
              onClick={() => setShowEnglish((v) => !v)}
              aria-pressed={showEnglish}
              aria-label={showEnglish ? 'Hide English' : 'Show English'}
              className={cn(
                'grid h-9 min-w-9 place-items-center rounded-full px-2 text-xs font-extrabold text-ink-faint hover:bg-cream-deep hover:text-terracotta',
                showEnglish && 'bg-cream-deep text-terracotta',
              )}
            >
              EN
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlayerBubble({ text, status }: { text: string; status?: 'ok' | 'fix' | null }) {
  return (
    <div className="flex animate-enter justify-end">
      <p
        lang="es"
        className={cn(
          'max-w-[80%] rounded-3xl rounded-br-md px-4 py-3 text-[17px] leading-snug font-bold shadow-card',
          status === 'fix' ? 'bg-cream-deep text-ink-soft' : 'bg-terracotta text-white',
        )}
      >
        {text}
        {status === 'ok' && (
          <span className="ml-1.5 inline-block align-middle" aria-label="understood">
            <Icon name="check" size={16} strokeWidth={3} />
          </span>
        )}
      </p>
    </div>
  );
}

export function TypingDots() {
  return (
    <div className="flex items-end gap-2" aria-label="Emma is typing">
      <div className="w-10 shrink-0">
        <EmmaAvatar state="thinking" size={40} animated={false} decorative />
      </div>
      <div className="flex gap-1 rounded-3xl rounded-bl-md bg-paper px-4 py-4 shadow-card">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-ink-faint" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}
