'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ExerciseSession, type SessionResult } from '@/components/game/ExerciseSession';
import { SessionSkeleton } from '@/components/layout/SessionSkeleton';
import { useReadyPlayer } from '@/components/layout/useReadyPlayer';
import { useVoiceCapabilities } from '@/components/voice/hooks';
import { gameWords, MIN_GAME_WORDS, type WordLite } from '@/lib/review/build';
import { seededRandom, shuffle } from '@/lib/utils';
import { voiceService } from '@/services/voice/VoiceService';
import { playerLevel, useGameStore } from '@/store/gameStore';
import type { Exercise, TaggedExercise } from '@/types/curriculum';
import { GAME_BY_ID, MIN_CONVERSATIONS, MIN_SENTENCES, type GameDef, type GameId } from './catalog';
import { GameResults, recordGame, type GameOutcome, type GameSummary } from './GameResults';
import { GameIntro, GameLocked } from './GameShell';
import { ListenPickGame } from './ListenPickGame';
import { SpeedRoundGame } from './SpeedRoundGame';
import type { ArcadeProps } from './types';
import { VocabBlastGame } from './VocabBlastGame';
import { WordMatchGame } from './WordMatchGame';

const ARCADE: Partial<Record<GameId, (props: ArcadeProps) => React.ReactNode>> = {
  'word-match': WordMatchGame,
  'listen-pick': ListenPickGame,
  'speed-round': SpeedRoundGame,
  'vocab-blast': VocabBlastGame,
};

export function GameScreen({
  gameId,
  words,
  exercises,
}: {
  gameId: GameId;
  /** Curriculum words (for games built from lesson exercises). */
  words?: WordLite[];
  exercises?: Array<TaggedExercise<'order'> | TaggedExercise<'conversation'>>;
}) {
  const ready = useReadyPlayer();
  const caps = useVoiceCapabilities();
  const game = GAME_BY_ID.get(gameId)!;
  if (!ready || !caps.ready) return <SessionSkeleton label="Loading game" />;
  if (game.source === 'words') return <ArcadeGame game={game} canSpeak={caps.canSpeak} />;
  return <LessonGame game={game} words={words ?? []} exercises={exercises ?? []} />;
}

/** Intro → play → results loop shared by every game. */
function usePhases() {
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [seed, setSeed] = useState(0);
  const [summary, setSummary] = useState<GameSummary | null>(null);
  return {
    phase,
    seed,
    summary,
    start: () => {
      voiceService.unlock();
      setSummary(null);
      setSeed(Date.now());
      setPhase('play');
    },
    finish: (game: GameDef, outcome: GameOutcome) => {
      setSummary(recordGame(game, outcome));
      setPhase('done');
    },
  };
}

function ArcadeGame({ game, canSpeak }: { game: GameDef; canSpeak: boolean }) {
  const router = useRouter();
  const best = useGameStore((s) => s.gameBests[game.id]);
  const [pool] = useState(() => gameWords(useGameStore.getState().vocab));
  const { phase, seed, summary, start, finish } = usePhases();

  if (pool.length < MIN_GAME_WORDS) {
    return (
      <GameLocked
        game={game}
        message={`Games use words you’ve already met. You know ${pool.length} so far — ${MIN_GAME_WORDS - pool.length} more and you’re in!`}
        cta={{ href: '/learn', label: 'Continue learning' }}
      />
    );
  }
  if (game.audio && !canSpeak) {
    return (
      <GameLocked
        game={game}
        message="This game needs audio, and this browser doesn’t have a voice I can use. Try Safari or Chrome — or play Word Match instead."
        cta={{ href: '/play/word-match', label: 'Play Word Match' }}
      />
    );
  }
  if (phase === 'intro') return <GameIntro game={game} best={best} onStart={start} />;
  if (phase === 'done' && summary) return <GameResults game={game} summary={summary} onReplay={start} />;

  const Game = ARCADE[game.id]!;
  return <Game key={seed} game={game} pool={pool} seed={seed} onFinish={(outcome) => finish(game, outcome)} onClose={() => router.push('/review')} />;
}

const LESSON_GAME_SIZE: Partial<Record<GameId, number>> = { 'build-sentence': 6, 'conversation-challenge': 2 };

/** Games built from the exercises of lessons the player has finished. */
type LessonExercise = Exercise & { lessonId: string };

function LessonGame({ game, words, exercises }: { game: GameDef; words: WordLite[]; exercises: LessonExercise[] }) {
  const router = useRouter();
  const level = useGameStore(playerLevel);
  const completed = useGameStore((s) => s.completedLessons);
  const best = useGameStore((s) => s.gameBests[game.id]);
  const { phase, seed, summary, start, finish } = usePhases();

  const available = useMemo(() => exercises.filter((e) => completed[e.lessonId]), [exercises, completed]);
  const picked = useMemo(
    () => (seed ? shuffle(available, seededRandom(seed)).slice(0, LESSON_GAME_SIZE[game.id] ?? 5) : []),
    [available, seed, game.id],
  );

  const minimum = game.source === 'sentences' ? MIN_SENTENCES : MIN_CONVERSATIONS;
  if (available.length < minimum) {
    return (
      <GameLocked
        game={game}
        message={
          game.source === 'sentences'
            ? 'This game uses sentences from lessons you’ve finished. Complete a couple more lessons and it’s yours.'
            : 'This game uses the conversations from your lessons. Finish a lesson with a conversation and come back!'
        }
        cta={{ href: '/learn', label: 'Continue learning' }}
      />
    );
  }
  if (phase === 'intro') return <GameIntro game={game} best={best} onStart={start} />;
  if (phase === 'done' && summary) return <GameResults game={game} summary={summary} onReplay={start} />;

  const onFinish = (result: SessionResult) => {
    const correct = Math.round(result.accuracy * picked.length);
    finish(game, {
      score: correct * 10 + (result.perfect ? 20 : 0),
      correct,
      answered: picked.length,
      seconds: result.seconds,
      words: [],
      earlierXp: result.answersXp,
    });
  };

  return (
    <ExerciseSession
      key={seed}
      sessionKey={`${game.id}-${seed}`}
      exercises={picked}
      vocab={words}
      level={level}
      onFinish={onFinish}
      onExit={() => router.push('/review')}
    />
  );
}
