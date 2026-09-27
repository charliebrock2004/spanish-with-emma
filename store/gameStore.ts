import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Exercise, LevelId, MistakeType, Skill } from '@/types/curriculum';
import type { GameData, LessonResult, SessionResult, UiEvent } from '@/types/game';
import type { ConversationRecord, Experience, LessonHistoryEntry, LessonRecord, MistakeRecord, PlayerStats } from '@/types/progress';
import type { Settings } from '@/types/settings';
import { browserStorage } from '@/services/storage';
import { pushResult } from '@/lib/progress/adaptive';
import { localDateKey } from '@/lib/progress/dates';
import { markSeen, newVocabProgress, recordVocabAnswer, type VocabLike } from '@/lib/progress/srs';
import {
  addStats,
  begin,
  bump,
  bumpActivity,
  checkAchievements,
  ensureDay,
  equip as equipItem,
  grant,
  grantWelcomeChest,
  mergeSaved,
  migrateToV2,
  openChest as openChestTx,
  purchase as purchaseTx,
  recordStreak,
  type Tx,
} from '@/lib/game/engine';
import type { ResolvedPrize } from '@/lib/game/chests';
import {
  conversationReward,
  DAILY_GOAL_REWARD,
  gameReward,
  lessonReward,
  lessonStars,
  REVIEW_REWARD,
  sum,
  type Reward,
  type RewardLine,
  type Stars,
} from '@/lib/game/economy';
import type { BuyBlock } from '@/lib/game/shop';
import { initialData, pickData } from '@/lib/game/state';
import { uid } from '@/lib/utils';

export type { GameData, UiEvent } from '@/types/game';
export { achievementContext, curriculumLevel, DEFAULT_SETTINGS, initialData, xpLevel } from '@/lib/game/state';

// ─── Inputs ────────────────────────────────────────────────────────────────

export interface AnswerInput {
  correct: boolean;
  vocab: VocabLike[];
  skill: Skill;
  /** What the answer earns (priced by the economy); zero for a wrong answer. */
  reward: Reward;
  /** Correct answers in a row, including this one (0 after a mistake). */
  combo: number;
  listening?: boolean;
  speaking?: { passed: boolean; score: number; typed?: boolean };
  mistake?: {
    type: MistakeType;
    prompt: string;
    expected: string;
    given: string;
    lessonId?: string;
    exercise?: Exercise;
  };
}

export interface AnswerOutcome {
  xp: number;
  coins: number;
  boostXp: number;
}

export interface LessonCompletion {
  lessonId: string;
  /** Unique per play-through: the reward ledger key. */
  sessionId: string;
  title: string;
  level: LevelId;
  accuracy: number;
  perfect: boolean;
  seconds: number;
  /** Earned by answers during the lesson (already granted — shown on the results). */
  answers: Reward;
  /** Set when this lesson finished off its level. */
  levelCompleted: LevelId | null;
  /** Total XP when the lesson started. */
  xpBefore: number;
}

export interface SessionCompletion {
  kind: 'review' | 'game' | 'conversation';
  /** Review mode, game id or conversation scenario. */
  id: string;
  /** Unique per play-through: the reward ledger key. */
  sessionId: string;
  title: string;
  accuracy: number;
  seconds: number;
  /** Earned by answers during the session (already granted — shown on the results). */
  earlier?: Reward;
  xpBefore: number;
}

export interface SessionExtra {
  resolvedMistakes?: string[];
  /** A mini-game score (tracked as a personal best). */
  score?: number;
  speedRoundScore?: number;
  /** Game answers, for the reward. */
  correct?: number;
  answered?: number;
  /** Listening questions answered correctly in a game. */
  listeningCorrect?: number;
  /** Longest run of correct answers in a game. */
  bestCombo?: number;
  conversation?: ConversationRecord;
  conversationTurns?: number;
}

// ─── Store shape ───────────────────────────────────────────────────────────

interface GameActions {
  completeOnboarding(name: string, experience: Experience): void;
  setName(name: string): void;
  updateSettings(patch: Partial<Settings>): void;
  markWordsSeen(words: VocabLike[]): void;
  recordAnswer(input: AnswerInput): AnswerOutcome;
  /** Spaced-review updates only (multi-part exercises report each word separately). */
  recordVocab(results: Array<{ word: VocabLike; correct: boolean }>): void;
  recordSpeakingAttempt(): void;
  /** Time spent speaking into the microphone. */
  addSpeakingTime(seconds: number): void;
  addLearningTime(seconds: number): void;
  completeLesson(input: LessonCompletion): LessonResult;
  completeSession(input: SessionCompletion, extra?: SessionExtra): SessionResult;
  resolveMistakes(ids: string[]): void;
  /** Adds a mistake from outside a lesson (e.g. a correction in conversation). */
  logMistake(mistake: Omit<MistakeRecord, 'id' | 'at' | 'resolved'>): void;
  saveConversation(record: ConversationRecord): void;
  /** Rolls over daily quests and the weekly challenge when the date changes. */
  refreshDay(): void;
  purchase(itemId: string): { ok: true } | { ok: false; reason: BuyBlock };
  equip(itemId: string): boolean;
  openChest(chestId: string): ResolvedPrize[] | null;
  shiftEvent(): void;
  setAnnouncedShift(shift: -1 | 0 | 1): void;
  resetProgress(): void;
}

interface Transient {
  hydrated: boolean;
  events: UiEvent[];
  /** Hold celebrations while a lesson is in progress (shown on the results screen). */
  toastsPaused: boolean;
  setToastsPaused(paused: boolean): void;
}

export type GameStore = GameData & GameActions & Transient;

const PLACEMENT: Record<Experience, LevelId> = { new: 1, little: 2, lots: 3 };

function sessionHourStats(tx: Tx): Partial<PlayerStats> {
  const hour = new Date(tx.now).getHours();
  return { lateNightSessions: hour >= 22 || hour < 4 ? 1 : 0, earlySessions: hour >= 4 && hour < 8 ? 1 : 0 };
}

function addHistory(tx: Tx, entry: LessonHistoryEntry) {
  tx.data.history = [entry, ...tx.data.history].slice(0, 60);
}

/** Result lines: what was earned during the session, the completion reward, and any boost. */
function resultLines(earlier: Reward | undefined, lines: RewardLine[], boostXp: number): RewardLine[] {
  const out: RewardLine[] = [];
  if (earlier && (earlier.xp || earlier.coins)) out.push({ label: 'Answers', ...earlier });
  out.push(...lines.filter((l) => l.xp || l.coins));
  if (boostXp) out.push({ label: 'XP boost ×2', xp: boostXp, coins: 0 });
  return out;
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      /** Runs `fn` against a transaction and commits the result in one update. */
      const transact = <T>(fn: (tx: Tx) => T): T => {
        const tx = begin(pickData(get()), Date.now(), localDateKey());
        const result = fn(tx);
        set({ ...tx.data, events: tx.events.length ? [...get().events, ...tx.events] : get().events });
        return result;
      };

      return {
        ...initialData(),
        hydrated: false,
        events: [],
        toastsPaused: false,
        setToastsPaused(paused) {
          set({ toastsPaused: paused });
        },

        completeOnboarding(name, experience) {
          transact((tx) => {
            tx.data.profile = {
              name: name.trim(),
              experience,
              startedAt: tx.now,
              onboarded: true,
              placementLevel: PLACEMENT[experience],
            };
            ensureDay(tx);
            grantWelcomeChest(tx);
          });
        },

        setName(name) {
          set((s) => ({ profile: { ...s.profile, name: name.trim() } }));
        },

        updateSettings(patch) {
          set((s) => ({ settings: { ...s.settings, ...patch } }));
        },

        markWordsSeen(words) {
          if (words.length === 0) return;
          const now = Date.now();
          set((s) => {
            const vocab = { ...s.vocab };
            for (const w of words) vocab[w.id] = markSeen(vocab[w.id] ?? newVocabProgress(w), now);
            return { vocab };
          });
        },

        recordAnswer(input) {
          return transact((tx) => {
            const d = tx.data;
            const vocab = { ...d.vocab };
            for (const w of input.vocab) vocab[w.id] = recordVocabAnswer(vocab[w.id] ?? newVocabProgress(w), input.correct, tx.now, tx.today);
            d.vocab = vocab;

            const stats: PlayerStats = {
              ...d.stats,
              answers: d.stats.answers + 1,
              correct: d.stats.correct + (input.correct ? 1 : 0),
              bestCombo: Math.max(d.stats.bestCombo, input.combo),
            };
            if (input.listening && input.correct) stats.listeningCorrect += 1;
            if (input.speaking) {
              stats.speakingAttempts += 1;
              if (input.speaking.passed) {
                if (input.speaking.typed) stats.speakingTyped += 1;
                else stats.speakingPassed += 1;
              }
              if (!input.speaking.typed) {
                stats.pronunciationRun = input.speaking.passed && input.speaking.score >= 0.9 ? stats.pronunciationRun + 1 : 0;
                stats.bestPronunciationRun = Math.max(stats.bestPronunciationRun, stats.pronunciationRun);
              }
            }
            d.stats = stats;

            if (!input.correct && input.mistake) {
              const record: MistakeRecord = { id: uid('m'), at: tx.now, resolved: false, vocabIds: input.vocab.map((v) => v.id), ...input.mistake };
              d.mistakes = [record, ...d.mistakes].slice(0, 100);
            }
            d.adaptive = pushResult(d.adaptive, input.correct);

            const g = input.correct ? grant(tx, { source: 'answer', xp: input.reward.xp, coins: input.reward.coins }) : null;
            if (input.correct) {
              if (input.listening) bump(tx, 'listening', 1);
              if (input.speaking?.passed) bump(tx, 'speaking', 1);
              bump(tx, 'combo', input.combo);
            }
            checkAchievements(tx);
            return { xp: g?.xp ?? 0, coins: g?.coins ?? 0, boostXp: g?.boostXp ?? 0 };
          });
        },

        recordVocab(results) {
          if (results.length === 0) return;
          const now = Date.now();
          const today = localDateKey();
          set((s) => {
            const vocab = { ...s.vocab };
            for (const { word, correct } of results) vocab[word.id] = recordVocabAnswer(vocab[word.id] ?? newVocabProgress(word), correct, now, today);
            return { vocab };
          });
        },

        recordSpeakingAttempt() {
          set((s) => ({ stats: { ...s.stats, speakingAttempts: s.stats.speakingAttempts + 1, pronunciationRun: 0 } }));
        },

        addSpeakingTime(seconds) {
          if (!(seconds > 0)) return;
          set((s) => ({ stats: { ...s.stats, speakingSeconds: s.stats.speakingSeconds + Math.min(seconds, 120) } }));
        },

        addLearningTime(seconds) {
          if (!(seconds > 0)) return;
          transact((tx) => {
            const goal = tx.data.settings.dailyGoalMinutes * 60;
            const before = tx.data.activity[tx.today]?.seconds ?? 0;
            tx.data.activity = bumpActivity(tx.data.activity, tx.today, { seconds });
            addStats(tx, { learningSeconds: seconds });
            if (before < goal && before + seconds >= goal) {
              const g = grant(tx, { key: `daily-goal:${tx.today}`, source: 'daily-goal', ...DAILY_GOAL_REWARD });
              if (g.granted) {
                addStats(tx, { dailyGoalsMet: 1 });
                tx.events.push({ id: uid('evt'), kind: 'daily-goal', reward: { xp: g.xp, coins: g.coins } });
                bump(tx, 'dailyGoal', 1);
              }
            }
            checkAchievements(tx);
          });
        },

        completeLesson(input) {
          return transact((tx): LessonResult => {
            const d = tx.data;
            ensureDay(tx);
            const prev = d.completedLessons[input.lessonId];
            const stars = lessonStars(input.accuracy, input.perfect);
            const prevStars = prev ? (prev.stars ?? lessonStars(prev.bestAccuracy, prev.perfect)) : 0;
            const bestStars = Math.max(prevStars, stars) as Stars;
            const firstCompletion = !prev;
            const firstPerfect = input.perfect && !prev?.perfect;
            const key = `lesson:${input.sessionId}`;

            if (d.claimed[key]) {
              // Already recorded (a duplicate call) — report without changing anything.
              return { lines: [], total: { xp: 0, coins: 0 }, stars, bestStars, firstCompletion: false, firstPerfect: false, streak: { state: d.streak, event: 'same-day', freezesUsed: 0, earnedFreeze: false }, chestId: null, xpBefore: input.xpBefore, xpAfter: d.xp };
            }

            const newLevel = input.levelCompleted !== null && !d.completedLevels.includes(input.levelCompleted);
            const reward = lessonReward({ firstCompletion, perfect: input.perfect, firstPerfect, levelCompleted: newLevel });
            if (newLevel) reward.lines[reward.lines.length - 1].label = `Level ${input.levelCompleted} complete`;

            const record: LessonRecord = {
              level: input.level,
              completedAt: tx.now,
              bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, input.accuracy),
              perfect: Boolean(prev?.perfect) || input.perfect,
              attempts: (prev?.attempts ?? 0) + 1,
              xpEarned: (prev?.xpEarned ?? 0) + input.answers.xp + reward.total.xp,
              stars: bestStars,
            };
            d.completedLessons = { ...d.completedLessons, [input.lessonId]: record };
            if (newLevel) d.completedLevels = [...d.completedLevels, input.levelCompleted!].sort();
            addStats(tx, { lessonsCompleted: 1, perfectLessons: input.perfect ? 1 : 0, ...sessionHourStats(tx) });
            d.activity = bumpActivity(d.activity, tx.today, { sessions: 1 });

            const g = grant(tx, {
              key,
              source: 'lesson',
              xp: reward.total.xp,
              coins: reward.total.coins,
              chest: reward.chest ? { kind: reward.chest, source: `Level ${input.levelCompleted} complete` } : undefined,
            });
            const lines = resultLines(input.answers, reward.lines, g.boostXp);
            const total = sum(lines);
            addHistory(tx, { lessonId: input.lessonId, title: input.title, kind: 'lesson', completedAt: tx.now, xp: total.xp, accuracy: input.accuracy, seconds: input.seconds });
            if (g.chestId) tx.events.push({ id: uid('evt'), kind: 'chest', chestId: g.chestId, chestKind: 'milestone' });

            const streak = recordStreak(tx);
            bump(tx, 'lessons', 1);
            if (input.perfect) bump(tx, 'perfect', 1);
            checkAchievements(tx);
            return { lines, total, stars, bestStars, firstCompletion, firstPerfect, streak, chestId: g.chestId, xpBefore: input.xpBefore, xpAfter: tx.data.xp };
          });
        },

        completeSession(input, extra = {}) {
          return transact((tx): SessionResult => {
            const d = tx.data;
            ensureDay(tx);
            const key = `${input.kind}:${input.sessionId}`;
            const previousBest = d.gameBests[input.id] ?? 0;
            const score = extra.score;
            const newBest = score !== undefined && score > previousBest;

            if (d.claimed[key]) {
              return { lines: [], total: { xp: 0, coins: 0 }, streak: { state: d.streak, event: 'same-day', freezesUsed: 0, earnedFreeze: false }, best: previousBest, newBest: false, xpBefore: input.xpBefore, xpAfter: d.xp };
            }

            let lines: RewardLine[];
            if (input.kind === 'review') lines = [{ label: 'Review complete', ...REVIEW_REWARD }];
            else if (input.kind === 'game') {
              lines = gameReward({
                correct: extra.correct ?? 0,
                answered: extra.answered ?? 0,
                newBest: newBest && previousBest > 0,
                coinsToday: d.gameCoins.coins,
              }).lines;
            } else lines = conversationReward(extra.conversationTurns ?? 0).lines;
            const reward = sum(lines);

            const g = grant(tx, { key, source: input.kind, xp: reward.xp, coins: reward.coins });
            if (input.kind === 'game') tx.data.gameCoins = { date: tx.today, coins: tx.data.gameCoins.coins + g.coins };

            // Stats and records.
            const inc: Partial<PlayerStats> = { ...sessionHourStats(tx) };
            if (input.kind === 'review') inc.reviewSessions = 1;
            if (input.kind === 'game') inc.gamesPlayed = 1;
            if (input.kind === 'conversation') {
              inc.conversations = 1;
              inc.conversationTurns = extra.conversationTurns ?? 0;
            }
            if (extra.listeningCorrect) inc.listeningCorrect = extra.listeningCorrect;
            addStats(tx, inc);
            if (extra.speedRoundScore !== undefined || extra.bestCombo !== undefined) {
              tx.data.stats = {
                ...tx.data.stats,
                bestSpeedRound: Math.max(tx.data.stats.bestSpeedRound, extra.speedRoundScore ?? 0),
                bestCombo: Math.max(tx.data.stats.bestCombo, extra.bestCombo ?? 0),
              };
            }
            if (newBest) tx.data.gameBests = { ...tx.data.gameBests, [input.id]: score! };
            const resolved = new Set(extra.resolvedMistakes ?? []);
            if (resolved.size) tx.data.mistakes = tx.data.mistakes.map((m) => (resolved.has(m.id) ? { ...m, resolved: true } : m));
            if (extra.conversation) {
              tx.data.conversations = [extra.conversation, ...tx.data.conversations.filter((c) => c.id !== extra.conversation!.id)].slice(0, 20);
            }
            tx.data.activity = bumpActivity(tx.data.activity, tx.today, { sessions: 1 });

            const resultLinesOut = resultLines(input.earlier, lines, g.boostXp);
            const total = sum(resultLinesOut);
            addHistory(tx, { lessonId: input.id, title: input.title, kind: input.kind, completedAt: tx.now, xp: total.xp, accuracy: input.accuracy, seconds: input.seconds });

            const streak = recordStreak(tx);
            if (input.kind === 'review') bump(tx, 'reviews', 1);
            if (input.kind === 'game') bump(tx, 'games', 1);
            if (input.kind === 'conversation') {
              bump(tx, 'conversations', 1);
              bump(tx, 'speaking', extra.conversationTurns ?? 0);
            }
            if (extra.listeningCorrect) bump(tx, 'listening', extra.listeningCorrect);
            if (extra.bestCombo) bump(tx, 'combo', extra.bestCombo);
            checkAchievements(tx);
            return { lines: resultLinesOut, total, streak, best: Math.max(previousBest, score ?? 0), newBest, xpBefore: input.xpBefore, xpAfter: tx.data.xp };
          });
        },

        resolveMistakes(ids) {
          const done = new Set(ids);
          set((s) => ({ mistakes: s.mistakes.map((m) => (done.has(m.id) ? { ...m, resolved: true } : m)) }));
        },

        logMistake(mistake) {
          set((s) => ({ mistakes: [{ ...mistake, id: uid('m'), at: Date.now(), resolved: false }, ...s.mistakes].slice(0, 100) }));
        },

        saveConversation(record) {
          set((s) => ({ conversations: [record, ...s.conversations.filter((c) => c.id !== record.id)].slice(0, 20) }));
        },

        refreshDay() {
          const s = get();
          const today = localDateKey();
          if (s.quests?.date === today && s.questsTomorrow && s.gameCoins.date === today && s.weekly) return;
          transact((tx) => ensureDay(tx));
        },

        purchase(itemId) {
          return transact((tx) => {
            const result = purchaseTx(tx, itemId);
            if (result.ok) checkAchievements(tx);
            return result;
          });
        },

        equip(itemId) {
          return transact((tx) => equipItem(tx, itemId));
        },

        openChest(chestId) {
          return transact((tx) => {
            const prizes = openChestTx(tx, chestId);
            checkAchievements(tx);
            return prizes;
          });
        },

        shiftEvent() {
          set((s) => ({ events: s.events.slice(1) }));
        },

        setAnnouncedShift(shift) {
          set((s) => ({ adaptive: { ...s.adaptive, announced: shift } }));
        },

        resetProgress() {
          set((s) => ({ ...initialData(s.settings), events: [] }));
        },
      };
    },
    {
      name: 'spanish-with-emma',
      version: 2,
      storage: createJSONStorage(() => browserStorage),
      skipHydration: true,
      partialize: (s): GameData => pickData(s),
      migrate: (persisted, version) => {
        const saved = (persisted ?? {}) as Partial<GameData>;
        if (version < 2) return migrateToV2(saved, Date.now(), localDateKey());
        return saved as GameData;
      },
      // Fill in any fields added since the data was saved.
      merge: (persisted, current) => ({ ...current, ...mergeSaved(persisted as Partial<GameData>, pickData(current)) }),
      onRehydrateStorage: () => () => {
        useGameStore.setState({ hydrated: true });
        useGameStore.getState().refreshDay();
      },
    },
  ),
);
