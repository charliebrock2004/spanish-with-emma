import type { StreakState } from '@/types/progress';
import { addDays, daysBetween } from './dates';

export const MAX_FREEZES = 2;

export const initialStreak = (): StreakState => ({
  current: 0,
  longest: 0,
  lastActiveDate: null,
  // One freeze to start with — missing a day shouldn't wipe out a new habit.
  freezes: 1,
  frozenDates: [],
});

export type StreakEvent = 'started' | 'extended' | 'same-day' | 'saved' | 'restarted';

export interface StreakUpdate {
  state: StreakState;
  event: StreakEvent;
  freezesUsed: number;
  earnedFreeze: boolean;
}

/**
 * Registers a completed session on `today`. Missed days are covered by streak
 * freezes when available; otherwise the streak restarts (the longest streak is
 * kept forever).
 */
export function recordStreakDay(prev: StreakState, today: string): StreakUpdate {
  const state: StreakState = { ...prev, frozenDates: [...prev.frozenDates] };
  if (state.lastActiveDate === today) return { state, event: 'same-day', freezesUsed: 0, earnedFreeze: false };

  let event: StreakEvent;
  let freezesUsed = 0;
  if (!state.lastActiveDate || state.current === 0) {
    state.current = 1;
    event = state.longest > 0 ? 'restarted' : 'started';
  } else {
    const gap = daysBetween(state.lastActiveDate, today);
    if (gap <= 0) {
      // Clock moved backwards — treat as the same day.
      return { state, event: 'same-day', freezesUsed: 0, earnedFreeze: false };
    }
    const missed = gap - 1;
    if (missed === 0) {
      state.current += 1;
      event = 'extended';
    } else if (missed <= state.freezes) {
      freezesUsed = missed;
      state.freezes -= missed;
      for (let i = 1; i <= missed; i++) state.frozenDates.push(addDays(state.lastActiveDate, i));
      state.frozenDates = state.frozenDates.slice(-10);
      state.current += 1;
      event = 'saved';
    } else {
      state.current = 1;
      event = 'restarted';
    }
  }

  let earnedFreeze = false;
  if (state.current > 0 && state.current % 7 === 0 && state.freezes < MAX_FREEZES) {
    state.freezes += 1;
    earnedFreeze = true;
  }
  state.lastActiveDate = today;
  state.longest = Math.max(state.longest, state.current);
  return { state, event, freezesUsed, earnedFreeze };
}

export interface StreakStatus {
  /** The number to show (0 when the streak has lapsed and can't be saved). */
  display: number;
  activeToday: boolean;
  /** Played yesterday (or covered by freezes) but not yet today. */
  atRisk: boolean;
  /** Will a freeze be needed to keep it going if the player plays today? */
  freezesNeeded: number;
  lapsed: boolean;
}

export function streakStatus(state: StreakState, today: string): StreakStatus {
  if (!state.lastActiveDate || state.current === 0) {
    return { display: 0, activeToday: false, atRisk: false, freezesNeeded: 0, lapsed: false };
  }
  const gap = daysBetween(state.lastActiveDate, today);
  if (gap <= 0) return { display: state.current, activeToday: true, atRisk: false, freezesNeeded: 0, lapsed: false };
  const missed = gap - 1;
  if (missed === 0) return { display: state.current, activeToday: false, atRisk: true, freezesNeeded: 0, lapsed: false };
  if (missed <= state.freezes) {
    return { display: state.current, activeToday: false, atRisk: true, freezesNeeded: missed, lapsed: false };
  }
  return { display: 0, activeToday: false, atRisk: false, freezesNeeded: 0, lapsed: true };
}
