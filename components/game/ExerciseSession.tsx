'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { comboLine, emmaLine, emmaLineFor } from '@/components/emma/lines';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { difficultyProfile, difficultyShift, showPronunciationFor, type DifficultyProfile } from '@/lib/progress/adaptive';
import { reviewExercise } from '@/lib/curriculum/generate';
import { weakWords, type VocabLike } from '@/lib/progress/srs';
import { answerReward, comboMultiplier, type AnswerKind, type Reward } from '@/lib/game/economy';
import { haptics } from '@/services/haptics';
import { soundService } from '@/services/sound/SoundService';
import { voiceService } from '@/services/voice/VoiceService';
import { useGameStore } from '@/store/gameStore';
import { useNow } from '@/lib/hooks/useNow';
import { useVoiceCapabilities } from '@/components/voice/hooks';
import { uid } from '@/lib/utils';
import type { Exercise, LevelId, MistakeType } from '@/types/curriculum';
import { FeedbackPanel, type Feedback, type FeedbackTier } from './FeedbackPanel';
import { LessonHeader } from './LessonHeader';
import { useActivityTimer } from './useActivityTimer';
import type { ExerciseEnv, ExerciseResult } from './types';
import { ChoiceExercise } from './exercises/ChoiceExercise';
import { ConversationExercise } from './exercises/ConversationExercise';
import { IntroCard, TipCard } from './exercises/IntroCard';
import { ListenExercise } from './exercises/ListenExercise';
import { MatchExercise } from './exercises/MatchExercise';
import { SpeakExercise } from './exercises/SpeakExercise';
import { TranslateExercise } from './exercises/TranslateExercise';
import { WordOrderExercise } from './exercises/WordOrderExercise';

export const MAX_HEARTS = 5;

interface QueueItem {
  exercise: Exercise;
  attempt: number;
  key: string;
}

export interface SessionResult {
  /** Unique per play-through (the reward ledger key). */
  sessionId: string;
  accuracy: number;
  perfect: boolean;
  mistakes: number;
  seconds: number;
  /** XP and coins earned by answers (already saved). */
  answers: Reward;
  /** Total XP when the session started. */
  xpBefore: number;
  bestCombo: number;
  /** Exercises answered correctly at some point (resolves replayed mistakes). */
  correctExerciseIds: string[];
}

interface Props {
  sessionKey: string;
  exercises: Exercise[];
  vocab: VocabLike[];
  level: LevelId;
  lessonId?: string;
  useHearts?: boolean;
  injectReview?: boolean;
  onFinish: (result: SessionResult) => void;
  onExit: () => void;
  onOutOfHearts?: () => void;
  /** Start the same session again (e.g. after running out of hearts). */
  onRestart?: () => void;
}

function promptFor(e: Exercise): string {
  switch (e.type) {
    case 'choice':
      return e.display ?? e.prompt.replace(/\*/g, '');
    case 'translate':
      return e.text;
    case 'order':
      return e.prompt;
    case 'listen':
      return `Listening: ${e.audio}`;
    case 'speak':
      return e.spanish;
    case 'conversation':
      return e.title;
    case 'match':
      return 'Match the pairs';
    default:
      return '';
  }
}

/** Exercises the learner answers (intro and tip cards are just read). */
const isAnswerable = (e: Exercise) => e.type !== 'intro' && e.type !== 'tip';

/** The last thing to answer in the queue right now — the lesson's final challenge. */
const isFinalAt = (queue: QueueItem[], index: number) =>
  Boolean(queue[index] && isAnswerable(queue[index].exercise)) && queue.slice(index + 1).every((it) => !isAnswerable(it.exercise));

function defaultMistakeType(e: Exercise): MistakeType {
  if (e.type === 'order') return 'word-order';
  if (e.type === 'listen') return 'listening';
  if (e.type === 'speak') return 'pronunciation';
  if (e.type === 'choice' && (e.variant === 'fill' || e.variant === 'question')) return 'grammar';
  return 'vocabulary';
}

/** Weak words from earlier lessons, slipped into this one as quick reviews. */
function withWeakWords(exercises: Exercise[], sessionKey: string, exclude: string[]): Exercise[] {
  const { vocab } = useGameStore.getState();
  const pool = Object.values(vocab);
  if (pool.length < 4) return exercises;
  const weak = weakWords(vocab, { limit: 2, exclude });
  if (weak.length === 0) return exercises;
  const extra = weak.map((w, i) => reviewExercise(w, pool, i % 2 === 0 ? 'recall' : 'meaning', `${sessionKey}-${i}`));
  const out = [...exercises];
  const positions = [Math.max(3, Math.floor(out.length * 0.4)), Math.max(5, Math.floor(out.length * 0.75))];
  extra.forEach((ex, i) => out.splice(Math.min(out.length, positions[i] + i), 0, ex));
  return out;
}

export function ExerciseSession({
  sessionKey,
  exercises,
  vocab,
  level,
  lessonId,
  useHearts = false,
  injectReview = false,
  onFinish,
  onExit,
  onOutOfHearts,
  onRestart,
}: Props) {
  const name = useGameStore((s) => s.profile.name);
  const settings = useGameStore((s) => s.settings);
  const storeVocab = useGameStore((s) => s.vocab);
  const recordAnswer = useGameStore((s) => s.recordAnswer);
  const recordVocab = useGameStore((s) => s.recordVocab);
  const markWordsSeen = useGameStore((s) => s.markWordsSeen);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const setAnnouncedShift = useGameStore((s) => s.setAnnouncedShift);

  const vocabMap = useMemo(() => new Map(vocab.map((v) => [v.id, v])), [vocab]);

  // Difficulty is decided once, at the start of the session.
  const [profile] = useState<DifficultyProfile>(() => {
    const { settings: s, adaptive } = useGameStore.getState();
    return difficultyProfile(difficultyShift(s.difficulty, adaptive), level);
  });
  const [banner, setBanner] = useState<string | null>(() => {
    const { settings: s, adaptive } = useGameStore.getState();
    if (s.difficulty !== 'auto') return null;
    const shift = difficultyShift('auto', adaptive);
    if (shift === adaptive.announced || shift === 0) return null;
    return emmaLine(shift > 0 ? 'harder' : 'easier');
  });
  useEffect(() => {
    if (!banner) return;
    const { adaptive } = useGameStore.getState();
    setAnnouncedShift(difficultyShift('auto', adaptive));
    const t = window.setTimeout(() => setBanner(null), 5000);
    return () => window.clearTimeout(t);
  }, [banner, setAnnouncedShift]);

  const [queue, setQueue] = useState<QueueItem[]>(() => {
    const list = injectReview ? withWeakWords(exercises, sessionKey, vocab.map((v) => v.id)) : exercises;
    return list.map((exercise) => ({ exercise, attempt: 0, key: `${exercise.id}:0` }));
  });
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [outOfHearts, setOutOfHearts] = useState(false);
  const caps = useVoiceCapabilities();

  const stats = useRef({
    started: 0,
    answered: new Set<string>(),
    firstTryCorrect: new Set<string>(),
    everCorrect: new Set<string>(),
    mistakes: 0,
    xp: 0,
    coins: 0,
    run: 0,
    bestRun: 0,
    hadMistake: new Set<string>(),
  });
  const [sessionId] = useState(() => uid('s'));
  const [xpBefore] = useState(() => useGameStore.getState().xp);
  const [combo, setCombo] = useState(0);
  /** Right answers so far — each one sweeps a glint across the progress bar. */
  const [rightAnswers, setRightAnswers] = useState(0);
  const requeued = useRef<string | null>(null);
  const finished = useRef(false);
  /** The queue item last answered — stops a double tap from counting twice. */
  const lastAnswered = useRef<string | null>(null);

  useEffect(() => {
    stats.current.started = Date.now();
  }, []);


  useActivityTimer(!outOfHearts && index < queue.length);

  // Achievements earned mid-lesson are celebrated on the results screen instead.
  const setToastsPaused = useGameStore((s) => s.setToastsPaused);
  useEffect(() => {
    setToastsPaused(true, 'session');
    return () => setToastsPaused(false, 'session');
  }, [setToastsPaused]);

  const current = queue[index];
  const total = queue.length;
  // Only a real lesson has a finale worth marking (not a two-question review).
  const isFinal = total >= 5 && isFinalAt(queue, index);

  // While the player works on this one, fetch what Emma will say next so it starts straight away.
  const upcoming = queue[index + 1]?.exercise;
  const upcomingLine =
    upcoming?.type === 'intro'
      ? (upcoming.lines?.length ? upcoming.lines : [`*${upcoming.spanish}* — ${upcoming.english}.`]).join(' ')
      : upcoming?.type === 'listen'
        ? `*${upcoming.audio}*`
        : null;
  useEffect(() => {
    if (!upcomingLine || !settings.autoplayAudio) return;
    const t = window.setTimeout(() => voiceService.prefetch(upcomingLine.replace(/\{name\}/g, name), {}), 600);
    return () => window.clearTimeout(t);
  }, [upcomingLine, settings.autoplayAudio, name]);

  // The last question gets its own little sting.
  const finalKey = isFinal ? current?.key : undefined;
  useEffect(() => {
    if (finalKey) soundService.play('final');
  }, [finalKey]);

  // All done → report once.
  useEffect(() => {
    if (index < total || finished.current || total === 0) return;
    finished.current = true;
    voiceService.stop();
    const s = stats.current;
    const answerable = s.answered.size;
    onFinish({
      sessionId,
      accuracy: answerable ? s.firstTryCorrect.size / answerable : 1,
      perfect: s.mistakes === 0,
      mistakes: s.mistakes,
      seconds: Math.round((Date.now() - s.started) / 1000),
      answers: { xp: s.xp, coins: s.coins },
      xpBefore,
      bestCombo: s.bestRun,
      correctExerciseIds: [...s.everCorrect],
    });
  }, [index, total, onFinish, sessionId, xpBefore]);

  const now = useNow();
  const speakingPaused = Boolean(settings.speakingPausedUntil && now && settings.speakingPausedUntil > now);

  const vocabFor = useCallback(
    (ids: string[]): VocabLike[] =>
      ids
        .map((id) => vocabMap.get(id) ?? storeVocab[id])
        .filter((v): v is VocabLike => Boolean(v)),
    [vocabMap, storeVocab],
  );

  const advance = useCallback(() => {
    setFeedback(null);
    requeued.current = null;
    voiceService.stop();
    setIndex((i) => i + 1);
  }, []);

  const handleDone = useCallback(() => {
    const exercise = queue[index]?.exercise;
    if (exercise?.type === 'intro') markWordsSeen(vocabFor(exercise.vocabIds));
    soundService.play('tap');
    advance();
  }, [queue, index, markWordsSeen, vocabFor, advance]);

  const handleAnswer = useCallback(
    (result: ExerciseResult) => {
      const item = queue[index];
      if (!item || feedback || lastAnswered.current === item.key) return;
      lastAnswered.current = item.key;
      const exercise = item.exercise;
      const s = stats.current;
      const firstAnswer = !s.answered.has(exercise.id);
      s.answered.add(exercise.id);
      const selfPaced = exercise.type === 'speak' || exercise.type === 'match' || exercise.type === 'conversation';
      const wasFinal = queue.length >= 5 && isFinalAt(queue, index);
      const statsBefore = useGameStore.getState().stats;
      const firstWord = result.correct && exercise.type === 'speak' && statsBefore.speakingPassed + statsBefore.speakingTyped === 0;

      // Price the answer: speaking is worth most, a retry least; combos multiply.
      let reward: Reward = { xp: 0, coins: 0 };
      if (result.correct) {
        s.run += 1;
        s.bestRun = Math.max(s.bestRun, s.run);
        const kind: AnswerKind =
          exercise.type === 'speak' ? (result.speaking?.typed ? 'typed-speaking' : 'speaking') : s.hadMistake.has(exercise.id) ? 'retry' : 'normal';
        reward = answerReward(kind, s.run);
        // A conversation exercise is several replies in one.
        if (result.xp) reward = { ...reward, xp: Math.round(reward.xp * Math.max(1, result.xp / 10)) };
        s.everCorrect.add(exercise.id);
        if (firstAnswer && item.attempt === 0) s.firstTryCorrect.add(exercise.id);
      } else {
        s.mistakes += 1;
        s.hadMistake.add(exercise.id);
        s.run = 0;
      }
      const runNow = s.run;
      setCombo(runNow);

      // Persist: stats, XP, spaced review and the mistake log.
      const words = vocabFor(exercise.vocabIds);
      if (result.vocabResults) {
        recordVocab(
          result.vocabResults
            .map((r) => ({ word: vocabFor([r.id])[0], correct: r.correct }))
            .filter((r): r is { word: VocabLike; correct: boolean } => Boolean(r.word)),
        );
      }
      const earned = recordAnswer({
        correct: result.correct,
        vocab: result.vocabResults ? [] : words,
        skill: exercise.skill,
        reward,
        combo: runNow,
        listening: exercise.type === 'listen',
        speaking: result.speaking ? { passed: result.correct, score: result.speaking.score, typed: result.speaking.typed } : undefined,
        mistake: result.correct
          ? undefined
          : {
              type: result.mistakeType ?? defaultMistakeType(exercise),
              prompt: promptFor(exercise),
              expected: result.expected,
              given: result.given,
              lessonId,
              exercise: exercise.type === 'conversation' ? undefined : exercise,
            },
      });
      s.xp += earned.xp;
      s.coins += earned.coins;

      // Hearts and another chance later in the session.
      const losesHeart = useHearts && !result.correct && !selfPaced;
      if (losesHeart) setHearts((h) => Math.max(0, h - 1));
      if (!result.correct && !selfPaced && item.attempt < (profile.extraPractice ? 2 : 1)) {
        const key = `${exercise.id}:${item.attempt + 1}`;
        requeued.current = key;
        setQueue((q) => [...q, { exercise, attempt: item.attempt + 1, key }]);
      }

      // Emma's reaction — sized to the moment (see FeedbackTier).
      let title: string;
      let note: string | undefined;
      let badge: string | undefined;
      const comboStep = result.correct ? comboLine(runNow) : null;
      const spoken = exercise.type === 'speak' && !result.speaking?.typed;
      let tier: FeedbackTier;
      if (result.correct) {
        tier = firstWord || wasFinal ? 'milestone' : comboStep ? (runNow >= 10 ? 'fire' : 'combo') : 'correct';
        if (firstWord) {
          badge = 'Your first Spanish word';
          title = exercise.success ?? emmaLine('firstWord');
        } else if (wasFinal) {
          badge = 'Final challenge';
          title = comboStep ?? emmaLine('finalDone');
        } else if (comboStep) {
          title = comboStep;
        } else if (spoken) {
          title = exercise.success ?? emmaLine(result.speaking && result.speaking.score >= 0.9 ? 'speakGreat' : 'speakGood');
        } else if (exercise.type === 'conversation') {
          title = '¡Qué bien! Great conversation.';
        } else if (exercise.type === 'match') {
          title = emmaLine('correct');
        } else if (result.nearMiss === 'accents') {
          title = emmaLine('accents');
        } else if (result.nearMiss === 'typo') {
          title = emmaLine('typo');
        } else if (s.hadMistake.has(exercise.id)) {
          title = emmaLine('correctAfterMistake');
        } else {
          title = s.run >= 4 && s.run % 2 === 0 ? emmaLine('correctStreak') : emmaLine('correct');
        }
        // Sound and touch escalate with the tier; a spoken answer has its own warmer chord.
        soundService.play(spoken ? 'speakSuccess' : 'correct');
        if (comboStep) window.setTimeout(() => soundService.playCombo(comboMultiplier(runNow)), 180);
        if (tier === 'milestone') window.setTimeout(() => soundService.play('milestone'), comboStep ? 420 : 200);
        haptics.play(tier === 'milestone' ? 'milestone' : comboStep ? 'combo' : 'success');
        setRightAnswers((n) => n + 1);
      } else {
        const almost = Boolean(result.nearMiss) || (result.speaking?.score ?? 0) >= 0.6;
        tier = almost ? 'almost' : 'wrong';
        soundService.play('incorrect');
        haptics.play('soft');
        if (exercise.type === 'speak') {
          title = result.speaking?.typed ? emmaLine('incorrect') : emmaLine('speakGiveUp');
        } else if (exercise.type === 'conversation') {
          title = 'Nice chat! A couple of things to practise.';
        } else if (exercise.type === 'match') {
          title = 'All matched — a few mix-ups on the way.';
        } else {
          title = emmaLine('incorrect');
        }
        note = result.correction ?? exercise.explanation;
      }

      const showExpected =
        exercise.type !== 'match' && exercise.type !== 'conversation' && (!result.correct || Boolean(result.nearMiss)) && result.expected;

      setFeedback({
        correct: result.correct,
        tier,
        badge,
        title,
        expected: showExpected ? result.expected : undefined,
        expectedLang: result.expectedLang,
        note: result.correct ? undefined : note,
        xp: earned.xp,
        coins: earned.coins,
        boosted: earned.boostXp > 0,
        combo: result.correct ? runNow : 0,
        comboStep: Boolean(comboStep),
        almost: tier === 'almost',
        canRetry: Boolean(result.retryable && !result.correct && (!useHearts || hearts - (losesHeart ? 1 : 0) > 0)),
      });

      // Hear the right answer (reinforces pronunciation) — Emma doesn't repeat what the player just said.
      const speakAnswer =
        settings.autoplayAudio &&
        result.expectedLang === 'es' &&
        result.expected &&
        exercise.type !== 'speak' &&
        exercise.type !== 'conversation' &&
        exercise.type !== 'listen';
      if (speakAnswer) {
        const spoken = exercise.type === 'choice' && exercise.variant === 'fill' && exercise.audio ? exercise.audio : result.expected;
        void voiceService.saySpanish(spoken.replace(/\{name\}/g, name));
      }
    },
    [queue, index, feedback, vocabFor, recordAnswer, recordVocab, lessonId, useHearts, profile.extraPractice, hearts, settings.autoplayAudio, name],
  );

  const handleContinue = useCallback(() => {
    if (useHearts && hearts <= 0) {
      setFeedback(null);
      voiceService.stop();
      setOutOfHearts(true);
      onOutOfHearts?.();
      return;
    }
    soundService.play('tap');
    advance();
  }, [useHearts, hearts, advance, onOutOfHearts]);

  const handleRetry = useCallback(() => {
    setFeedback(null);
    lastAnswered.current = null;
    voiceService.stop();
    const drop = requeued.current;
    requeued.current = null;
    const stamp = Date.now();
    setQueue((q) =>
      q
        .filter((it) => it.key !== drop)
        .map((it, i) => (i === index ? { ...it, attempt: it.attempt + 1, key: `${it.exercise.id}:retry${stamp}` } : it)),
    );
  }, [index]);

  const env: ExerciseEnv = useMemo(() => {
    const exercise = current?.exercise;
    const isNewWord = exercise?.type === 'intro' || Boolean(exercise && exercise.vocabIds.some((id) => !storeVocab[id]?.timesCorrect));
    return {
      name,
      level,
      profile,
      showPronunciation: showPronunciationFor(settings.showPronunciation, level, isNewWord),
      canListen: caps.canListen,
      canSpeak: caps.canSpeak,
      speakingPaused,
      autoplay: settings.autoplayAudio,
      locked: Boolean(feedback),
    };
    // storeVocab changes after every answer; only re-evaluate per exercise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key, name, level, profile, settings.showPronunciation, settings.autoplayAudio, caps, speakingPaused, feedback]);

  const onPauseSpeaking = useCallback(() => updateSettings({ speakingPausedUntil: Date.now() + 60 * 60 * 1000 }), [updateSettings]);

  const progress = total ? Math.min(1, (index + (feedback ? 1 : 0)) / total) : 0;

  const renderExercise = () => {
    if (!current) return null;
    const common = { env, onAnswer: handleAnswer, onDone: handleDone, onPauseSpeaking };
    const ex = current.exercise;
    switch (ex.type) {
      case 'intro':
        return <IntroCard key={current.key} exercise={ex} {...common} />;
      case 'tip':
        return <TipCard key={current.key} exercise={ex} {...common} />;
      case 'choice':
        return <ChoiceExercise key={current.key} exercise={ex} {...common} />;
      case 'translate':
        return <TranslateExercise key={current.key} exercise={ex} {...common} />;
      case 'order':
        return <WordOrderExercise key={current.key} exercise={ex} {...common} />;
      case 'listen':
        return <ListenExercise key={current.key} exercise={ex} {...common} />;
      case 'speak':
        return <SpeakExercise key={current.key} exercise={ex} {...common} />;
      case 'match':
        return <MatchExercise key={current.key} exercise={ex} {...common} />;
      case 'conversation':
        return <ConversationExercise key={current.key} exercise={ex} {...common} />;
    }
  };

  return (
    <div className="paper flex h-dvh flex-col overflow-hidden">
      <LessonHeader progress={progress} hearts={hearts} combo={combo} glint={rightAnswers} onClose={() => setConfirmExit(true)} showHearts={useHearts} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {banner && (
          <div className="mx-auto mt-2 w-full max-w-xl px-4">
            <p className="flex animate-pop items-center gap-2 rounded-2xl bg-sun-light px-4 py-2.5 text-sm font-bold text-honey-dark" role="status">
              <EmmaAvatar size={28} animated={false} decorative />
              {banner}
            </p>
          </div>
        )}
        {current?.exercise.isReview && (
          <p className="mx-auto mt-3 inline-flex self-center rounded-full bg-sky-light px-3 py-1 text-xs font-extrabold tracking-wide text-[#3d6a8c] uppercase">
            🔁 Quick review
          </p>
        )}
        {current && current.attempt > 0 && !current.exercise.isReview && !isFinal && (
          <p className="mx-auto mt-3 inline-flex self-center rounded-full bg-honey-light px-3 py-1 text-xs font-extrabold tracking-wide text-honey-dark uppercase">
            ↻ One more try
          </p>
        )}
        {isFinal && current && (
          <div key={`final:${current.key}`} className="mx-auto mt-3 flex flex-col items-center gap-1 self-center text-center" role="status">
            <p className="inline-flex animate-slam items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-black tracking-[0.16em] text-cream uppercase shadow-card">
              <span className="text-sun" aria-hidden>
                ★
              </span>
              Final challenge
            </p>
            <p className="animate-enter text-sm font-bold text-ink-soft [animation-delay:250ms]">{emmaLineFor('finalChallenge', current.key)}</p>
          </div>
        )}
        {renderExercise()}
      </div>

      {feedback && <FeedbackPanel feedback={feedback} name={name} onContinue={handleContinue} onRetry={handleRetry} />}

      <Sheet open={confirmExit} onClose={() => setConfirmExit(false)} label="Leave this lesson?">
        <div className="flex items-center gap-3">
          <EmmaAvatar state="confused" size={56} />
          <div>
            <h2 className="font-display text-2xl font-semibold">Leave already?</h2>
            <p className="text-ink-soft">The XP and coins you&rsquo;ve earned are saved.</p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <Button block size="lg" onClick={() => setConfirmExit(false)}>
            Keep learning
          </Button>
          <Button
            block
            size="lg"
            variant="secondary"
            onClick={() => {
              voiceService.stop();
              onExit();
            }}
          >
            Leave
          </Button>
        </div>
      </Sheet>

      <Sheet open={outOfHearts} onClose={() => {}} dismissible={false} label="Out of hearts">
        <div className="text-center">
          <EmmaAvatar state="encouraging" size={88} className="mx-auto" />
          <h2 className="mt-4 font-display text-2xl font-semibold">Let&rsquo;s take a breather</h2>
          <p className="mt-2 text-ink-soft">
            That one was tricky — mistakes are exactly how we learn. Your XP is safe, and I&rsquo;ve saved the words you missed for review.
          </p>
        </div>
        <div className="mt-6 space-y-3">
          <Button block size="lg" onClick={() => (onRestart ? onRestart() : onExit())}>
            Try the lesson again
          </Button>
          <Button block size="lg" variant="secondary" onClick={() => onExit()}>
            Back to the map
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
