import type { LevelId } from '@/types/curriculum';
import type { AdaptiveState } from '@/types/progress';
import type { DifficultySetting } from '@/types/settings';

/**
 * Basic adaptive difficulty: a rolling window of recent answers nudges the
 * game easier or harder. The player can also pin a difficulty in Settings.
 */

export type DifficultyShift = -1 | 0 | 1;

const WINDOW = 20;
const MIN_SAMPLE = 8;

export const initialAdaptive = (): AdaptiveState => ({ recent: [], announced: 0 });

export function pushResult(state: AdaptiveState, correct: boolean): AdaptiveState {
  return { ...state, recent: [...state.recent, correct ? 1 : 0].slice(-WINDOW) };
}

export function recentAccuracy(state: AdaptiveState): number | null {
  if (state.recent.length < MIN_SAMPLE) return null;
  return state.recent.reduce((a, b) => a + b, 0) / state.recent.length;
}

export function difficultyShift(setting: DifficultySetting, state: AdaptiveState): DifficultyShift {
  if (setting === 'easier') return -1;
  if (setting === 'harder') return 1;
  if (setting === 'normal') return 0;
  const accuracy = recentAccuracy(state);
  if (accuracy === null) return 0;
  if (accuracy >= 0.9) return 1;
  if (accuracy <= 0.6) return -1;
  return 0;
}

export interface DifficultyProfile {
  shift: DifficultyShift;
  /** Options shown in multiple choice (answer included). */
  choiceOptions: number;
  /** Extra decoy tiles in word-order exercises. */
  orderDistractors: number;
  /** Offer a word bank instead of free typing for translations. */
  wordBank: boolean;
  /** Listening exercises ask you to type what you heard. */
  dictation: boolean;
  /** Offer hint buttons. */
  hints: boolean;
  /** Re-queue missed exercises twice instead of once. */
  extraPractice: boolean;
  /** Multiplies Emma's speech rate. */
  rateFactor: number;
}

export function difficultyProfile(shift: DifficultyShift, level: LevelId): DifficultyProfile {
  const base: DifficultyProfile = {
    shift,
    choiceOptions: level === 1 ? 3 : 4,
    orderDistractors: level === 1 ? 0 : level <= 3 ? 1 : 2,
    wordBank: level === 1,
    dictation: level >= 4,
    hints: true,
    extraPractice: false,
    rateFactor: 1,
  };
  if (shift < 0) {
    return {
      ...base,
      choiceOptions: 3,
      orderDistractors: 0,
      wordBank: true,
      dictation: false,
      extraPractice: true,
      rateFactor: 0.85,
    };
  }
  if (shift > 0) {
    return {
      ...base,
      choiceOptions: level === 1 ? 4 : 5,
      orderDistractors: base.orderDistractors + 1,
      wordBank: false,
      dictation: level >= 2,
      hints: level <= 2,
      rateFactor: 1.05,
    };
  }
  return base;
}

/** Whether to show phonetic spellings — generous early on, fading out later. */
export function showPronunciationFor(
  setting: 'auto' | 'always' | 'never',
  level: LevelId,
  isNewWord: boolean,
): boolean {
  if (setting === 'always') return true;
  if (setting === 'never') return false;
  if (level <= 2) return true;
  if (level <= 4) return isNewWord;
  return false;
}
