import { describe, expect, it } from 'vitest';
import { SCENARIOS, SCENARIOS_BY_ID } from '@/data/conversations/scenarios';
import { looksEnglish, respondGuided, startGuided } from '@/lib/conversation/guided';

const meet = SCENARIOS_BY_ID.get('meet-emma')!;

describe('guided conversations', () => {
  it('every scenario is well-formed', () => {
    for (const s of SCENARIOS) {
      expect(s.nodes[s.start], `${s.id} start`).toBeTruthy();
      for (const [id, node] of Object.entries(s.nodes)) {
        for (const a of node.answers ?? []) expect(s.nodes[a.next], `${s.id}.${id} → ${a.next}`).toBeTruthy();
        if (node.next) expect(s.nodes[node.next], `${s.id}.${id} next`).toBeTruthy();
        if (node.answers?.length) expect(node.hint, `${s.id}.${id} needs a hint`).toBeTruthy();
      }
    }
  });

  it('remembers what the player says (the Escocia example)', () => {
    let { state } = startGuided(meet, 'Charlie');
    let turn = respondGuided(meet, state, ['Me llamo Charlie'], 'Charlie');
    expect(turn.lines[0].spanish).toBe('¡Encantada, Charlie!');
    state = turn.state;
    turn = respondGuided(meet, state, ['Estoy bien'], 'Charlie');
    state = turn.state;
    turn = respondGuided(meet, state, ['Soy de Escocia'], 'Charlie');
    state = turn.state;
    turn = respondGuided(meet, state, ['Vivo en Escocia'], 'Charlie');
    expect(turn.lines.map((l) => l.spanish)).toEqual(['¡Ah, Escocia!', '¿Te gusta vivir allí?']);
    state = turn.state;
    turn = respondGuided(meet, state, ['Sí, me gusta mucho'], 'Charlie');
    expect(turn.lines[0].spanish).toContain('Escocia');
  });

  it('corrects common mistakes gently', () => {
    const food = SCENARIOS_BY_ID.get('food-drink')!;
    const { state } = startGuided(food, 'Charlie');
    const turn = respondGuided(food, state, ['Yo gusto pizza'], 'Charlie');
    expect(turn.understood).toBe(true);
    expect(turn.correction?.corrected).toBe('Me gusta la pizza.');
  });

  it('asks for Spanish when the player answers in English, then simplifies', () => {
    const { state } = startGuided(meet, 'Charlie');
    const english = respondGuided(meet, state, ['my name is Charlie'], 'Charlie');
    expect(english.englishDetected).toBe(true);
    expect(english.hint?.spanish).toBe('Me llamo Charlie.');
    const confused = respondGuided(meet, english.state, ['patata'], 'Charlie');
    expect(confused.understood).toBe(false);
    // …and never gets stuck: after two misses Emma moves on.
    const moved = respondGuided(meet, confused.state, ['patata'], 'Charlie');
    expect(moved.understood).toBe(true);
  });

  it('detects English', () => {
    expect(looksEnglish('I am from Scotland')).toBe(true);
    expect(looksEnglish('Soy de Escocia')).toBe(false);
    expect(looksEnglish('no')).toBe(false);
  });
});
