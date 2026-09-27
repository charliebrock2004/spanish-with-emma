import type { EquipSlot } from '@/data/shop';
import type { ChestKind, ResolvedPrize } from '@/lib/game/chests';
import type { Reward, RewardLine, Stars } from '@/lib/game/economy';
import type { DailyQuests, Quest } from '@/lib/game/quests';
import type { MilestoneReward } from '@/lib/game/streakRewards';
import type { WeeklyChallenge } from '@/lib/game/weekly';
import type { StreakUpdate } from '@/lib/progress/streak';
import type { LevelId } from './curriculum';
import type {
  AdaptiveState,
  ConversationRecord,
  DayActivity,
  LessonHistoryEntry,
  LessonRecord,
  MistakeRecord,
  PlayerProfile,
  PlayerStats,
  StreakState,
  VocabProgress,
} from './progress';
import type { Settings } from './settings';

export interface Inventory {
  /** Item id → when it was unlocked. */
  owned: Record<string, number>;
  equipped: Record<EquipSlot, string>;
  /** XP boost active until this time. */
  boostUntil: number | null;
}

export interface Chest {
  id: string;
  kind: ChestKind;
  /** What earned it (shown on the chest). */
  source: string;
  earnedAt: number;
  openedAt: number | null;
  prizes: ResolvedPrize[] | null;
}

/** Everything saved on the device. */
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
  /** Best score per mini-game. */
  gameBests: Record<string, number>;
  // ─── Game economy ───
  coins: number;
  inventory: Inventory;
  quests: DailyQuests | null;
  /** Tomorrow's quests, decided today so the preview is a promise that's kept. */
  questsTomorrow: DailyQuests | null;
  weekly: WeeklyChallenge | null;
  chests: Chest[];
  /** Reward ledger: every one-off reward has a key here once granted. */
  claimed: Record<string, number>;
  /** Coins earned from games today (games have a daily coin cap). */
  gameCoins: { date: string; coins: number };
}

export type UiEvent =
  | { id: string; kind: 'achievement'; achievementId: string; coins: number }
  | { id: string; kind: 'daily-goal'; reward: Reward }
  | { id: string; kind: 'streak'; update: StreakUpdate }
  | { id: string; kind: 'level-up'; level: number; coins: number; items: string[]; chestId: string | null }
  | { id: string; kind: 'quest'; quest: Quest }
  | { id: string; kind: 'chest'; chestId: string; chestKind: ChestKind }
  | { id: string; kind: 'streak-milestone'; milestone: MilestoneReward; items: string[]; chestId: string | null }
  | { id: string; kind: 'weekly'; title: string; reward: Reward; item: string | null }
  | { id: string; kind: 'item'; itemId: string; source: string }
  | { id: string; kind: 'welcome-back'; reward: Reward };

export type UiEventKind = UiEvent['kind'];

export type GrantSource =
  | 'answer'
  | 'lesson'
  | 'review'
  | 'game'
  | 'conversation'
  | 'daily-goal'
  | 'quest'
  | 'weekly'
  | 'chest'
  | 'level'
  | 'streak'
  | 'achievement'
  | 'welcome';

/** What a finished lesson reports back to the completion screen. */
export interface LessonResult {
  lines: RewardLine[];
  total: Reward;
  stars: Stars;
  /** Best rating ever for this lesson (including this run). */
  bestStars: Stars;
  firstCompletion: boolean;
  firstPerfect: boolean;
  streak: StreakUpdate;
  /** A chest earned by this lesson (level milestone). */
  chestId: string | null;
  /** Total XP when the session started and now — for the level bar. */
  xpBefore: number;
  xpAfter: number;
}

/** What a finished review, game or conversation reports back. */
export interface SessionResult {
  lines: RewardLine[];
  total: Reward;
  streak: StreakUpdate;
  best: number;
  /** Beat a previous best score. */
  newBest: boolean;
  xpBefore: number;
  xpAfter: number;
}
