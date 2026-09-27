'use client';

import { useCallback, useState } from 'react';
import { EmmaText } from '@/components/emma/EmmaText';
import { emmaLine } from '@/components/emma/lines';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/Sheet';
import { MicButton } from '@/components/voice/MicButton';
import { SpeakerButton } from '@/components/voice/SpeakerButton';
import { SpokenResult } from '@/components/voice/SpokenResult';
import { useListener } from '@/components/voice/hooks';
import { bestUtteranceMatch } from '@/lib/text/match';
import { isPermanent, voiceErrorMessage } from '@/services/voice/errors';
import { voiceService, type SpeechEvaluation } from '@/services/voice/VoiceService';
import { soundService } from '@/services/sound/SoundService';
import { useGameStore } from '@/store/gameStore';
import { cn, personalise } from '@/lib/utils';
import type { SpeakExercise as SpeakExerciseType } from '@/types/curriculum';
import { ActionBar, AnswerInput, CheckButton, PromptBubble } from '../parts';
import type { ExerciseProps } from '../types';

const MAX_ATTEMPTS = 3;

/** Display text for a target that may contain {any}. */
const displayTarget = (text: string, name: string) => personalise(text, name).replace(/\{any\}|\{number\}/g, '…');

export function SpeakExercise({ exercise, env, onAnswer, onPauseSpeaking }: ExerciseProps<SpeakExerciseType>) {
  const listener = useListener('es-ES');
  const recordSpeakingAttempt = useGameStore((s) => s.recordSpeakingAttempt);
  // Typing when the player chose it, or when the microphone isn't usable.
  const [chooseTyping, setTyping] = useState(false);
  const typing = chooseTyping || !env.canListen || env.speakingPaused;
  const [attempts, setAttempts] = useState(0);
  const [evaluation, setEvaluation] = useState<SpeechEvaluation | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const target = displayTarget(exercise.spanish, env.name);

  const listen = useCallback(async () => {
    if (done) return;
    setMessage(null);
    const result = await listener.start();
    if (!result) return;
    const evalResult = voiceService.evaluateSpeech(result, exercise.accept, { name: env.name });
    setEvaluation(evalResult);
    if (evalResult.passed) {
      setDone(true);
      onAnswer({
        correct: true,
        given: evalResult.heard,
        expected: target,
        expectedLang: 'es',
        speaking: { score: evalResult.score, typed: false },
      });
      return;
    }
    soundService.play('incorrect');
    recordSpeakingAttempt();
    const next = attempts + 1;
    setAttempts(next);
    setMessage(next >= MAX_ATTEMPTS ? emmaLine('speakGiveUp') : emmaLine('speakRetry'));
  }, [done, listener, exercise.accept, env.name, onAnswer, target, attempts, recordSpeakingAttempt]);

  const giveUp = () => {
    setDone(true);
    onAnswer({
      correct: false,
      given: evaluation?.heard ?? '',
      expected: target,
      expectedLang: 'es',
      mistakeType: 'pronunciation',
      speaking: { score: evaluation?.score ?? 0, typed: false },
    });
  };

  const submitTyped = () => {
    if (!typed.trim() || done) return;
    const best = bestUtteranceMatch([typed], exercise.accept, { name: env.name });
    const correct = best.score >= 0.85;
    setDone(true);
    onAnswer({
      correct,
      given: typed,
      expected: target,
      expectedLang: 'es',
      mistakeType: correct ? undefined : 'vocabulary',
      speaking: { score: best.score, typed: true },
      retryable: !correct,
    });
  };

  const error = listener.error;
  const permanent = error ? isPermanent(error) : false;

  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-4 pt-4 pb-6">
        <PromptBubble
          text={exercise.prompt ?? (typing ? 'Type this in Spanish.' : 'Say this in Spanish.')}
          name={env.name}
          state={listener.state === 'listening' ? 'listening' : message ? 'encouraging' : undefined}
        />

        <Card className="mt-6 animate-enter px-5 py-6 text-center">
          <p className="text-xs font-extrabold tracking-[0.18em] text-terracotta uppercase">{typing ? 'Type it' : 'Say it'}</p>
          <p lang="es" className="mt-2 font-display text-[34px] leading-tight font-semibold text-brick">
            {target}
          </p>
          {env.showPronunciation && exercise.pronunciation && (
            <p className="mt-2 inline-flex rounded-full bg-cream-deep px-3 py-1 text-sm font-extrabold tracking-wide text-ink-soft">
              🗣️ {exercise.pronunciation}
            </p>
          )}
          <p className="mt-2 font-bold text-ink-soft">{personalise(exercise.english, env.name)}</p>
          {!exercise.spanish.includes('{any}') && (
            <div className="mt-4 flex justify-center">
              <SpeakerButton text={personalise(exercise.spanish, env.name)} size="md" autoPlay={env.autoplay && env.canSpeak && !typing} label="Hear Emma say it" />
            </div>
          )}
        </Card>

        {evaluation && !typing && (
          <div className="mt-5 animate-enter">
            <SpokenResult words={evaluation.words} heard={evaluation.heard} />
          </div>
        )}

        {message && !typing && (
          <p className="mt-4 animate-enter rounded-2xl bg-honey-light px-4 py-3 text-center font-bold text-honey-dark" role="status">
            {message}
          </p>
        )}

        {error && !typing && (
          <div className="mt-4 animate-enter rounded-2xl bg-honey-light px-4 py-3 text-center text-honey-dark" role="alert">
            <p className="font-bold">{voiceErrorMessage(error)}</p>
            {permanent && (
              <Button variant="honey" size="sm" className="mt-3" onClick={() => setTyping(true)} icon={<Icon name="keyboard" size={18} />}>
                Type instead
              </Button>
            )}
          </div>
        )}

        {typing && (
          <div className="mt-6">
            {!env.canListen && (
              <p className="mb-3 flex items-center gap-2 text-sm text-ink-soft">
                <Icon name="micOff" size={18} />
                <EmmaText text="Your browser can't listen here, so type it — you'll still learn it." />
              </p>
            )}
            <AnswerInput
              value={typed}
              onChange={setTyped}
              onSubmit={submitTyped}
              placeholder="Escribe en español…"
              lang="es"
              locked={env.locked || done}
              label="Type the phrase in Spanish"
            />
          </div>
        )}
      </div>

      <ActionBar hidden={env.locked}>
        {typing ? (
          <div className="space-y-2">
            <CheckButton disabled={!typed.trim() || done} onClick={submitTyped} />
            {env.canListen && !env.speakingPaused && (
              <button
                type="button"
                onClick={() => setTyping(false)}
                className="mx-auto flex min-h-11 items-center gap-2 text-sm font-extrabold text-terracotta"
              >
                <Icon name="mic" size={18} /> Use the microphone
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center pb-1">
            <MicButton
              state={listener.state}
              level={listener.level}
              onStart={listen}
              onStop={listener.stop}
              disabled={done}
              label={attempts > 0 ? 'Tap to try again' : 'Tap to speak'}
            />
            <div className={cn('mt-1 flex w-full items-center justify-between', attempts >= MAX_ATTEMPTS && 'justify-center gap-4')}>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="min-h-11 px-2 text-sm font-extrabold text-ink-soft hover:text-ink"
              >
                Can&rsquo;t speak now?
              </button>
              {attempts >= MAX_ATTEMPTS ? (
                <Button variant="secondary" size="sm" onClick={giveUp}>
                  Skip for now
                </Button>
              ) : (
                attempts > 0 && (
                  <button type="button" onClick={giveUp} className="min-h-11 px-2 text-sm font-extrabold text-ink-soft hover:text-ink">
                    Skip
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </ActionBar>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} label="Can't speak right now?">
        <h2 className="font-display text-2xl font-semibold">Can&rsquo;t speak right now?</h2>
        <p className="mt-2 text-ink-soft">No problem — you can type instead. I&rsquo;ll bring speaking back later.</p>
        <div className="mt-5 space-y-3">
          <Button
            block
            size="lg"
            onClick={() => {
              setSheetOpen(false);
              listener.cancel();
              setTyping(true);
            }}
          >
            Type this one
          </Button>
          <Button
            block
            size="lg"
            variant="secondary"
            onClick={() => {
              setSheetOpen(false);
              listener.cancel();
              setTyping(true);
              onPauseSpeaking();
            }}
          >
            Pause speaking for an hour
          </Button>
        </div>
      </Sheet>
    </>
  );
}
