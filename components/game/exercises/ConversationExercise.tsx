'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmmaBubble, PlayerBubble, TypingDots } from '@/components/conversation/ChatBubble';
import { ReplyComposer, type Reply } from '@/components/conversation/ReplyComposer';
import { Button } from '@/components/ui/Button';
import { bestUtteranceMatch } from '@/lib/text/match';
import { detectCommonMistake } from '@/lib/text/mistakes';
import { hashString, personalise, seededRandom, shuffle } from '@/lib/utils';
import { voiceService } from '@/services/voice/VoiceService';
import { soundService } from '@/services/sound/SoundService';
import type { ConversationExercise as ConversationExerciseType } from '@/types/curriculum';
import { ActionBar } from '../parts';
import type { ExerciseProps } from '../types';

interface Message {
  role: 'emma' | 'player' | 'correction';
  text: string;
  translation?: string;
  status?: 'ok' | 'fix';
}

const PASS = 0.75;

export function ConversationExercise({ exercise, env, onAnswer }: ExerciseProps<ConversationExerciseType>) {
  const [turn, setTurn] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [awaiting, setAwaiting] = useState(false);
  const [typing, setTyping] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const mistakes = useRef(0);
  const replied = useRef(0);
  const finished = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const correct = mistakes.current === 0;
    onAnswer({
      correct,
      given: '',
      expected: '',
      expectedLang: 'es',
      mistakeType: 'grammar',
      xp: 10 * Math.max(1, replied.current),
      vocabResults: exercise.vocabIds.map((id) => ({ id, correct })),
    });
  }, [exercise.vocabIds, onAnswer]);

  // Latest props for timers, so Emma's lines only depend on the turn changing.
  const latest = useRef({ exercise, env, finish });
  useEffect(() => {
    latest.current = { exercise, env, finish };
  });

  // Emma says her line for the current turn.
  useEffect(() => {
    const { exercise: ex, env: e } = latest.current;
    const line = ex.turns[turn];
    if (!line) return;
    setTyping(true);
    const t = window.setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { role: 'emma', text: line.emma, translation: line.english }]);
      if (e.autoplay && e.canSpeak) void voiceService.saySpanish(personalise(line.emma, e.name));
      if (line.reply) {
        setAwaiting(true);
      } else if (turn >= ex.turns.length - 1) {
        window.setTimeout(() => latest.current.finish(), 1400);
      } else {
        setTurn((i) => i + 1);
      }
    }, turn === 0 ? 350 : 900);
    return () => window.clearTimeout(t);
  }, [turn]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, awaiting]);

  const current = exercise.turns[turn];
  const reply = current?.reply;

  const options = useMemo(() => {
    if (!reply) return [];
    return shuffle([reply.hint, ...reply.options].map((o) => personalise(o, env.name)), seededRandom(hashString(`${exercise.id}:${turn}`)));
  }, [reply, env.name, exercise.id, turn]);

  const advance = () => {
    setAwaiting(false);
    setAttempts(0);
    if (turn >= exercise.turns.length - 1) window.setTimeout(() => latest.current.finish(), 900);
    else setTurn((i) => i + 1);
  };

  const handleReply = ({ text, transcripts }: Reply) => {
    if (!reply) return;
    const best = bestUtteranceMatch(transcripts, reply.answers, { name: env.name });
    const ok = best.score >= PASS;
    setMessages((m) => [...m, { role: 'player', text, status: ok ? 'ok' : 'fix' }]);
    if (ok) {
      soundService.play('correct');
      replied.current += 1;
      advance();
      return;
    }
    soundService.play('incorrect');
    mistakes.current += 1;
    const hint = detectCommonMistake(text);
    const model = personalise(hint?.corrected ?? reply.hint, env.name);
    const correction = hint
      ? `Almost! ❤️ ${hint.message} So: *${model}* Try it again.`
      : `Almost! ❤️ In Spanish we'd normally say something like: *${model}* Try it again.`;
    setMessages((m) => [...m, { role: 'correction', text: correction, translation: reply.english }]);
    if (env.canSpeak) void voiceService.say(`*${model}*`);
    setAttempts((a) => a + 1);
  };

  const useModel = () => {
    if (!reply) return;
    setMessages((m) => [...m, { role: 'player', text: personalise(reply.hint, env.name), status: 'ok' }]);
    advance();
  };

  const defaultMode = env.level <= 1 || !env.canListen || env.speakingPaused ? 'tap' : 'voice';

  return (
    <>
      <div ref={scroller} className="mx-auto w-full max-w-xl flex-1 overflow-y-auto px-4 pt-4 pb-6">
        <p className="mb-4 text-center text-xs font-extrabold tracking-[0.16em] text-ink-faint uppercase">💬 {exercise.title}</p>
        <div className="space-y-3">
          {messages.map((m, i) =>
            m.role === 'player' ? (
              <PlayerBubble key={i} text={m.text} status={m.status} />
            ) : (
              <EmmaBubble
                key={i}
                text={m.text}
                translation={m.translation}
                name={env.name}
                tone={m.role === 'correction' ? 'correction' : 'default'}
                state={m.role === 'correction' ? 'encouraging' : 'happy'}
                lang={m.role === 'correction' ? 'en' : 'es'}
                showAvatar={messages[i + 1]?.role === 'player' || i === messages.length - 1}
              />
            ),
          )}
          {typing && <TypingDots />}
        </div>
      </div>
      <ActionBar hidden={env.locked}>
        {awaiting && reply ? (
          <div className="space-y-2 pb-1">
            <ReplyComposer
              key={`${turn}-${attempts}`}
              onReply={handleReply}
              options={options}
              canListen={env.canListen && !env.speakingPaused}
              defaultMode={defaultMode}
            />
            {attempts >= 2 && (
              <Button variant="secondary" block onClick={useModel}>
                Use “{personalise(reply.hint, env.name)}”
              </Button>
            )}
          </div>
        ) : (
          <p className="py-4 text-center text-sm font-bold text-ink-faint">{typing ? 'Emma is typing…' : '…'}</p>
        )}
      </ActionBar>
    </>
  );
}
