/**
 * Curriculum domain types.
 *
 * Lessons are authored as data (see `data/curriculum/`) and resolved by
 * `lib/curriculum/build.ts` into fully-specified exercises the UI can render.
 */

export type LevelId = 1 | 2 | 3 | 4 | 5 | 6;

export type Lang = 'es' | 'en';

export type Skill =
  | 'vocabulary'
  | 'grammar'
  | 'listening'
  | 'speaking'
  | 'reading'
  | 'word-order'
  | 'conversation';

export type MistakeType = 'vocabulary' | 'grammar' | 'pronunciation' | 'word-order' | 'listening';

export type VocabCategory =
  | 'greetings'
  | 'basics'
  | 'people'
  | 'numbers'
  | 'colours'
  | 'places'
  | 'family'
  | 'food'
  | 'drinks'
  | 'time'
  | 'verbs'
  | 'questions'
  | 'adjectives'
  | 'travel'
  | 'shopping'
  | 'home'
  | 'body'
  | 'health'
  | 'weather'
  | 'feelings'
  | 'work'
  | 'expressions'
  | 'idioms'
  | 'grammar'
  | 'connectors'
  | 'leisure';

/** A word or short phrase the curriculum teaches. */
export interface VocabItem {
  id: string;
  spanish: string;
  english: string;
  category: VocabCategory;
  /** 1 (first words) … 10 (advanced nuance). */
  difficulty: number;
  pronunciation?: string;
  /** Other Spanish forms accepted as correct (e.g. "encantada" for "encantado"). */
  alternatives?: string[];
  /** Other English meanings accepted as correct. */
  englishAlternatives?: string[];
  note?: string;
  level: LevelId;
  lessonId: string;
}

export interface GrammarNote {
  title: string;
  /** Emma-markup: *text* marks Spanish. */
  explanation: string;
  examples?: Example[];
}

export interface Example {
  spanish: string;
  english: string;
  pronunciation?: string;
}

// ─── Exercises (resolved, render-ready) ────────────────────────────────────

export type ExerciseType =
  | 'intro'
  | 'tip'
  | 'choice'
  | 'translate'
  | 'order'
  | 'listen'
  | 'speak'
  | 'match'
  | 'conversation';

interface ExerciseBase {
  /** Unique across the curriculum, e.g. `l1-hola#3`. */
  id: string;
  type: ExerciseType;
  skill: Skill;
  /** Vocabulary this exercise practises — drives spaced review. */
  vocabIds: string[];
  /** Shown after answering (Emma-markup). */
  explanation?: string;
  /** Marks exercises injected from the player's weak words. */
  isReview?: boolean;
}

/** Teaching card: presents a new word or phrase. */
export interface IntroExercise extends ExerciseBase {
  type: 'intro';
  spanish: string;
  english: string;
  pronunciation?: string;
  note?: string;
  example?: Example;
  /** What Emma says while presenting (Emma-markup, spoken in order). */
  lines?: string[];
}

/** Grammar / pronunciation / culture tip. */
export interface TipExercise extends ExerciseBase {
  type: 'tip';
  title: string;
  body: string;
  examples?: Example[];
}

export type ChoiceVariant = 'meaning' | 'recall' | 'fill' | 'question';

export interface ChoiceExercise extends ExerciseBase {
  type: 'choice';
  variant: ChoiceVariant;
  /** Emma's question (Emma-markup). */
  prompt: string;
  /** Large text under the prompt — the word, or a sentence with a ___ gap. */
  display?: string;
  displayLang?: Lang;
  /** English gloss for `display` (fill-in-the-gap sentences). */
  displayTranslation?: string;
  /** Spanish played when the exercise appears. */
  audio?: string;
  answer: string;
  /** Wrong options, best first. The client picks how many to show. */
  distractors: string[];
  optionsLang: Lang;
}

export interface TranslateExercise extends ExerciseBase {
  type: 'translate';
  from: Lang;
  text: string;
  /** Accepted answers; the first is the canonical one shown in corrections. */
  answers: string[];
  /** Extra tiles used when the player is offered a word bank. */
  bankDistractors: string[];
  hint?: string;
}

export interface WordOrderExercise extends ExerciseBase {
  type: 'order';
  /** The meaning shown to the player. */
  prompt: string;
  /** Canonical sentence, with punctuation. */
  answer: string;
  /** Tiles in the correct order. */
  tiles: string[];
  distractors: string[];
  /** Other accepted sentences (e.g. with the subject moved). */
  alternatives: string[];
  lang: Lang;
}

export interface ListenExercise extends ExerciseBase {
  type: 'listen';
  mode: 'choose' | 'type';
  /** Spanish spoken by Emma. */
  audio: string;
  english: string;
  distractors: string[];
}

export interface SpeakExercise extends ExerciseBase {
  type: 'speak';
  spanish: string;
  english: string;
  pronunciation?: string;
  accept: string[];
  prompt?: string;
  success?: string;
}

export interface MatchPair {
  id: string;
  spanish: string;
  english: string;
}

export interface MatchExercise extends ExerciseBase {
  type: 'match';
  pairs: MatchPair[];
}

export interface ConversationReply {
  /** Accepted replies. Wildcards: {name}, {any}, {number}. */
  answers: string[];
  /** Wrong replies offered in tap mode. */
  options: string[];
  /** Model reply (Spanish) — shown as a hint and in tap mode. */
  hint: string;
  english: string;
}

export interface ConversationTurn {
  /** Emma's line in Spanish ({name} is replaced by the player's name). */
  emma: string;
  english: string;
  reply?: ConversationReply;
}

export interface ConversationExercise extends ExerciseBase {
  type: 'conversation';
  title: string;
  turns: ConversationTurn[];
}

export type Exercise =
  | IntroExercise
  | TipExercise
  | ChoiceExercise
  | TranslateExercise
  | WordOrderExercise
  | ListenExercise
  | SpeakExercise
  | MatchExercise
  | ConversationExercise;

/** Exercises that are answered (as opposed to teaching cards). */
export type AnswerableExercise = Exclude<Exercise, IntroExercise | TipExercise>;

// ─── Lessons & levels ──────────────────────────────────────────────────────

export interface LevelMeta {
  id: LevelId;
  emoji: string;
  title: string;
  subtitle: string;
  cefr: string;
  description: string;
}

export interface LessonSummary {
  id: string;
  level: LevelId;
  /** Position within its level, starting at 1. */
  order: number;
  /** Position within the whole curriculum, starting at 0. */
  index: number;
  title: string;
  description: string;
  emoji: string;
  difficulty: number;
  estimatedMinutes: number;
  xpReward: number;
  isMilestone: boolean;
  exerciseCount: number;
  vocabCount: number;
}

export interface Lesson extends LessonSummary {
  vocabulary: VocabItem[];
  grammar: GrammarNote[];
  exercises: Exercise[];
  conversation?: ConversationExercise;
}

/** An exercise tagged with the lesson it comes from (for games built from lessons). */
export type TaggedExercise<T extends Exercise['type']> = Extract<Exercise, { type: T }> & { lessonId: string };
