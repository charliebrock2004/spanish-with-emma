import type { DifficultyProfile } from '@/lib/progress/adaptive';
import type { Exercise, LevelId, MistakeType } from '@/types/curriculum';

export interface ExerciseResult {
  correct: boolean;
  /** What the player answered (for the mistake log). */
  given: string;
  /** The correct answer to show. */
  expected: string;
  /** Language of `expected` — Spanish answers are read aloud in feedback. */
  expectedLang: 'es' | 'en';
  nearMiss?: 'accents' | 'typo';
  mistakeType?: MistakeType;
  /** A specific correction (e.g. "yo gusto" → "me gusta"), Emma-markup. */
  correction?: string;
  speaking?: { score: number; typed: boolean };
  /** Allow an immediate retry after a wrong typed answer. */
  retryable?: boolean;
  /** Per-word outcomes for multi-part exercises (match, conversation). */
  vocabResults?: Array<{ id: string; correct: boolean }>;
  /** XP override for multi-part exercises. */
  xp?: number;
  /** Skip the feedback panel (the exercise already showed its own). */
  silent?: boolean;
}

export interface ExerciseEnv {
  name: string;
  level: LevelId;
  profile: DifficultyProfile;
  showPronunciation: boolean;
  canListen: boolean;
  canSpeak: boolean;
  speakingPaused: boolean;
  autoplay: boolean;
  /** Feedback is showing — lock inputs. */
  locked: boolean;
}

export interface ExerciseProps<E extends Exercise = Exercise> {
  exercise: E;
  env: ExerciseEnv;
  onAnswer: (result: ExerciseResult) => void;
  onDone: () => void;
  onPauseSpeaking: () => void;
}
