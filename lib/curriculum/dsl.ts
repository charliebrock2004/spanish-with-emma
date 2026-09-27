/**
 * A compact authoring DSL for lessons. Lesson files describe *what* to teach;
 * `build.ts` turns that into render-ready exercises (options, distractors,
 * tiles, vocabulary links), so hundreds of lessons stay easy to write.
 *
 *   intro('hola')                     teach a word from the lesson's vocabulary
 *   meaning('hola')                   "What does *hola* mean?"  (English options)
 *   recall('hola')                    "How do you say 'hello'?" (Spanish options)
 *   listen('hola') / listen('Me llamo Emma', 'My name is Emma')
 *   speak('hola') / speak('Me llamo {name}', 'My name is {name}')
 *   translate('I am Charlie', ['Soy Charlie', 'Yo soy Charlie'])
 *   order('Me llamo Emma', 'My name is Emma')
 *   fill('Me ___ Emma', 'llamo', ['llama', 'llamas'], 'My name is Emma')
 *   question('Which one is formal?', 'usted', ['tú', 'vosotros'])
 *   match('hola', 'adios', 'gracias', 'por-favor')
 *   tip('Title', 'Body with *Spanish* in asterisks', [examples])
 */
import type {
  Example,
  GrammarNote,
  Lang,
  LevelId,
  LevelMeta,
  VocabCategory,
} from '@/types/curriculum';

export interface WordDef {
  id: string;
  spanish: string;
  english: string;
  category: VocabCategory;
  pronunciation?: string;
  alternatives?: string[];
  englishAlternatives?: string[];
  note?: string;
  difficulty?: number;
}

interface WordOptions {
  pron?: string;
  alt?: string[];
  enAlt?: string[];
  note?: string;
  difficulty?: number;
}

export function word(
  id: string,
  spanish: string,
  english: string,
  category: VocabCategory,
  opts: WordOptions = {},
): WordDef {
  return {
    id,
    spanish,
    english,
    category,
    pronunciation: opts.pron,
    alternatives: opts.alt,
    englishAlternatives: opts.enAlt,
    note: opts.note,
    difficulty: opts.difficulty,
  };
}

// ─── Exercise definitions ──────────────────────────────────────────────────

export type ExerciseDef =
  | { kind: 'intro'; ref: string; lines?: string[]; note?: string; example?: Example }
  | { kind: 'tip'; title: string; body: string; examples?: Example[] }
  | { kind: 'meaning'; ref: string; prompt?: string }
  | { kind: 'recall'; ref: string; prompt?: string }
  | {
      kind: 'fill';
      sentence: string;
      answer: string;
      wrong: string[];
      english: string;
      vocab?: string[];
      explanation?: string;
    }
  | {
      kind: 'question';
      prompt: string;
      answer: string;
      wrong: string[];
      lang: Lang;
      display?: string;
      displayLang?: Lang;
      audio?: string;
      vocab?: string[];
      explanation?: string;
    }
  | {
      kind: 'translate';
      from: Lang;
      text: string;
      answers: string[];
      vocab?: string[];
      hint?: string;
      explanation?: string;
    }
  | {
      kind: 'order';
      spanish: string;
      english: string;
      alternatives?: string[];
      vocab?: string[];
      reverse?: boolean;
      explanation?: string;
    }
  | {
      kind: 'listen';
      source: string;
      english?: string;
      mode?: 'choose' | 'type';
      wrong?: string[];
      vocab?: string[];
    }
  | {
      kind: 'speak';
      source: string;
      english?: string;
      pronunciation?: string;
      accept?: string[];
      prompt?: string;
      success?: string;
      vocab?: string[];
    }
  | { kind: 'match'; refs: string[] }
  | { kind: 'conversation'; def: ConversationDef };

export interface ConversationReplyDef {
  answers: string[];
  hint: string;
  english: string;
  wrong?: string[];
}

export interface ConversationTurnDef {
  emma: string;
  english: string;
  reply?: ConversationReplyDef;
}

export interface ConversationDef {
  title: string;
  turns: ConversationTurnDef[];
  vocab?: string[];
}

export const intro = (ref: string, opts: { lines?: string[]; note?: string; example?: Example } = {}): ExerciseDef => ({
  kind: 'intro',
  ref,
  ...opts,
});

export const tip = (title: string, body: string, examples?: Example[]): ExerciseDef => ({
  kind: 'tip',
  title,
  body,
  examples,
});

export const meaning = (ref: string, prompt?: string): ExerciseDef => ({ kind: 'meaning', ref, prompt });

export const recall = (ref: string, prompt?: string): ExerciseDef => ({ kind: 'recall', ref, prompt });

export const fill = (
  sentence: string,
  answer: string,
  wrong: string[],
  english: string,
  opts: { vocab?: string[]; explanation?: string } = {},
): ExerciseDef => ({ kind: 'fill', sentence, answer, wrong, english, ...opts });

export const question = (
  prompt: string,
  answer: string,
  wrong: string[],
  opts: {
    lang?: Lang;
    display?: string;
    displayLang?: Lang;
    audio?: string;
    vocab?: string[];
    explanation?: string;
  } = {},
): ExerciseDef => ({ kind: 'question', prompt, answer, wrong, lang: opts.lang ?? 'es', ...opts });

/** English → Spanish typing. */
export const translate = (
  english: string,
  spanish: string | string[],
  opts: { vocab?: string[]; hint?: string; explanation?: string } = {},
): ExerciseDef => ({
  kind: 'translate',
  from: 'en',
  text: english,
  answers: Array.isArray(spanish) ? spanish : [spanish],
  ...opts,
});

/** Spanish → English typing (reading comprehension). */
export const understand = (
  spanish: string,
  english: string | string[],
  opts: { vocab?: string[]; hint?: string; explanation?: string } = {},
): ExerciseDef => ({
  kind: 'translate',
  from: 'es',
  text: spanish,
  answers: Array.isArray(english) ? english : [english],
  ...opts,
});

export const order = (
  spanish: string,
  english: string,
  opts: { alternatives?: string[]; vocab?: string[]; reverse?: boolean; explanation?: string } = {},
): ExerciseDef => ({ kind: 'order', spanish, english, ...opts });

export const listen = (
  source: string,
  english?: string,
  opts: { mode?: 'choose' | 'type'; wrong?: string[]; vocab?: string[] } = {},
): ExerciseDef => ({ kind: 'listen', source, english, ...opts });

export const speak = (
  source: string,
  english?: string,
  opts: { pronunciation?: string; accept?: string[]; prompt?: string; success?: string; vocab?: string[] } = {},
): ExerciseDef => ({ kind: 'speak', source, english, ...opts });

export const match = (...refs: string[]): ExerciseDef => ({ kind: 'match', refs });

export const conversation = (title: string, turns: ConversationTurnDef[], vocab?: string[]): ExerciseDef => ({
  kind: 'conversation',
  def: { title, turns, vocab },
});

export const emma = (line: string, english: string, reply?: ConversationReplyDef): ConversationTurnDef => ({
  emma: line,
  english,
  reply,
});

/** A reply the player gives. `answers` may use {name}, {any}, {number}. */
export const you = (
  answers: string | string[],
  english: string,
  opts: { hint?: string; wrong?: string[] } = {},
): ConversationReplyDef => {
  const list = Array.isArray(answers) ? answers : [answers];
  return { answers: list, english, hint: opts.hint ?? list[0], wrong: opts.wrong };
};

// ─── Lessons & levels ──────────────────────────────────────────────────────

export interface LessonDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  difficulty?: number;
  minutes?: number;
  milestone?: boolean;
  vocabulary: WordDef[];
  grammar?: GrammarNote[];
  exercises: ExerciseDef[];
}

export interface LevelDef {
  meta: LevelMeta;
  lessons: LessonDef[];
}

export const defineLesson = (lesson: LessonDef): LessonDef => lesson;

export const defineLevel = (level: LevelId, meta: Omit<LevelMeta, 'id'>, lessons: LessonDef[]): LevelDef => ({
  meta: { id: level, ...meta },
  lessons,
});
