import { describe, expect, it } from 'vitest';
import { COURSE } from '@/data/curriculum';
import { buildCurriculum } from '@/lib/curriculum/build';
import { checkTypedAnswer } from '@/lib/text/answer';
import { matchUtterance } from '@/lib/text/match';
import { toTiles } from '@/lib/text/normalize';

const built = buildCurriculum(COURSE);

describe('curriculum', () => {
  it('builds every level without errors', () => {
    expect(built.lessons.length).toBeGreaterThan(0);
    expect(built.levels.length).toBe(COURSE.length);
  });

  it('has unique exercise ids', () => {
    const ids = built.lessons.flatMap((l) => l.exercises.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every multiple-choice question at least two wrong options that differ from the answer', () => {
    for (const lesson of built.lessons) {
      for (const ex of lesson.exercises) {
        if (ex.type !== 'choice' && ex.type !== 'listen') continue;
        const answer = ex.type === 'choice' ? ex.answer : ex.audio;
        expect(ex.distractors.length, `${ex.id} distractors`).toBeGreaterThanOrEqual(2);
        for (const d of ex.distractors) {
          expect(d.toLowerCase(), `${ex.id}`).not.toBe(answer.toLowerCase());
        }
      }
    }
  });

  it('word-order tiles rebuild the answer', () => {
    for (const lesson of built.lessons) {
      for (const ex of lesson.exercises) {
        if (ex.type !== 'order') continue;
        const rebuilt = ex.tiles.join(' ');
        const result = checkTypedAnswer(rebuilt, [ex.answer, ...ex.alternatives], { lang: ex.lang, name: 'Charlie' });
        expect(result.correct, ex.id).toBe(true);
        expect(ex.tiles).toEqual(toTiles(ex.answer));
      }
    }
  });

  it('accepts the canonical answer of every translation', () => {
    for (const lesson of built.lessons) {
      for (const ex of lesson.exercises) {
        if (ex.type !== 'translate') continue;
        const lang = ex.from === 'en' ? 'es' : 'en';
        const canonical = ex.answers[0].replace('{name}', 'Charlie');
        expect(checkTypedAnswer(canonical, ex.answers, { lang, name: 'Charlie' }).correct, ex.id).toBe(true);
      }
    }
  });

  it('accepts the model answer of every speaking exercise and conversation reply', () => {
    for (const lesson of built.lessons) {
      for (const ex of lesson.exercises) {
        if (ex.type === 'speak') {
          const said = ex.spanish.replace('{name}', 'Charlie');
          const best = Math.max(...ex.accept.map((p) => matchUtterance(said, p, { name: 'Charlie' }).score));
          expect(best, ex.id).toBeGreaterThanOrEqual(0.95);
        }
        if (ex.type === 'conversation') {
          for (const turn of ex.turns) {
            if (!turn.reply) continue;
            const hint = turn.reply.hint.replace('{name}', 'Charlie');
            expect(hint.includes('{'), `${ex.id} hint must not contain wildcards`).toBe(false);
            const best = Math.max(...turn.reply.answers.map((p) => matchUtterance(hint, p, { name: 'Charlie' }).score));
            expect(best, `${ex.id}: "${hint}"`).toBeGreaterThanOrEqual(0.8);
            for (const wrong of turn.reply.options) {
              const worst = Math.max(...turn.reply.answers.map((p) => matchUtterance(wrong, p, { name: 'Charlie' }).score));
              expect(worst, `${ex.id}: wrong option "${wrong}" must not be accepted`).toBeLessThan(0.75);
            }
          }
        }
      }
    }
  });

  it('links sentences to vocabulary for spaced review', () => {
    const linked = built.lessons.flatMap((l) => l.exercises).filter((e) => e.type !== 'tip' && e.vocabIds.length > 0);
    const total = built.lessons.flatMap((l) => l.exercises).filter((e) => e.type !== 'tip').length;
    expect(linked.length / total).toBeGreaterThan(0.8);
  });
});
