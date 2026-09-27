'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import type { EmmaState } from '@/components/emma/emma';
import { VoiceModeToggle } from '@/components/game/LessonHeader';
import { useActivityTimer } from '@/components/game/useActivityTimer';
import { useCapabilities } from '@/components/providers/AppProviders';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useVoiceCapabilities, useVoiceStatus } from '@/components/voice/hooks';
import { openingFor, type TopicDef } from '@/data/conversations/topics';
import { ChatRequestError, fetchEmmaReply } from '@/lib/conversation/aiClient';
import { currentHint, respondGuided, startGuided, type GuidedState } from '@/lib/conversation/guided';
import type { GuidedScenario, Line } from '@/lib/conversation/types';
import { conversationReward } from '@/lib/game/economy';
import { RewardChips } from '@/components/game-ui/parts';
import { useNow } from '@/lib/hooks/useNow';
import { personalise, sleep, uid } from '@/lib/utils';
import { soundService } from '@/services/sound/SoundService';
import { voiceService } from '@/services/voice/VoiceService';
import { curriculumLevel, useGameStore } from '@/store/gameStore';
import type { ChatTurn } from '@/types/chat';
import type { LevelId } from '@/types/curriculum';
import type { ConversationRecord } from '@/types/progress';
import { EmmaBubble, PlayerBubble, TypingDots } from './ChatBubble';
import { CorrectionBubble } from './CorrectionBubble';
import { ReplyComposer, type Reply } from './ReplyComposer';

type Msg =
  | { id: string; role: 'emma'; text: string; translation?: string; state: EmmaState }
  | { id: string; role: 'player'; text: string; status: 'ok' | 'fix' | null }
  | { id: string; role: 'correction'; said: string; message: string; corrected: string }
  | { id: string; role: 'note'; text: string; retry?: boolean };
type NewMsg = Msg extends infer M ? (M extends Msg ? Omit<M, 'id'> : never) : never;


export function ChatScreen({ scenario, topic }: { scenario?: GuidedScenario; topic?: TopicDef }) {
  const caps = useCapabilities();
  const router = useRouter();
  const hydrated = useGameStore((s) => s.hydrated);
  const onboarded = useGameStore((s) => s.profile.onboarded);

  useEffect(() => {
    if (hydrated && !onboarded) router.replace('/welcome');
  }, [hydrated, onboarded, router]);

  if (!scenario && !caps.aiChat) return <AiChatUnavailable />;
  if (!hydrated || !onboarded) return <ChatSkeleton />;
  return <Conversation scenario={scenario} topic={topic} />;
}

function ChatSkeleton() {
  return (
    <div className="paper flex h-dvh flex-col px-4 pt-4" aria-busy="true" aria-label="Loading conversation">
      <div className="mx-auto flex w-full max-w-xl items-center gap-3">
        <div className="skeleton h-11 w-11 rounded-full" />
        <div className="skeleton h-5 flex-1 rounded-full" />
      </div>
      <div className="skeleton mx-auto mt-8 h-16 w-full max-w-xl rounded-3xl" />
    </div>
  );
}

interface Opening {
  lines: Line[];
  guided: GuidedState | null;
  transcript: ChatTurn[];
  suggestions: string[];
}

function openConversation(scenario: GuidedScenario | undefined, topic: TopicDef | undefined, name: string, level: LevelId): Opening {
  if (scenario) {
    const start = startGuided(scenario, name);
    const hint = currentHint(scenario, start.state, name);
    return { lines: start.lines, guided: start.state, transcript: [], suggestions: hint ? [hint.spanish] : [] };
  }
  const line = topic ? openingFor(topic, level) : { spanish: '¡Hola, {name}! ¿Qué tal?', english: 'Hi {name}! How are things?' };
  const opening = { spanish: personalise(line.spanish, name), english: personalise(line.english, name) };
  return { lines: [opening], guided: null, transcript: [{ role: 'emma', text: opening.spanish }], suggestions: [] };
}

/** Shown if someone opens a free-chat link on a deployment without an AI key. */
function AiChatUnavailable() {
  return (
    <div className="paper flex min-h-dvh flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
      <EmmaAvatar state="confused" size={96} />
      <h1 className="mt-4 font-display text-2xl font-semibold">Free chat isn’t switched on here</h1>
      <p className="mt-2 max-w-sm text-ink-soft">
        Open conversations with me need an AI key on the server (<code className="text-sm">ANTHROPIC_API_KEY</code>). My guided
        conversations work without it — and they&rsquo;re great practice.
      </p>
      <ButtonLink href="/emma" size="lg" className="mt-6">
        Guided conversations
      </ButtonLink>
    </div>
  );
}

function Conversation({ scenario, topic }: { scenario?: GuidedScenario; topic?: TopicDef }) {
  const router = useRouter();
  const name = useGameStore((s) => s.profile.name);
  const level = useGameStore(curriculumLevel);
  const accessCode = useGameStore((s) => s.settings.accessCode);
  const autoplay = useGameStore((s) => s.settings.autoplayAudio);
  const pausedUntil = useGameStore((s) => s.settings.speakingPausedUntil);
  const completeSession = useGameStore((s) => s.completeSession);
  const logMistake = useGameStore((s) => s.logMistake);
  const { speaking, listening } = useVoiceStatus();
  const now = useNow();

  const mode: 'guided' | 'ai' = scenario ? 'guided' : 'ai';
  const title = scenario?.title ?? topic?.title ?? 'Talk to Emma';
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [emotion, setEmotion] = useState<EmmaState>('happy');
  const [opening] = useState(() => openConversation(scenario, topic, name, level));
  const [suggestions, setSuggestions] = useState<string[]>(opening.suggestions);
  const [showHints, setShowHints] = useState(false);
  const [ended, setEnded] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [busy, setBusy] = useState(true);
  const { canListen } = useVoiceCapabilities();

  const guided = useRef<GuidedState | null>(opening.guided);
  const transcript = useRef<ChatTurn[]>(opening.transcript);
  const struggles = useRef(0);
  const started = useRef(0);
  const recordId = useRef('');
  const lastReply = useRef<Reply | null>(null);
  const mounted = useRef(true);
  const scroller = useRef<HTMLDivElement>(null);
  const saved = useRef(false);

  useActivityTimer(!ended);

  // Achievements wait until the conversation is over (like in lessons).
  const setToastsPaused = useGameStore((s) => s.setToastsPaused);
  useEffect(() => {
    setToastsPaused(!ended);
    return () => setToastsPaused(false);
  }, [ended, setToastsPaused]);

  const push = useCallback((msg: NewMsg) => {
    setMessages((m) => [...m, { ...msg, id: uid('msg') } as Msg]);
  }, []);

  /** Emma "types" and speaks each line in turn. */
  const emmaSays = useCallback(
    async (lines: Line[], state: EmmaState = 'happy', alive: () => boolean = () => mounted.current) => {
      for (const line of lines) {
        if (!alive()) return;
        setThinking(true);
        await sleep(Math.min(900, 350 + line.spanish.length * 8));
        if (!alive()) return;
        setThinking(false);
        push({ role: 'emma', text: line.spanish, translation: line.english, state });
        if (autoplay) await voiceService.saySpanish(personalise(line.spanish, name));
      }
    },
    [push, autoplay, name],
  );

  // Opening line.
  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    started.current = Date.now();
    recordId.current = uid('chat');
    void emmaSays(opening.lines, 'happy', () => !cancelled).then(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
      mounted.current = false;
      voiceService.stop();
    };
    // Runs once per conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const recordCorrection = useCallback(
    (said: string, corrected: string, type: 'grammar' | 'vocabulary' | 'word-order' | 'pronunciation' | 'listening') => {
      logMistake({
        type,
        prompt: 'Conversation with Emma',
        expected: corrected,
        given: said,
        vocabIds: [],
        exercise: {
          id: `chat:${uid('fix')}`,
          type: 'speak',
          skill: 'speaking',
          vocabIds: [],
          spanish: corrected.replace(/[.]$/, ''),
          english: 'Say it the natural way',
          accept: [corrected],
          prompt: `Earlier you said *${said}*. Say it the natural way:`,
        },
      });
    },
    [logMistake],
  );

  const finish = useCallback(() => {
    if (ended) return;
    setEnded(true);
    voiceService.stop();
    window.setTimeout(() => mounted.current && setSummaryOpen(true), 1100);
  }, [ended]);

  const respondAi = useCallback(
    async (reply: Reply) => {
      setThinking(true);
      try {
        const res = await fetchEmmaReply(
          {
            level,
            name,
            messages: transcript.current,
            topicId: topic?.id,
            struggling: struggles.current >= 2,
          },
          accessCode,
        );
        if (!mounted.current) return;
        setThinking(false);
        setMessages((m) => m.map((msg) => (msg.role === 'player' && msg.status === null ? { ...msg, status: res.correction.hasMistake ? 'fix' : 'ok' } : msg)));
        if (res.correction.hasMistake) {
          soundService.play('incorrect');
          push({ role: 'correction', said: reply.text, message: res.correction.explanation, corrected: res.correction.corrected });
          recordCorrection(reply.text, res.correction.corrected, res.correction.type === 'none' || res.correction.type === 'spelling' ? 'grammar' : res.correction.type);
        }
        struggles.current = !res.understood || res.correction.hasMistake ? struggles.current + 1 : 0;
        setEmotion(res.emotion);
        setSuggestions(res.suggestions);
        transcript.current.push({ role: 'emma', text: res.reply });
        await emmaSays([{ spanish: res.reply, english: res.translation }], res.emotion);
        if (res.end) finish();
      } catch (error) {
        if (!mounted.current) return;
        setThinking(false);
        transcript.current.pop();
        const message =
          error instanceof ChatRequestError
            ? error.code === 'unauthorized'
              ? 'This app needs its access code for AI chat — add it in Settings.'
              : error.code === 'not-configured'
                ? "Free chat isn't switched on for this app. Try one of my guided conversations!"
                : error.message
            : 'Something went wrong.';
        push({ role: 'note', text: `I couldn't reply just now 🙈 ${message}`, retry: error instanceof ChatRequestError && ['network', 'rate-limited', 'unavailable'].includes(error.code) });
        setMessages((m) => m.map((msg) => (msg.role === 'player' && msg.status === null ? { ...msg, status: null } : msg)));
      }
    },
    [level, name, topic, accessCode, push, recordCorrection, emmaSays, finish],
  );

  const respondScripted = useCallback(
    async (reply: Reply) => {
      if (!scenario || !guided.current) return;
      const turn = respondGuided(scenario, guided.current, reply.transcripts, name);
      guided.current = turn.state;
      setMessages((m) => m.map((msg) => (msg.role === 'player' && msg.status === null ? { ...msg, status: turn.correction ? 'fix' : turn.understood ? 'ok' : null } : msg)));
      if (turn.correction) {
        soundService.play('incorrect');
        push({ role: 'correction', said: reply.text, message: turn.correction.message, corrected: turn.correction.corrected ?? '' });
        if (turn.correction.corrected) recordCorrection(reply.text, turn.correction.corrected, turn.correction.type);
      } else if (turn.understood) {
        soundService.play('correct');
      }
      const feeling: EmmaState = turn.correction ? 'encouraging' : turn.understood ? 'happy' : 'confused';
      setEmotion(feeling);
      if (!turn.understood && turn.hint) {
        setSuggestions([turn.hint.spanish]);
        if (turn.state.misses >= 2 || turn.englishDetected) setShowHints(true);
      } else {
        const hint = currentHint(scenario, turn.state, name);
        setSuggestions(hint ? [hint.spanish] : []);
      }
      await emmaSays(turn.lines, feeling);
      if (turn.state.done) finish();
    },
    [scenario, name, push, recordCorrection, emmaSays, finish],
  );

  const onReply = useCallback(
    async (reply: Reply) => {
      if (busy || ended || !reply.text.trim()) return;
      setBusy(true);
      setShowHints(false);
      lastReply.current = reply;
      push({ role: 'player', text: reply.text, status: null });
      if (mode === 'ai') {
        transcript.current.push({ role: 'player', text: reply.text });
        await respondAi(reply);
      } else {
        await respondScripted(reply);
      }
      if (mounted.current) setBusy(false);
    },
    [busy, ended, push, mode, respondAi, respondScripted],
  );

  const retryLast = useCallback(async () => {
    const reply = lastReply.current;
    if (!reply || busy) return;
    setBusy(true);
    setMessages((m) => m.filter((msg) => msg.role !== 'note'));
    transcript.current.push({ role: 'player', text: reply.text });
    await respondAi(reply);
    if (mounted.current) setBusy(false);
  }, [busy, respondAi]);

  const playerTurns = messages.filter((m) => m.role === 'player').length;
  const corrections = messages.filter((m): m is Extract<Msg, { role: 'correction' }> => m.role === 'correction' && m.corrected !== '');
  const reward = conversationReward(playerTurns).total;

  const save = () => {
    if (saved.current || playerTurns === 0) return;
    saved.current = true;
    const record: ConversationRecord = {
      id: recordId.current,
      mode,
      scenarioId: scenario?.id ?? topic?.id ?? 'free',
      title,
      startedAt: started.current,
      messages: messages
        .filter((m): m is Extract<Msg, { role: 'emma' | 'player' }> => m.role === 'emma' || m.role === 'player')
        .slice(-40)
        .map((m) => ({ role: m.role, text: m.text, translation: m.role === 'emma' ? m.translation : undefined })),
    };
    completeSession(
      {
        kind: 'conversation',
        id: record.scenarioId,
        title: `Chat: ${title}`,
        sessionId: recordId.current,
        accuracy: playerTurns ? Math.max(0, 1 - corrections.length / playerTurns) : 1,
        seconds: Math.round((Date.now() - started.current) / 1000),
        xpBefore: useGameStore.getState().xp,
      },
      { conversation: record, conversationTurns: playerTurns },
    );
  };

  const leave = () => {
    save();
    router.push('/emma');
  };

  const speakingPaused = Boolean(pausedUntil && now && pausedUntil > now);
  const avatarState: EmmaState = listening ? 'listening' : speaking ? 'speaking' : thinking ? 'thinking' : emotion;
  const status = listening ? 'Listening…' : speaking ? 'Speaking…' : thinking ? 'Typing…' : mode === 'ai' ? 'AI conversation' : 'Guided conversation';

  return (
    <div className="paper flex h-dvh flex-col">
      <header className="z-10 border-b border-sand/60 bg-cream/95 backdrop-blur safe-top">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => (playerTurns > 0 && !saved.current ? setSummaryOpen(true) : router.push('/emma'))}
            aria-label="Back"
            className="grid h-11 w-11 place-items-center rounded-full text-ink-soft hover:bg-cream-deep"
          >
            <Icon name="arrowLeft" />
          </button>
          <EmmaAvatar state={avatarState} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold">{title}</p>
            <p className="truncate text-xs font-bold text-ink-soft" aria-live="polite">
              {status}
            </p>
          </div>
          <VoiceModeToggle />
          <Button variant="secondary" size="sm" onClick={() => (playerTurns > 0 ? setSummaryOpen(true) : router.push('/emma'))}>
            Finish
          </Button>
        </div>
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-xl space-y-3 px-4 py-5">
          {messages.map((m, i) => {
            if (m.role === 'player') return <PlayerBubble key={m.id} text={m.text} status={m.status} />;
            if (m.role === 'correction') return <CorrectionBubble key={m.id} message={m.message} corrected={m.corrected} canListen={canListen && !speakingPaused} />;
            if (m.role === 'note')
              return (
                <div key={m.id} className="animate-enter rounded-2xl bg-cream-deep px-4 py-3 text-center text-sm font-bold text-ink-soft" role="alert">
                  {m.text}
                  {m.retry && (
                    <Button variant="secondary" size="sm" className="mt-2" onClick={retryLast} icon={<Icon name="refresh" size={16} />}>
                      Try again
                    </Button>
                  )}
                </div>
              );
            return (
              <EmmaBubble
                key={m.id}
                text={m.text}
                translation={m.translation}
                name={name}
                state={m.state}
                showAvatar={messages[i + 1]?.role !== 'emma'}
              />
            );
          })}
          {thinking && <TypingDots />}
          {ended && (
            <p className="animate-enter pt-2 text-center text-sm font-extrabold text-sage-dark">✓ Conversation complete</p>
          )}
        </div>
      </div>

      <div className="border-t border-sand/60 bg-cream/95 px-4 pt-3 backdrop-blur safe-bottom">
        <div className="mx-auto max-w-xl">
          {!ended && suggestions.length > 0 && (
            <div className="mb-2">
              {showHints ? (
                <div className="flex flex-wrap gap-2" aria-label="Suggestions">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      lang="es"
                      disabled={busy}
                      onClick={() => onReply({ text: personalise(s, name), transcripts: [personalise(s, name)], via: 'tap' })}
                      className="rounded-full border-2 border-sand bg-paper px-3 py-2 text-sm font-bold shadow-[0_2px_0_var(--color-sand)] active:translate-y-[1px]"
                    >
                      {personalise(s, name)}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowHints(true)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-extrabold text-ink-soft hover:bg-cream-deep"
                >
                  <Icon name="bulb" size={18} /> Need an idea?
                </button>
              )}
            </div>
          )}
          {ended ? (
            <Button size="lg" block onClick={() => setSummaryOpen(true)}>
              See how you did
            </Button>
          ) : (
            <ReplyComposer
              onReply={onReply}
              canListen={canListen && !speakingPaused}
              defaultMode={canListen && !speakingPaused ? 'voice' : 'type'}
              disabled={busy}
            />
          )}
        </div>
      </div>

      <Sheet open={summaryOpen} onClose={() => setSummaryOpen(false)} label="Conversation summary">
        <div className="text-center">
          <EmmaAvatar state="celebrating" size={80} className="mx-auto" />
          <h2 className="mt-3 font-display text-2xl font-semibold">{ended ? '¡Qué buena conversación!' : 'Finish the conversation?'}</h2>
          <p className="mt-1 text-ink-soft">
            You replied {playerTurns} time{playerTurns === 1 ? '' : 's'}
            {corrections.length > 0 && ` · ${corrections.length} thing${corrections.length === 1 ? '' : 's'} to practise`}.
          </p>
          <RewardChips xp={reward.xp} coins={reward.coins} size="lg" className="mt-3 justify-center" />
          {playerTurns < 4 && <p className="mt-2 text-xs font-bold text-ink-faint">Reply {4 - playerTurns} more time{4 - playerTurns === 1 ? '' : 's'} for the full conversation bonus.</p>}
        </div>
        {corrections.length > 0 && (
          <div className="mt-5 rounded-2xl bg-cream px-4 py-3">
            <p className="text-sm font-extrabold text-ink-soft">Saved to your review:</p>
            <ul className="mt-2 space-y-1.5">
              {corrections.slice(-4).map((c) => (
                <li key={`${c.said}-${c.corrected}`} className="text-[15px]">
                  <span className="text-ink-faint line-through">{c.said}</span> → <span lang="es" className="spanish">{c.corrected}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6 space-y-3">
          <Button size="lg" block onClick={leave}>
            {ended ? 'Done' : 'Finish & save'}
          </Button>
          {!ended && (
            <Button size="lg" block variant="secondary" onClick={() => setSummaryOpen(false)}>
              Keep chatting
            </Button>
          )}
        </div>
      </Sheet>
    </div>
  );
}
