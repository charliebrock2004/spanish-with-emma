import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Exercise, LevelId, MistakeType, Skill } from '@/types/curriculum';
import type {
  AdaptiveState,
  ConversationRecord,
  DayActivity,
  Experience,
  LessonHistoryEntry,
  LessonRecord,
  MistakeRecord,
  PlayerProfile,
  PlayerStats,
  StreakState,
  VocabProgress,
} from '@/types/progress';
import type { Settings } from '@/types/settings';
import { browserStorage } from '@/services/storage';
import { initialAdaptive, pushResult } from '@/lib/progress/adaptive';
import { newlyUnlocked } from '@/lib/progress/achievements';
import { localDateKey } from '@/lib/progress/dates';
import { isLearned, isMastered, markSeen, newVocabProgress, recordVocabAnswer, type VocabLike } from '@/lib/progress/srs';
import { initialStreak, recordStreakDay, type StreakUpdate } from '@/lib/progress/streak';
import { lessonBonus, XP } from '@/lib/progress/xp';
import type { AchievementContext } from '@/data/achievements';
import { uid } from '@/lib/utils';

// ─── State ─────────────────────────────────────────────────────────────────

export type UiEvent =
  | { id: string; kind: 'achievement'; achievementId: string }
  | { id: string; kind: 'daily-goal' }
  | { id: string; kind: 'streak'; update: StreakUpdate };

export interface GameData {
  profile: PlayerProfile;
  xp: number;
  completedLessons: Record<string, LessonRecord>;
  completedLevels: LevelId[];
  history: LessonHistoryEntry[];
  vocab: Record<string, VocabProgress>;
  mistakes: MistakeRecord[];
  stats: PlayerStats;
  streak: StreakState;
  activity: Record<string, DayActivity>;
  achievements: Record<string, number>;
  adaptive: AdaptiveState;
  settings: Settings;
  conversations: ConversationRecord[];
}

export interface AnswerInput {
  correct: boolean;
  vocab: VocabLike[];
  skill: Skill;
  xp: number;
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

export interface LessonCompletion {
  lessonId: string;
  title: string;
  level: LevelId;
  accuracy: number;
  perfect: boolean;
  seconds: number;
  /** XP already awarded for answers during the lesson. */
  answersXp: number;
  /** Set when this lesson finished off its level. */
  levelCompleted: LevelId | null;
}

export interface LessonResult {
  bonus: ReturnType<typeof lessonBonus>;
  totalXp: number;
  streak: StreakUpdate;
  achievements: string[];
  firstCompletion: boolean;
}

export interface SessionCompletion {
  kind: 'review' | 'game' | 'conversation';
  id: string;
  title: string;
  accuracy: number;
  seconds: number;
  xp: number;
}

interface GameActions {
  completeOnboarding(name: string, experience: Experience): void;
  setName(name: string): void;
  updateSettings(patch: Partial<Settings>): void;
  markWordsSeen(words: VocabLike[]): void;
  recordAnswer(input: AnswerInput): string[];
  /** Spaced-review updates only (multi-part exercises report each word separately). */
  recordVocab(results: Array<{ word: VocabLike; correct: boolean }>): void;
  recordSpeakingAttempt(): void;
  addXp(amount: number): void;
  addLearningTime(seconds: number): void;
  completeLesson(input: LessonCompletion): LessonResult;
  completeSession(input: SessionCompletion, extra?: {
    resolvedMistakes?: string[];
    speedRoundScore?: number;
    conversation?: ConversationRecord;
    conversationTurns?: number;
  }): { streak: StreakUpdate; achievements: string[] };
  resolveMistakes(ids: string[]): void;
  saveConversation(record: ConversationRecord): void;
  shiftEvent(): void;
  setAnnouncedShift(shift: -1 | 0 | 1): void;
  resetProgress(): void;
}

interface Transient {
  hydrated: boolean;
  events: UiEvent[];
  /** Hold toasts while a lesson is in progress (shown on the results screen). */
  toastsPaused: boolean;
  setToastsPaused(paused: boolean): void;
}

export type GameStore = GameData & GameActions & Transient;

// ─── Defaults ──────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  voiceMode: 'auto',
  speechRate: 0.9,
  difficulty: 'auto',
  soundEffects: true,
  music: false,
  dailyGoalMinutes: 10,
  showPronunciation: 'auto',
  autoplayAudio: true,
  speakingPausedUntil: null,
  sttEngine: 'auto',
  ttsEngine: 'auto',
  spanishVoiceURI: null,
  englishVoiceURI: null,
  reduceMotion: false,
  accessCode: '',
};

const initialStats = (): PlayerStats => ({
  answers: 0,
  correct: 0,
  speakingAttempts: 0,
  speakingPassed: 0,
  speakingTyped: 0,
  pronunciationRun: 0,
  bestPronunciationRun: 0,
  listeningCorrect: 0,
  lessonsCompleted: 0,
  perfectLessons: 0,
  reviewSessions: 0,
  conversations: 0,
  conversationTurns: 0,
  gamesPlayed: 0,
  bestSpeedRound: 0,
  learningSeconds: 0,
  dailyGoalsMet: 0,
  lateNightSessions: 0,
  earlySessions: 0,
});

const initialProfile = (): PlayerProfile => ({
  name: '',
  experience: 'new',
  startedAt: 0,
  onboarded: false,
  placementLevel: 1,
});

export const initialData = (settings: Settings = DEFAULT_SETTINGS): GameData => ({
  profile: initialProfile(),
  xp: 0,
  completedLessons: {},
  completedLevels: [],
  history: [],
  vocab: {},
  mistakes: [],
  stats: initialStats(),
  streak: initialStreak(),
  activity: {},
  achievements: {},
  adaptive: initialAdaptive(),
  settings,
  conversations: [],
});

const PLACEMENT: Record<Experience, LevelId> = { new: 1, little: 2, lots: 3 };

// ─── Derived helpers ───────────────────────────────────────────────────────

export function achievementContext(data: GameData): AchievementContext {
  const words = Object.values(data.vocab);
  return {
    stats: data.stats,
    streak: data.streak.current,
    longestStreak: data.streak.longest,
    wordsLearned: words.filter(isLearned).length,
    wordsMastered: words.filter(isMastered).length,
    xp: data.xp,
    completedLevels: data.completedLevels,
  };
}

/** The curriculum level the player is working in (drives Emma's "auto" voice & chat level). */
export function playerLevel(data: GameData): LevelId {
  let level = data.profile.placementLevel;
  for (const record of Object.values(data.completedLessons)) if (record.level > level) level = record.level;
  for (const done of data.completedLevels) if (done < 6 && done + 1 > level) level = (done + 1) as LevelId;
  return level;
}

function withAchievements(data: GameData, events: UiEvent[]): { achievements: Record<string, number>; events: UiEvent[]; unlocked: string[] } {
  const unlocked = newlyUnlocked(achievementContext(data), data.achievements);
  if (unlocked.length === 0) return { achievements: data.achievements, events, unlocked };
  const now = Date.now();
  const achievements = { ...data.achievements };
  for (const id of unlocked) achievements[id] = now;
  return {
    achievements,
    events: [...events, ...unlocked.map((achievementId) => ({ id: uid('evt'), kind: 'achievement' as const, achievementId }))],
    unlocked,
  };
}

function bumpActivity(activity: Record<string, DayActivity>, today: string, patch: Partial<DayActivity>): Record<string, DayActivity> {
  const day = activity[today] ?? { seconds: 0, xp: 0, sessions: 0 };
  const next = {
    ...activity,
    [today]: {
      seconds: day.seconds + (patch.seconds ?? 0),
      xp: day.xp + (patch.xp ?? 0),
      sessions: day.sessions + (patch.sessions ?? 0),
    },
  };
  // Keep ~3 months of history.
  const keys = Object.keys(next).sort();
  if (keys.length > 100) for (const k of keys.slice(0, keys.length - 100)) delete next[k];
  return next;
}

function sessionHourStats(stats: PlayerStats): PlayerStats {
  const hour = new Date().getHours();
  return {
    ...stats,
    lateNightSessions: stats.lateNightSessions + (hour >= 22 || hour < 4 ? 1 : 0),
    earlySessions: stats.earlySessions + (hour >= 4 && hour < 8 ? 1 : 0),
  };
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialData(),
      hydrated: false,
      events: [],
      toastsPaused: false,
      setToastsPaused(paused) {
        set({ toastsPaused: paused });
      },

      completeOnboarding(name, experience) {
        set((s) => ({
          profile: {
            name: name.trim(),
            experience,
            startedAt: Date.now(),
            onboarded: true,
            placementLevel: PLACEMENT[experience],
          },
          settings: s.settings,
        }));
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
        const now = Date.now();
        const today = localDateKey();
        const s = get();
        const vocab = { ...s.vocab };
        for (const w of input.vocab) {
          vocab[w.id] = recordVocabAnswer(vocab[w.id] ?? newVocabProgress(w), input.correct, now, today);
        }
        const stats: PlayerStats = {
          ...s.stats,
          answers: s.stats.answers + 1,
          correct: s.stats.correct + (input.correct ? 1 : 0),
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
        let mistakes = s.mistakes;
        if (!input.correct && input.mistake) {
          const record: MistakeRecord = {
            id: uid('m'),
            at: now,
            resolved: false,
            vocabIds: input.vocab.map((v) => v.id),
            ...input.mistake,
          };
          mistakes = [record, ...mistakes].slice(0, 100);
        }
        const xp = s.xp + input.xp;
        const next: GameData = {
          ...s,
          vocab,
          stats,
          mistakes,
          xp,
          adaptive: pushResult(s.adaptive, input.correct),
          activity: bumpActivity(s.activity, today, { xp: input.xp }),
        };
        const { achievements, events, unlocked } = withAchievements(next, s.events);
        set({ vocab, stats, mistakes, xp, adaptive: next.adaptive, activity: next.activity, achievements, events });
        return unlocked;
      },

      recordVocab(results) {
        if (results.length === 0) return;
        const now = Date.now();
        const today = localDateKey();
        set((s) => {
          const vocab = { ...s.vocab };
          for (const { word, correct } of results) {
            vocab[word.id] = recordVocabAnswer(vocab[word.id] ?? newVocabProgress(word), correct, now, today);
          }
          return { vocab };
        });
      },

      recordSpeakingAttempt() {
        set((s) => ({ stats: { ...s.stats, speakingAttempts: s.stats.speakingAttempts + 1, pronunciationRun: 0 } }));
      },

      addXp(amount) {
        if (amount <= 0) return;
        const s = get();
        const today = localDateKey();
        const next = { ...s, xp: s.xp + amount, activity: bumpActivity(s.activity, today, { xp: amount }) };
        const { achievements, events } = withAchievements(next, s.events);
        set({ xp: next.xp, activity: next.activity, achievements, events });
      },

      addLearningTime(seconds) {
        if (seconds <= 0) return;
        const s = get();
        const today = localDateKey();
        const goal = s.settings.dailyGoalMinutes * 60;
        const before = s.activity[today]?.seconds ?? 0;
        let activity = bumpActivity(s.activity, today, { seconds });
        let stats: PlayerStats = { ...s.stats, learningSeconds: s.stats.learningSeconds + seconds };
        let xp = s.xp;
        let events = s.events;
        if (before < goal && before + seconds >= goal) {
          stats = { ...stats, dailyGoalsMet: stats.dailyGoalsMet + 1 };
          xp += XP.dailyGoal;
          activity = bumpActivity(activity, today, { xp: XP.dailyGoal });
          events = [...events, { id: uid('evt'), kind: 'daily-goal' }];
        }
        const next = { ...s, activity, stats, xp };
        const result = withAchievements(next, events);
        set({ activity, stats, xp, achievements: result.achievements, events: result.events });
      },

      completeLesson(input) {
        const s = get();
        const today = localDateKey();
        const now = Date.now();
        const bonus = lessonBonus({ perfect: input.perfect, milestone: input.levelCompleted !== null && !s.completedLevels.includes(input.levelCompleted) });
        const prev = s.completedLessons[input.lessonId];
        const completedLessons: Record<string, LessonRecord> = {
          ...s.completedLessons,
          [input.lessonId]: {
            level: input.level,
            completedAt: now,
            bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, input.accuracy),
            perfect: Boolean(prev?.perfect) || input.perfect,
            attempts: (prev?.attempts ?? 0) + 1,
            xpEarned: (prev?.xpEarned ?? 0) + input.answersXp + bonus.total,
          },
        };
        const completedLevels =
          input.levelCompleted && !s.completedLevels.includes(input.levelCompleted)
            ? [...s.completedLevels, input.levelCompleted].sort()
            : s.completedLevels;
        const streak = recordStreakDay(s.streak, today);
        const stats = sessionHourStats({
          ...s.stats,
          lessonsCompleted: s.stats.lessonsCompleted + 1,
          perfectLessons: s.stats.perfectLessons + (input.perfect ? 1 : 0),
        });
        const history: LessonHistoryEntry[] = [
          {
            lessonId: input.lessonId,
            title: input.title,
            kind: 'lesson' as const,
            completedAt: now,
            xp: input.answersXp + bonus.total,
            accuracy: input.accuracy,
            seconds: input.seconds,
          },
          ...s.history,
        ].slice(0, 60);
        const xp = s.xp + bonus.total;
        const activity = bumpActivity(s.activity, today, { xp: bonus.total, sessions: 1 });
        let events = s.events;
        if (streak.event !== 'same-day') events = [...events, { id: uid('evt'), kind: 'streak', update: streak }];
        const next: GameData = { ...s, completedLessons, completedLevels, streak: streak.state, stats, history, xp, activity };
        const result = withAchievements(next, events);
        set({
          completedLessons,
          completedLevels,
          streak: streak.state,
          stats,
          history,
          xp,
          activity,
          achievements: result.achievements,
          events: result.events,
        });
        return {
          bonus,
          totalXp: input.answersXp + bonus.total,
          streak,
          achievements: result.unlocked,
          firstCompletion: !prev,
        };
      },

      completeSession(input, extra = {}) {
        const s = get();
        const today = localDateKey();
        const now = Date.now();
        const streak = recordStreakDay(s.streak, today);
        let stats = sessionHourStats({ ...s.stats });
        if (input.kind === 'review') stats.reviewSessions += 1;
        if (input.kind === 'game') {
          stats.gamesPlayed += 1;
          if (extra.speedRoundScore !== undefined) stats.bestSpeedRound = Math.max(stats.bestSpeedRound, extra.speedRoundScore);
        }
        if (input.kind === 'conversation') {
          stats = {
            ...stats,
            conversations: stats.conversations + 1,
            conversationTurns: stats.conversationTurns + (extra.conversationTurns ?? 0),
          };
        }
        const history: LessonHistoryEntry[] = [
          {
            lessonId: input.id,
            title: input.title,
            kind: input.kind,
            completedAt: now,
            xp: input.xp,
            accuracy: input.accuracy,
            seconds: input.seconds,
          },
          ...s.history,
        ].slice(0, 60);
        const resolved = new Set(extra.resolvedMistakes ?? []);
        const mistakes = resolved.size ? s.mistakes.map((m) => (resolved.has(m.id) ? { ...m, resolved: true } : m)) : s.mistakes;
        const conversations = extra.conversation ? [extra.conversation, ...s.conversations.filter((c) => c.id !== extra.conversation!.id)].slice(0, 20) : s.conversations;
        const xp = s.xp + input.xp;
        const activity = bumpActivity(s.activity, today, { xp: input.xp, sessions: 1 });
        let events = s.events;
        if (streak.event !== 'same-day') events = [...events, { id: uid('evt'), kind: 'streak', update: streak }];
        const next: GameData = { ...s, streak: streak.state, stats, history, mistakes, conversations, xp, activity };
        const result = withAchievements(next, events);
        set({
          streak: streak.state,
          stats,
          history,
          mistakes,
          conversations,
          xp,
          activity,
          achievements: result.achievements,
          events: result.events,
        });
        return { streak, achievements: result.unlocked };
      },

      resolveMistakes(ids) {
        const set_ = new Set(ids);
        set((s) => ({ mistakes: s.mistakes.map((m) => (set_.has(m.id) ? { ...m, resolved: true } : m)) }));
      },

      saveConversation(record) {
        set((s) => ({ conversations: [record, ...s.conversations.filter((c) => c.id !== record.id)].slice(0, 20) }));
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
    }),
    {
      name: 'spanish-with-emma',
      version: 1,
      storage: createJSONStorage(() => browserStorage),
      skipHydration: true,
      partialize: (s): GameData => ({
        profile: s.profile,
        xp: s.xp,
        completedLessons: s.completedLessons,
        completedLevels: s.completedLevels,
        history: s.history,
        vocab: s.vocab,
        mistakes: s.mistakes,
        stats: s.stats,
        streak: s.streak,
        activity: s.activity,
        achievements: s.achievements,
        adaptive: s.adaptive,
        settings: s.settings,
        conversations: s.conversations,
      }),
      // Fill in any fields added since the data was saved.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<GameData>;
        return {
          ...current,
          ...saved,
          profile: { ...current.profile, ...saved.profile },
          stats: { ...current.stats, ...saved.stats },
          streak: { ...current.streak, ...saved.streak },
          settings: { ...current.settings, ...saved.settings },
          adaptive: { ...current.adaptive, ...saved.adaptive },
        };
      },
      onRehydrateStorage: () => () => {
        useGameStore.setState({ hydrated: true });
      },
    },
  ),
);
