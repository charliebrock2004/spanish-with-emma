import { bestUtteranceMatch } from '@/lib/text/match';
import { detectCommonMistake, type MistakeHint } from '@/lib/text/mistakes';
import { normalizeText } from '@/lib/text/normalize';
import { personalise } from '@/lib/utils';
import type { GuidedScenario, Line } from './types';

export interface GuidedState {
  node: string;
  slots: Record<string, string>;
  misses: number;
  done: boolean;
}

export interface GuidedTurn {
  /** Emma's lines, in order (reaction first, then her next question). */
  lines: Line[];
  correction: MistakeHint | null;
  /** The reply wasn't understood — show the hint. */
  hint: Line | null;
  understood: boolean;
  englishDetected: boolean;
  state: GuidedState;
}

/** Common English words that never appear in Spanish replies. */
const ENGLISH_WORDS = new Set([
  'the', 'i', 'im', 'my', 'is', 'am', 'are', 'you', 'your', 'yes', 'and', 'what', 'name', 'from', 'live', 'like',
  'have', 'dont', 'do', 'it', 'to', 'of', 'in', 'hello', 'hi', 'thanks', 'thank', 'please', 'good', 'fine', 'well',
  'years', 'old', 'love', 'want', 'would', 'with', 'this', 'that', 'not', 'know', 'understand', 'sorry', 'okay',
]);

export function looksEnglish(text: string): boolean {
  const words = normalizeText(text, { lang: 'en', accents: false }).split(' ').filter(Boolean);
  if (words.length === 0) return false;
  const english = words.filter((w) => ENGLISH_WORDS.has(w)).length;
  return english / words.length >= 0.5 && english >= 1;
}

const capitalise = (s: string) => s.replace(/(^|\s)(\p{L})/gu, (_m, space: string, c: string) => space + c.toUpperCase());

function fill(line: Line, slots: Record<string, string>, name: string): Line {
  const sub = (text: string) => personalise(text.replace(/\{(\w+)\}/g, (m, key: string) => (key === 'name' ? m : (slots[key] ?? m))), name);
  return { spanish: sub(line.spanish), english: sub(line.english) };
}

export function startGuided(scenario: GuidedScenario, name: string): { state: GuidedState; lines: Line[] } {
  const state: GuidedState = { node: scenario.start, slots: { pname: name || 'amigo', ...(scenario.defaults ?? {}) }, misses: 0, done: false };
  return { state, lines: [fill(scenario.nodes[scenario.start].emma, state.slots, name)] };
}

/** How confident a match must be to count as understood. */
const UNDERSTOOD = 0.62;

export function respondGuided(
  scenario: GuidedScenario,
  state: GuidedState,
  transcripts: string[],
  name: string,
): GuidedTurn {
  const node = scenario.nodes[state.node];
  const said = transcripts[0] ?? '';
  const correction = detectCommonMistake(said);

  if (!node?.answers?.length) {
    return { lines: [], correction, hint: null, understood: true, englishDetected: false, state: { ...state, done: true } };
  }

  if (looksEnglish(said)) {
    const misses = state.misses + 1;
    return {
      lines: [{ spanish: '¡En español, por favor! 😉', english: 'In Spanish, please!' }],
      correction: null,
      hint: node.hint ? fill(node.hint, state.slots, name) : null,
      understood: false,
      englishDetected: true,
      state: { ...state, misses },
    };
  }

  let best: { index: number; score: number } = { index: -1, score: 0 };
  node.answers.forEach((answer, index) => {
    const { score } = bestUtteranceMatch(transcripts, answer.patterns, { name });
    if (score > best.score) best = { index, score };
  });

  // After two misses Emma stops being picky and keeps the chat flowing.
  const lenient = state.misses >= 2 && said.trim().split(/\s+/).length >= 1;
  if (best.score < UNDERSTOOD && !lenient) {
    const misses = state.misses + 1;
    const again = misses === 1 && node.simpler ? node.simpler : { spanish: 'Perdona, no te he entendido bien. ¿Puedes repetirlo?', english: "Sorry, I didn't quite get that. Can you say it again?" };
    return {
      lines: [fill(again, state.slots, name)],
      correction,
      hint: node.hint ? fill(node.hint, state.slots, name) : null,
      understood: false,
      englishDetected: false,
      state: { ...state, misses },
    };
  }

  const answer = node.answers[best.index >= 0 ? best.index : node.answers.length - 1];
  const slots = { ...state.slots };
  if (answer.capture) {
    const lower = said.toLowerCase().replace(/[¿?¡!.,;:"]/g, ' ').replace(/\s+/g, ' ').trim();
    const match = lower.match(new RegExp(answer.capture.regex, 'u'));
    const value = match?.[1]?.trim();
    if (value) slots[answer.capture.slot] = capitalise(value.split(' ').slice(0, 4).join(' '));
  }

  const lines: Line[] = [];
  if (answer.react) lines.push(fill(answer.react, slots, name));
  let nextId = answer.next;
  let nextNode = scenario.nodes[nextId];
  // Follow "Emma keeps talking" nodes.
  while (nextNode) {
    lines.push(fill(nextNode.emma, slots, name));
    if (nextNode.answers?.length || nextNode.end || !nextNode.next) break;
    nextId = nextNode.next;
    nextNode = scenario.nodes[nextId];
  }
  const done = !nextNode || Boolean(nextNode.end) || !nextNode.answers?.length;
  return {
    lines,
    correction,
    hint: null,
    understood: true,
    englishDetected: false,
    state: { node: nextId, slots, misses: 0, done },
  };
}

export function currentHint(scenario: GuidedScenario, state: GuidedState, name: string): Line | null {
  const hint = scenario.nodes[state.node]?.hint;
  return hint ? fill(hint, state.slots, name) : null;
}
