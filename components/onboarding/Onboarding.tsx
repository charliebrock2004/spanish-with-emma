'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { EmmaFullBody, EmmaPortrait } from '@/components/emma/EmmaFigure';
import { EmmaText } from '@/components/emma/EmmaText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useSpeaker, useVoiceStatus } from '@/components/voice/hooks';
import { soundService } from '@/services/sound/SoundService';
import { voiceService } from '@/services/voice/VoiceService';
import { useGameStore } from '@/store/gameStore';
import type { LevelId } from '@/types/curriculum';
import type { Experience } from '@/types/progress';
import { cn } from '@/lib/utils';

type Step = 'splash' | 'hello' | 'experience' | 'name' | 'ready';
const STEPS: Step[] = ['splash', 'hello', 'experience', 'name', 'ready'];

const EXPERIENCES: Array<{ value: Experience; label: string; hint: string; emoji: string }> = [
  { value: 'new', label: "I'm completely new", hint: "We'll start from ¡hola!", emoji: '🌱' },
  { value: 'little', label: "I've learned a little", hint: 'Start at Everyday Basics', emoji: '☀️' },
  { value: 'lots', label: 'I know quite a bit', hint: 'Jump in at Real Life', emoji: '🌴' },
];

const PLACEMENT: Record<Experience, LevelId> = { new: 1, little: 2, lots: 3 };

function SpeechBubble({ text, name, onReplay }: { text: string; name: string; onReplay: () => void }) {
  return (
    <div className="relative animate-pop rounded-3xl rounded-tl-md bg-paper px-5 py-4 shadow-card">
      <p className="pr-8 text-[19px] leading-snug font-semibold">
        <EmmaText text={text} name={name} />
      </p>
      <button
        type="button"
        onClick={onReplay}
        aria-label="Hear Emma say that again"
        className="absolute top-2 right-2 grid h-10 w-10 place-items-center rounded-full text-terracotta hover:bg-terracotta-light"
      >
        <Icon name="speaker" size={20} />
      </button>
    </div>
  );
}

export function Onboarding({ firstLessons }: { firstLessons: Record<LevelId, string | undefined> }) {
  const router = useRouter();
  const hydrated = useGameStore((s) => s.hydrated);
  const onboarded = useGameStore((s) => s.profile.onboarded);
  const completeOnboarding = useGameStore((s) => s.completeOnboarding);
  const [step, setStep] = useState<Step>('splash');
  const [experience, setExperience] = useState<Experience | null>(null);
  const [name, setName] = useState('');
  const { say } = useSpeaker();
  const { speaking } = useVoiceStatus();
  const finishing = useRef(false);

  useEffect(() => {
    if (hydrated && onboarded && !finishing.current) router.replace('/');
  }, [hydrated, onboarded, router]);

  const lines: Record<Step, string> = {
    splash: '',
    hello: "*¡Hola!* I'm Emma 👋 Welcome to Spanish with Emma.",
    experience: 'Have you learned Spanish before?',
    name: 'What should we call you?',
    ready: `*¡Encantada, ${name.trim() || 'amigo'}!* Ready? Your very first word is waiting.`,
  };

  const go = (next: Step) => {
    setStep(next);
    const line = lines[next];
    if (line) {
      const text = next === 'ready' ? `*¡Encantada, ${name.trim() || 'amigo'}!* Ready? Your very first word is waiting.` : line;
      void say(text);
    }
  };

  const start = () => {
    // This tap unlocks audio on iOS, so Emma can speak from here on.
    voiceService.unlock();
    soundService.unlock();
    soundService.play('tap');
    go('hello');
  };

  const submitName = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    go('ready');
  };

  const finish = () => {
    if (!experience) return;
    finishing.current = true;
    voiceService.stop();
    completeOnboarding(name, experience);
    soundService.play('complete');
    const lesson = firstLessons[PLACEMENT[experience]] ?? firstLessons[1];
    router.push(lesson ? `/lesson/${lesson}` : '/');
  };

  const index = STEPS.indexOf(step);

  if (step === 'splash') {
    return (
      <main className="paper flex min-h-dvh flex-col items-center justify-between px-6 pt-10 pb-8 safe-bottom">
        <div className="animate-enter text-center">
          <p className="text-sm font-extrabold tracking-[0.2em] text-terracotta uppercase">Aprende español</p>
          <h1 className="mt-3 font-display text-[44px] leading-[0.95] font-semibold tracking-tight">
            Spanish
            <br />
            <span className="text-terracotta italic">with</span> Emma
          </h1>
        </div>
        <div className="relative my-3 flex min-h-0 flex-1 items-center justify-center">
          <div className="absolute bottom-[4%] h-8 w-40 rounded-[50%] bg-sand/60 blur-md" aria-hidden />
          <EmmaFullBody height={480} priority className="relative h-[min(58dvh,520px)] w-auto" />
        </div>
        <div className="w-full max-w-sm animate-enter [animation-delay:200ms]">
          <Button size="lg" block onClick={start}>
            ¡Hola, Emma!
          </Button>
          <p className="mt-3 text-center text-sm text-ink-faint">Turn your sound on — Emma talks to you 🔊</p>
        </div>
      </main>
    );
  }

  return (
    <main className="paper flex min-h-dvh flex-col px-5 pt-4 pb-6 safe-top safe-bottom">
      <div className="mx-auto flex w-full max-w-md items-center gap-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => setStep(STEPS[Math.max(0, index - 1)])}
          className="grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-cream-deep"
        >
          <Icon name="arrowLeft" />
        </button>
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {STEPS.slice(1).map((s, i) => (
            <span key={s} className={cn('h-2 flex-1 rounded-full transition-colors', i < index ? 'bg-terracotta' : 'bg-cream-deep')} />
          ))}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="mt-6 flex items-end gap-3">
          <EmmaAvatar state={speaking ? 'speaking' : step === 'experience' ? 'thinking' : 'happy'} size={72} priority />
          <div className="flex-1 pb-2">
            <SpeechBubble text={lines[step]} name={name} onReplay={() => void say(lines[step], { includeEnglish: true })} />
          </div>
        </div>

        <div className="mt-8 flex-1">
          {step === 'hello' && (
            <div className="flex justify-center">
              <EmmaPortrait state="happy" width={240} priority fade className="w-60 animate-enter" />
            </div>
          )}

          {step === 'experience' && (
            <div className="space-y-3" role="radiogroup" aria-label="Your Spanish experience">
              {EXPERIENCES.map((option, i) => {
                const active = experience === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      soundService.play('tap');
                      setExperience(option.value);
                    }}
                    style={{ animationDelay: `${i * 70}ms` }}
                    className={cn(
                      'flex w-full animate-enter items-center gap-4 rounded-2xl border-2 bg-paper px-4 py-4 text-left transition-all',
                      active ? 'border-terracotta bg-terracotta-light/50 shadow-[0_3px_0_var(--color-terracotta)]' : 'border-sand shadow-[0_3px_0_var(--color-sand)]',
                    )}
                  >
                    <span className="text-3xl" aria-hidden>
                      {option.emoji}
                    </span>
                    <span>
                      <span className="block text-[17px] font-extrabold">{option.label}</span>
                      <span className="block text-sm text-ink-soft">{option.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 'name' && (
            <form id="name-form" onSubmit={submitName} className="animate-enter">
              <label htmlFor="player-name" className="sr-only">
                Your name
              </label>
              <input
                id="player-name"
                autoFocus
                autoComplete="given-name"
                autoCapitalize="words"
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-16 w-full rounded-2xl border-2 border-sand bg-paper px-5 text-xl font-bold outline-none placeholder:text-ink-faint focus:border-terracotta"
              />
              <p className="mt-3 text-sm text-ink-soft">Emma will use it when she talks to you.</p>
            </form>
          )}

          {step === 'ready' && (
            <div className="animate-enter space-y-3">
              {[
                ['🎙️', 'Speak out loud', 'Emma listens and helps with pronunciation.'],
                ['🎯', `${10} minutes a day`, 'Short lessons, a daily streak and review.'],
                ['💬', 'Real conversations', 'Chat with Emma as your Spanish grows.'],
              ].map(([emoji, title, body]) => (
                <div key={title} className="flex items-center gap-4 rounded-2xl bg-paper px-4 py-3 shadow-card">
                  <span className="text-2xl" aria-hidden>
                    {emoji}
                  </span>
                  <span>
                    <span className="block font-extrabold">{title}</span>
                    <span className="block text-sm text-ink-soft">{body}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-6">
          {step === 'hello' && (
            <Button size="lg" block onClick={() => go('experience')}>
              Continue
            </Button>
          )}
          {step === 'experience' && (
            <Button size="lg" block disabled={!experience} onClick={() => go('name')}>
              Continue
            </Button>
          )}
          {step === 'name' && (
            <Button size="lg" block type="submit" form="name-form" disabled={!name.trim()}>
              Continue
            </Button>
          )}
          {step === 'ready' && (
            <Button size="lg" block onClick={finish}>
              Start learning 🇪🇸
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
