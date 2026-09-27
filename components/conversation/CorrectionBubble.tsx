'use client';

import { useState } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { EmmaText } from '@/components/emma/EmmaText';
import { Icon } from '@/components/ui/Icon';
import { useListener } from '@/components/voice/hooks';
import { SpeakerButton } from '@/components/voice/SpeakerButton';
import { voiceErrorMessage } from '@/services/voice/errors';
import { voiceService } from '@/services/voice/VoiceService';
import { soundService } from '@/services/sound/SoundService';
import { cn } from '@/lib/utils';

/**
 * Emma's gentle correction ("Almost! ❤️ In Spanish we normally say…") with a
 * chance to say it again right there.
 */
export function CorrectionBubble({
  message,
  corrected,
  canListen,
}: {
  message: string;
  corrected: string;
  canListen: boolean;
}) {
  const listener = useListener('es-ES');
  const [result, setResult] = useState<'good' | 'retry' | null>(null);

  const practise = async () => {
    const heard = await listener.start();
    if (!heard) return;
    const evaluation = voiceService.evaluateSpeech(heard, [corrected]);
    setResult(evaluation.passed ? 'good' : 'retry');
    soundService.play(evaluation.passed ? 'correct' : 'incorrect');
  };

  return (
    <div className="flex animate-enter items-end gap-2">
      <div className="w-10 shrink-0">
        <EmmaAvatar state="encouraging" size={40} animated={false} />
      </div>
      <div className="max-w-[84%] rounded-3xl rounded-bl-md border border-honey/40 bg-honey-light px-4 py-3 shadow-card">
        <p className="font-extrabold text-honey-dark">Almost! ❤️</p>
        {message && (
          <p className="mt-1 text-[15px] leading-snug">
            <EmmaText text={message} />
          </p>
        )}
        {corrected && (
          <>
            <p className="mt-2 text-sm font-bold text-honey-dark">In Spanish we normally say:</p>
            <div className="mt-0.5 flex items-center gap-2">
              <p lang="es" className="spanish text-lg leading-snug">
                {corrected}
              </p>
              <SpeakerButton text={corrected} size="sm" showSlow={false} label="Hear the correct sentence" />
            </div>
            {canListen && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={listener.state === 'listening' ? listener.stop : practise}
                  className={cn(
                    'inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-extrabold transition-colors',
                    listener.state === 'listening' ? 'bg-brick text-white' : 'bg-paper text-terracotta shadow-card',
                  )}
                >
                  <Icon name={listener.state === 'listening' ? 'stop' : 'mic'} size={16} />
                  {listener.state === 'listening' ? 'Listening…' : result === 'good' ? 'Say it again' : 'Try saying it'}
                </button>
                {result === 'good' && <span className="text-sm font-extrabold text-sage-dark">¡Perfecto! ✓</span>}
                {result === 'retry' && <span className="text-sm font-bold text-honey-dark">Nearly — once more?</span>}
              </div>
            )}
            {listener.error && <p className="mt-1 text-xs font-bold text-honey-dark">{voiceErrorMessage(listener.error)}</p>}
          </>
        )}
      </div>
    </div>
  );
}
