import { DEFAULT_EQUIPPED } from '@/data/shop';
import type { AchievementContext } from '@/data/achievements';
import { initialAdaptive } from '@/lib/progress/adaptive';
import { isLearned, isMastered } from '@/lib/progress/srs';
import { initialStreak } from '@/lib/progress/streak';
import type { GameData, Inventory } from '@/types/game';
import type { LevelId } from '@/types/curriculum';
import type { PlayerProfile, PlayerStats } from '@/types/progress';
import type { Settings } from '@/types/settings';
import { playerLevelFromXp, type PlayerLevel } from './levels';

/**
 * Defaults and derived values for the saved game. Kept free of React and
 * Zustand so the engine and the tests can use them directly.
 */

export const DEFAULT_SETTINGS: Settings = {
  voiceMode: 'auto',
  speechRate: 0.9,
  difficulty: 'auto',
  soundEffects: true,
  soundVolume: 0.8,
  music: false,
  expressiveVoice: true,
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

export const initialStats = (): PlayerStats => ({
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
  bestCombo: 0,
  speakingSeconds: 0,
  coinsEarned: 0,
  coinsSpent: 0,
  itemsBought: 0,
  questsCompleted: 0,
  dailyChests: 0,
  weeklyChallenges: 0,
  chestsOpened: 0,
});

export const initialProfile = (): PlayerProfile => ({
  name: '',
  experience: 'new',
  startedAt: 0,
  onboarded: false,
  placementLevel: 1,
});

export const initialInventory = (): Inventory => ({
  owned: {},
  equipped: { ...DEFAULT_EQUIPPED },
  boostUntil: null,
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
  gameBests: {},
  coins: 0,
  inventory: initialInventory(),
  quests: null,
  questsTomorrow: null,
  weekly: null,
  chests: [],
  claimed: {},
  gameCoins: { date: '', coins: 0 },
});

// ─── Derived values ────────────────────────────────────────────────────────

/** The curriculum level the player is working in (drives Emma's "auto" voice and the chat level). */
export function curriculumLevel(data: Pick<GameData, 'profile' | 'completedLessons' | 'completedLevels'>): LevelId {
  let level = data.profile.placementLevel;
  for (const record of Object.values(data.completedLessons)) if (record.level > level) level = record.level;
  for (const done of data.completedLevels) if (done < 6 && done + 1 > level) level = (done + 1) as LevelId;
  return level;
}

/** The player's game level (1 → 120), from total XP. */
export const xpLevel = (data: Pick<GameData, 'xp'>): PlayerLevel => playerLevelFromXp(data.xp);

export const boostActive = (data: Pick<GameData, 'inventory'>, now: number) => Boolean(data.inventory.boostUntil && data.inventory.boostUntil > now);

/** Words the player has actually met (games need a handful). */
export const wordsMet = (data: Pick<GameData, 'vocab'>) => Object.values(data.vocab).filter((v) => v.timesSeen > 0).length;

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
    completedLessons: Object.keys(data.completedLessons),
    playerLevel: playerLevelFromXp(data.xp).level,
    itemsOwned: Object.keys(data.inventory.owned).length,
  };
}

// ─── Saved fields ──────────────────────────────────────────────────────────

/** Every saved field — typed as a full record so a new field can't be forgotten. */
const DATA_FIELDS: Record<keyof GameData, true> = {
  profile: true,
  xp: true,
  completedLessons: true,
  completedLevels: true,
  history: true,
  vocab: true,
  mistakes: true,
  stats: true,
  streak: true,
  activity: true,
  achievements: true,
  adaptive: true,
  settings: true,
  conversations: true,
  gameBests: true,
  coins: true,
  inventory: true,
  quests: true,
  questsTomorrow: true,
  weekly: true,
  chests: true,
  claimed: true,
  gameCoins: true,
};

export const DATA_KEYS = Object.keys(DATA_FIELDS) as Array<keyof GameData>;

/** Just the saved game data from a larger object (e.g. the store with its actions). */
export function pickData(source: GameData): GameData {
  const out: Partial<Record<keyof GameData, unknown>> = {};
  for (const key of DATA_KEYS) out[key] = source[key];
  return out as GameData;
}
