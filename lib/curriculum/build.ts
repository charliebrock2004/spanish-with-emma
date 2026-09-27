import type {
  ChoiceExercise,
  ConversationExercise,
  Exercise,
  Lang,
  Lesson,
  LessonSummary,
  LevelId,
  LevelMeta,
  Skill,
  VocabItem,
} from '@/types/curriculum';
import { normalizeText, stripAccents, toTiles } from '@/lib/text/normalize';
import { XP } from '@/lib/progress/xp';
import { hashString, seededRandom, shuffle, unique } from '@/lib/utils';
import type { ConversationDef, ExerciseDef, LessonDef, LevelDef } from './dsl';

export class CurriculumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurriculumError';
  }
}

export interface BuiltCurriculum {
  levels: LevelMeta[];
  lessons: Lesson[];
  summaries: LessonSummary[];
  vocabulary: VocabItem[];
}

const BASE_DIFFICULTY: Record<LevelId, number> = { 1: 1, 2: 3, 3: 4, 4: 6, 5: 7, 6: 9 };

/** Accent-free canonical form used to de-duplicate options. */
const key = (text: string, lang: Lang = 'es') => stripAccents(normalizeText(text, { lang }));

const ARTICLES = /^(el|la|los|las|un|una|unos|unas) /;

function wordCount(text: string): number {
  return toTiles(text).length;
}

interface LessonContext {
  def: LessonDef;
  level: LevelId;
  vocabById: Map<string, VocabItem>;
  /** Vocabulary by accent-free Spanish, so sources can be written as text. */
  vocabBySpanish: Map<string, VocabItem>;
  /** Vocabulary from lessons before this one. */
  known: VocabItem[];
  /** This lesson's vocabulary. */
  own: VocabItem[];
  /** Words taught so far in this lesson (grows as intros are resolved). */
  introduced: Set<string>;
  /** Every Spanish sentence used in this lesson (listening distractors). */
  sentences: string[];
  levelVocab: VocabItem[];
  allVocab: VocabItem[];
}

function ref(ctx: LessonContext, id: string): VocabItem {
  const item = ctx.vocabById.get(id);
  if (!item) throw new CurriculumError(`${ctx.def.id}: unknown vocabulary id "${id}"`);
  return item;
}

/** A source is either a vocabulary id or Spanish text that matches a word exactly. */
function lookup(ctx: LessonContext, source: string): VocabItem | null {
  return ctx.vocabById.get(source) ?? ctx.vocabBySpanish.get(key(source)) ?? null;
}

/** Picks up to `count` options from priority tiers, never repeating (or matching) the answer. */
function pickDistractors(
  answer: string,
  tiers: string[][],
  count: number,
  random: () => number,
  lang: Lang,
  exclude: string[] = [],
): string[] {
  const seen = new Set([key(answer, lang), ...exclude.map((e) => key(e, lang))]);
  const out: string[] = [];
  for (const tier of tiers) {
    for (const option of shuffle(unique(tier), random)) {
      const k = key(option, lang);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(option);
      if (out.length >= count) return out;
    }
  }
  return out;
}

/** Vocabulary items whose Spanish appears in `text` — links sentences to spaced review. */
function detectVocab(text: string, pool: VocabItem[]): string[] {
  const hay = ` ${key(text)} `;
  const found: string[] = [];
  for (const item of pool) {
    const forms = [item.spanish, ...(item.alternatives ?? [])].flatMap((f) => {
      const k = key(f);
      const bare = k.replace(ARTICLES, '');
      return bare !== k ? [k, bare] : [k];
    });
    if (forms.some((f) => f.length >= 2 && hay.includes(` ${f} `))) found.push(item.id);
    if (found.length >= 6) break;
  }
  return found;
}

function spanishTokens(items: VocabItem[]): string[] {
  return items.flatMap((v) => toTiles(v.spanish.replace(ARTICLES, ''))).filter((w) => w.length > 1);
}

function englishTokens(items: VocabItem[]): string[] {
  return items.flatMap((v) => toTiles(v.english.replace(/\(.*?\)/g, ''))).filter((w) => w.length > 1);
}

function knownSoFar(ctx: LessonContext): VocabItem[] {
  return [...ctx.known, ...ctx.own.filter((v) => ctx.introduced.has(v.id))];
}

function choiceFromWord(
  ctx: LessonContext,
  id: string,
  exId: string,
  variant: 'meaning' | 'recall',
  prompt: string | undefined,
): ChoiceExercise {
  const item = ref(ctx, id);
  const random = seededRandom(hashString(exId));
  const note = item.note ? ` ${item.note}` : '';
  if (variant === 'meaning') {
    const sameCategory = (v: VocabItem) => v.category === item.category && v.id !== item.id;
    const distractors = pickDistractors(
      item.english,
      [
        ctx.own.filter((v) => v.id !== item.id).map((v) => v.english),
        ctx.levelVocab.filter(sameCategory).map((v) => v.english),
        ctx.allVocab.filter(sameCategory).map((v) => v.english),
        ctx.levelVocab.map((v) => v.english),
      ],
      5,
      random,
      'en',
      item.englishAlternatives,
    );
    return {
      id: exId,
      type: 'choice',
      variant,
      skill: 'vocabulary',
      vocabIds: [item.id],
      prompt: prompt ?? `What does *${item.spanish}* mean?`,
      display: item.spanish,
      displayLang: 'es',
      audio: item.spanish,
      answer: item.english,
      distractors,
      optionsLang: 'en',
      explanation: `*${item.spanish}* means "${item.english}".${note}`,
    };
  }
  const known = knownSoFar(ctx).filter((v) => v.id !== item.id);
  const distractors = pickDistractors(
    item.spanish,
    [
      known.filter((v) => v.category === item.category).map((v) => v.spanish),
      known.map((v) => v.spanish),
      ctx.own.filter((v) => v.id !== item.id).map((v) => v.spanish),
      ctx.levelVocab.filter((v) => v.category === item.category && v.id !== item.id).map((v) => v.spanish),
      ctx.levelVocab.filter((v) => v.id !== item.id).map((v) => v.spanish),
    ],
    5,
    random,
    'es',
    item.alternatives,
  );
  return {
    id: exId,
    type: 'choice',
    variant,
    skill: 'vocabulary',
    vocabIds: [item.id],
    prompt: prompt ?? `How do you say "${item.english}" in Spanish?`,
    display: item.english,
    displayLang: 'en',
    answer: item.spanish,
    distractors,
    optionsLang: 'es',
    explanation: `"${item.english}" is *${item.spanish}*.${note}`,
  };
}

function skillFor(def: ExerciseDef): Skill {
  switch (def.kind) {
    case 'intro':
    case 'meaning':
    case 'recall':
    case 'match':
      return 'vocabulary';
    case 'tip':
    case 'fill':
    case 'question':
      return 'grammar';
    case 'translate':
      return def.from === 'es' ? 'reading' : 'vocabulary';
    case 'order':
      return 'word-order';
    case 'listen':
      return 'listening';
    case 'speak':
      return 'speaking';
    case 'conversation':
      return 'conversation';
  }
}

function resolveConversation(ctx: LessonContext, def: ConversationDef, exId: string): ConversationExercise {
  if (def.turns.length === 0) throw new CurriculumError(`${exId}: conversation has no turns`);
  const text = def.turns.map((t) => `${t.emma} ${t.reply?.answers[0] ?? ''}`).join(' ');
  return {
    id: exId,
    type: 'conversation',
    skill: 'conversation',
    title: def.title,
    vocabIds: def.vocab ?? detectVocab(text, [...ctx.own, ...ctx.known]),
    turns: def.turns.map((t) => ({
      emma: t.emma,
      english: t.english,
      reply: t.reply
        ? {
            answers: t.reply.answers,
            hint: t.reply.hint,
            english: t.reply.english,
            options: t.reply.wrong ?? [],
          }
        : undefined,
    })),
  };
}

function resolveExercise(ctx: LessonContext, def: ExerciseDef, exId: string): Exercise {
  const random = seededRandom(hashString(exId));
  const pool = [...ctx.own, ...ctx.known];
  switch (def.kind) {
    case 'intro': {
      const item = ref(ctx, def.ref);
      ctx.introduced.add(item.id);
      return {
        id: exId,
        type: 'intro',
        skill: 'vocabulary',
        vocabIds: [item.id],
        spanish: item.spanish,
        english: item.english,
        pronunciation: item.pronunciation,
        note: def.note ?? item.note,
        example: def.example,
        lines: def.lines,
      };
    }
    case 'tip':
      return {
        id: exId,
        type: 'tip',
        skill: 'grammar',
        vocabIds: [],
        title: def.title,
        body: def.body,
        examples: def.examples,
      };
    case 'meaning':
      return choiceFromWord(ctx, def.ref, exId, 'meaning', def.prompt);
    case 'recall':
      return choiceFromWord(ctx, def.ref, exId, 'recall', def.prompt);
    case 'fill': {
      if (!def.sentence.includes('___')) throw new CurriculumError(`${exId}: fill sentence needs ___`);
      if (def.wrong.some((w) => key(w) === key(def.answer))) {
        throw new CurriculumError(`${exId}: a wrong option equals the answer`);
      }
      const full = def.sentence.replace('___', def.answer);
      return {
        id: exId,
        type: 'choice',
        variant: 'fill',
        skill: 'grammar',
        vocabIds: def.vocab ?? detectVocab(full, pool),
        prompt: 'Fill in the gap.',
        display: def.sentence,
        displayLang: 'es',
        displayTranslation: def.english,
        audio: full,
        answer: def.answer,
        distractors: def.wrong,
        optionsLang: 'es',
        explanation: def.explanation ?? `*${full}* — "${def.english}"`,
      };
    }
    case 'question': {
      if (def.wrong.some((w) => key(w, def.lang) === key(def.answer, def.lang))) {
        throw new CurriculumError(`${exId}: a wrong option equals the answer`);
      }
      return {
        id: exId,
        type: 'choice',
        variant: 'question',
        skill: 'grammar',
        vocabIds: def.vocab ?? detectVocab(`${def.display ?? ''} ${def.answer}`, pool),
        prompt: def.prompt,
        display: def.display,
        displayLang: def.displayLang ?? 'es',
        audio: def.audio,
        answer: def.answer,
        distractors: def.wrong,
        optionsLang: def.lang,
        explanation: def.explanation,
      };
    }
    case 'translate': {
      if (def.answers.length === 0) throw new CurriculumError(`${exId}: translate needs answers`);
      const answerTiles = new Set(toTiles(def.answers[0]).map((t) => key(t, def.from === 'en' ? 'es' : 'en')));
      const bankSource = def.from === 'en' ? spanishTokens([...ctx.own, ...ctx.known]) : englishTokens([...ctx.own, ...ctx.known]);
      const bankDistractors = pickDistractors(
        '',
        [bankSource.filter((t) => !answerTiles.has(key(t, def.from === 'en' ? 'es' : 'en')))],
        4,
        random,
        def.from === 'en' ? 'es' : 'en',
      );
      const spanishText = def.from === 'en' ? def.answers[0] : def.text;
      return {
        id: exId,
        type: 'translate',
        skill: skillFor(def),
        vocabIds: def.vocab ?? detectVocab(spanishText, pool),
        from: def.from,
        text: def.text,
        answers: def.answers,
        bankDistractors,
        hint: def.hint,
        explanation: def.explanation,
      };
    }
    case 'order': {
      const lang: Lang = def.reverse ? 'en' : 'es';
      const answer = def.reverse ? def.english : def.spanish;
      const tiles = toTiles(answer);
      if (tiles.length < 2) throw new CurriculumError(`${exId}: order needs at least two words`);
      const tileKeys = new Set(tiles.map((t) => key(t, lang)));
      const source = lang === 'es' ? spanishTokens([...ctx.own, ...ctx.known]) : englishTokens([...ctx.own, ...ctx.known]);
      const distractors = pickDistractors('', [source.filter((t) => !tileKeys.has(key(t, lang)))], 3, random, lang);
      return {
        id: exId,
        type: 'order',
        skill: 'word-order',
        vocabIds: def.vocab ?? detectVocab(def.spanish, pool),
        prompt: def.reverse ? def.spanish : def.english,
        answer,
        tiles,
        distractors,
        alternatives: def.alternatives ?? [],
        lang,
        explanation: def.explanation,
      };
    }
    case 'listen': {
      const item = lookup(ctx, def.source);
      const audio = item ? item.spanish : def.source;
      const english = item ? item.english : def.english;
      if (!english) throw new CurriculumError(`${exId}: listen("${def.source}") needs an English meaning`);
      let distractors = def.wrong ?? [];
      if (distractors.length < 4) {
        const words = wordCount(audio);
        const bySimilarLength = (list: string[]) =>
          [...list].sort((a, b) => Math.abs(wordCount(a) - words) - Math.abs(wordCount(b) - words));
        let tiers: string[][];
        if (item) {
          const others = (list: VocabItem[]) => list.filter((v) => v.id !== item.id);
          const sameCategory = (list: VocabItem[]) => others(list).filter((v) => v.category === item.category);
          tiers = [
            sameCategory(knownSoFar(ctx)).map((v) => v.spanish),
            sameCategory(ctx.own).map((v) => v.spanish),
            sameCategory(ctx.levelVocab).map((v) => v.spanish),
            bySimilarLength(others(knownSoFar(ctx)).map((v) => v.spanish)).slice(0, 8),
            others(ctx.own).map((v) => v.spanish),
          ];
        } else {
          const sentences = ctx.sentences.filter((s) => key(s) !== key(audio));
          tiers = [bySimilarLength(sentences).slice(0, 8), sentences, bySimilarLength(pool.map((v) => v.spanish)).slice(0, 12)];
        }
        const extra = pickDistractors(audio, tiers, 5 - distractors.length, random, 'es', distractors);
        distractors = [...distractors, ...extra];
      }
      return {
        id: exId,
        type: 'listen',
        skill: 'listening',
        vocabIds: def.vocab ?? (item ? [item.id] : detectVocab(audio, pool)),
        mode: def.mode ?? 'choose',
        audio,
        english,
        distractors,
        explanation: `*${audio}* — "${english}"`,
      };
    }
    case 'speak': {
      const item = lookup(ctx, def.source);
      const spanish = item ? item.spanish : def.source;
      const english = item ? item.english : def.english;
      if (!english) throw new CurriculumError(`${exId}: speak("${def.source}") needs an English meaning`);
      return {
        id: exId,
        type: 'speak',
        skill: 'speaking',
        vocabIds: def.vocab ?? (item ? [item.id] : detectVocab(spanish, pool)),
        spanish,
        english,
        pronunciation: def.pronunciation ?? item?.pronunciation,
        accept: unique([spanish, ...(item?.alternatives ?? []), ...(def.accept ?? [])]),
        prompt: def.prompt,
        success: def.success,
      };
    }
    case 'match': {
      if (def.refs.length < 3) throw new CurriculumError(`${exId}: match needs at least 3 words`);
      const items = def.refs.map((id) => ref(ctx, id));
      return {
        id: exId,
        type: 'match',
        skill: 'vocabulary',
        vocabIds: items.map((i) => i.id),
        pairs: items.map((i) => ({ id: i.id, spanish: i.spanish, english: i.english })),
      };
    }
    case 'conversation':
      return resolveConversation(ctx, def.def, exId);
  }
}

function collectSentences(def: LessonDef): string[] {
  const out: string[] = [];
  for (const ex of def.exercises) {
    if (ex.kind === 'order' || (ex.kind === 'listen' && ex.source.includes(' ')) || (ex.kind === 'speak' && ex.source.includes(' '))) {
      const text = ex.kind === 'order' ? ex.spanish : ex.source;
      if (!text.includes('{')) out.push(text);
    }
    if (ex.kind === 'translate' && ex.from === 'en' && !ex.answers[0].includes('{')) out.push(ex.answers[0]);
    if (ex.kind === 'translate' && ex.from === 'es') out.push(ex.text);
  }
  return unique(out);
}

function isAnswerable(ex: Exercise): boolean {
  return ex.type !== 'intro' && ex.type !== 'tip';
}

function estimateMinutes(exercises: Exercise[]): number {
  let minutes = 0;
  for (const ex of exercises) {
    if (ex.type === 'intro' || ex.type === 'tip') minutes += 0.2;
    else if (ex.type === 'conversation') minutes += 0.4 * ex.turns.length;
    else minutes += 0.35;
  }
  return Math.max(3, Math.round(minutes));
}

function estimateXp(exercises: Exercise[]): number {
  let xp = XP.lessonComplete;
  for (const ex of exercises) {
    if (ex.type === 'speak') xp += XP.speaking;
    else if (ex.type === 'conversation') xp += XP.correct * Math.max(1, ex.turns.filter((t) => t.reply).length);
    else if (isAnswerable(ex)) xp += XP.correct;
  }
  return xp;
}

export function buildCurriculum(levelDefs: LevelDef[]): BuiltCurriculum {
  const vocabById = new Map<string, VocabItem>();
  const lessonIds = new Set<string>();
  const ordered: Array<{ def: LessonDef; level: LevelId; order: number; index: number }> = [];
  let index = 0;

  for (const levelDef of levelDefs) {
    const level = levelDef.meta.id;
    levelDef.lessons.forEach((def, i) => {
      if (lessonIds.has(def.id)) throw new CurriculumError(`Duplicate lesson id "${def.id}"`);
      lessonIds.add(def.id);
      ordered.push({ def, level, order: i + 1, index: index++ });
      for (const w of def.vocabulary) {
        if (vocabById.has(w.id)) throw new CurriculumError(`Duplicate vocabulary id "${w.id}" (${def.id})`);
        vocabById.set(w.id, {
          ...w,
          difficulty: w.difficulty ?? def.difficulty ?? BASE_DIFFICULTY[level],
          level,
          lessonId: def.id,
        });
      }
    });
  }

  const allVocab = [...vocabById.values()];
  const vocabBySpanish = new Map<string, VocabItem>();
  for (const item of allVocab) if (!vocabBySpanish.has(key(item.spanish))) vocabBySpanish.set(key(item.spanish), item);
  const known: VocabItem[] = [];
  const lessons: Lesson[] = [];

  for (const { def, level, order, index: idx } of ordered) {
    const own = def.vocabulary.map((w) => vocabById.get(w.id)!);
    const ctx: LessonContext = {
      def,
      level,
      vocabById,
      vocabBySpanish,
      known: [...known],
      own,
      introduced: new Set(),
      sentences: collectSentences(def),
      levelVocab: allVocab.filter((v) => v.level === level),
      allVocab,
    };
    const exercises = def.exercises.map((ex, i) => resolveExercise(ctx, ex, `${def.id}#${i}`));
    const conversation = exercises.find((e): e is ConversationExercise => e.type === 'conversation');
    const answerable = exercises.filter(isAnswerable).length;
    lessons.push({
      id: def.id,
      level,
      order,
      index: idx,
      title: def.title,
      description: def.description,
      emoji: def.emoji,
      difficulty: def.difficulty ?? BASE_DIFFICULTY[level],
      estimatedMinutes: def.minutes ?? estimateMinutes(exercises),
      xpReward: estimateXp(exercises),
      isMilestone: Boolean(def.milestone),
      exerciseCount: answerable,
      vocabCount: own.length,
      vocabulary: own,
      grammar: def.grammar ?? [],
      exercises,
      conversation,
    });
    known.push(...own);
  }

  const summaries: LessonSummary[] = lessons.map((l) => ({
    id: l.id,
    level: l.level,
    order: l.order,
    index: l.index,
    title: l.title,
    description: l.description,
    emoji: l.emoji,
    difficulty: l.difficulty,
    estimatedMinutes: l.estimatedMinutes,
    xpReward: l.xpReward,
    isMilestone: l.isMilestone,
    exerciseCount: l.exerciseCount,
    vocabCount: l.vocabCount,
  }));

  return { levels: levelDefs.map((l) => l.meta), lessons, summaries, vocabulary: allVocab };
}
