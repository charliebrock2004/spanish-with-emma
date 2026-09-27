import { describe, expect, it } from 'vitest';
import { difficultyShift, initialAdaptive, pushResult } from '@/lib/progress/adaptive';
import { addDays, daysBetween } from '@/lib/progress/dates';
import { computeJourney } from '@/lib/progress/journey';
import { isDue, isWeak, newVocabProgress, recordVocabAnswer, reviewQueue } from '@/lib/progress/srs';
import { initialStreak, recordStreakDay, streakStatus } from '@/lib/progress/streak';
import type { LessonSummary } from '@/types/curriculum';

describe('dates', () => {
  it('counts days across months', () => {
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('streak', () => {
  it('starts, extends and ignores same-day activity', () => {
    let s = recordStreakDay(initialStreak(), '2026-09-01');
    expect(s.event).toBe('started');
    s = recordStreakDay(s.state, '2026-09-01');
    expect(s.event).toBe('same-day');
    s = recordStreakDay(s.state, '2026-09-02');
    expect(s.event).toBe('extended');
    expect(s.state.current).toBe(2);
  });
  it('uses a freeze for one missed day', () => {
    let s = recordStreakDay(initialStreak(), '2026-09-01').state;
    s = recordStreakDay(s, '2026-09-02').state;
    const saved = recordStreakDay(s, '2026-09-04');
    expect(saved.event).toBe('saved');
    expect(saved.state.current).toBe(3);
    expect(saved.state.freezes).toBe(0);
    expect(saved.state.frozenDates).toEqual(['2026-09-03']);
  });
  it('restarts gently when too many days are missed', () => {
    const s = recordStreakDay(initialStreak(), '2026-09-01').state;
    const r = recordStreakDay(s, '2026-09-10');
    expect(r.event).toBe('restarted');
    expect(r.state.current).toBe(1);
    expect(r.state.longest).toBe(1);
  });
  it('earns a freeze every 7 days', () => {
    let s = { ...initialStreak(), freezes: 0 };
    for (let d = 1; d <= 7; d++) s = recordStreakDay(s, `2026-09-0${d}`).state;
    expect(s.freezes).toBe(1);
  });
  it('reports status for display', () => {
    const s = recordStreakDay(initialStreak(), '2026-09-01').state;
    expect(streakStatus(s, '2026-09-01').activeToday).toBe(true);
    expect(streakStatus(s, '2026-09-02').atRisk).toBe(true);
    expect(streakStatus(s, '2026-09-03').freezesNeeded).toBe(1);
    expect(streakStatus(s, '2026-09-09').lapsed).toBe(true);
  });
});

describe('spaced review', () => {
  const word = { id: 'comer', spanish: 'comer', english: 'to eat', category: 'verbs' as const, difficulty: 3 };
  it('raises mastery at most once per day', () => {
    let p = newVocabProgress(word);
    p = recordVocabAnswer(p, true, 1000, '2026-09-01');
    p = recordVocabAnswer(p, true, 2000, '2026-09-01');
    expect(p.mastery).toBe(1);
    p = recordVocabAnswer(p, true, 3000, '2026-09-02');
    expect(p.mastery).toBe(2);
  });
  it('remembers words you keep getting wrong', () => {
    let p = newVocabProgress(word);
    p = recordVocabAnswer(p, false, 1000, '2026-09-01');
    p = recordVocabAnswer(p, true, 2000, '2026-09-01');
    p = recordVocabAnswer(p, false, 3000, '2026-09-01');
    expect(isWeak(p)).toBe(true);
    expect(isDue(p, 3000)).toBe(true);
    expect(reviewQueue({ comer: p }, 4000).map((w) => w.id)).toEqual(['comer']);
  });
});

describe('adaptive difficulty', () => {
  it('gets harder when you are consistently right and easier when struggling', () => {
    let a = initialAdaptive();
    for (let i = 0; i < 10; i++) a = pushResult(a, true);
    expect(difficultyShift('auto', a)).toBe(1);
    let b = initialAdaptive();
    for (let i = 0; i < 10; i++) b = pushResult(b, i % 2 === 0 && i < 4);
    expect(difficultyShift('auto', b)).toBe(-1);
    expect(difficultyShift('normal', b)).toBe(0);
  });
});

describe('journey', () => {
  const lesson = (id: string, level: 1 | 2 | 3, order: number, index: number): LessonSummary => ({
    id, level, order, index, title: id, description: '', emoji: '', difficulty: 1,
    estimatedMinutes: 5, xpReward: 100, isMilestone: false, exerciseCount: 10, vocabCount: 5,
  });
  const lessons = [lesson('a1', 1, 1, 0), lesson('a2', 1, 2, 1), lesson('b1', 2, 1, 2), lesson('b2', 2, 2, 3), lesson('c1', 3, 1, 4)];
  const done = (level: 1 | 2 | 3) => ({ level, completedAt: 1, bestAccuracy: 1, perfect: true, attempts: 1, xpEarned: 10 });

  it('starts at the first lesson with everything else locked', () => {
    const j = computeJourney(lessons, {}, 1);
    expect(j.current?.id).toBe('a1');
    expect(j.lessons.find((l) => l.id === 'a2')?.status).toBe('locked');
    expect(j.lessons.find((l) => l.id === 'b1')?.status).toBe('locked');
  });
  it('unlocks the next level when a level is complete', () => {
    const j = computeJourney(lessons, { a1: done(1), a2: done(1) }, 1);
    expect(j.current?.id).toBe('b1');
    expect(j.levels[1].unlocked).toBe(true);
  });
  it('places experienced learners further along with earlier levels open', () => {
    const j = computeJourney(lessons, {}, 2);
    expect(j.current?.id).toBe('b1');
    expect(j.lessons.find((l) => l.id === 'a2')?.status).toBe('available');
    expect(j.lessons.find((l) => l.id === 'c1')?.status).toBe('locked');
  });
});
