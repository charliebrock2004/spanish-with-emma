import type { GameDef } from './catalog';

/**
 * Bronze, silver and gold for each mini-game: a target on the start screen and
 * a reason to play again. Thresholds live with each game in the catalog.
 */
export type Medal = 'bronze' | 'silver' | 'gold';

export const MEDALS: Medal[] = ['bronze', 'silver', 'gold'];

export const MEDAL_EMOJI: Record<Medal, string> = { bronze: '🥉', silver: '🥈', gold: '🥇' };

export const MEDAL_NAME: Record<Medal, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

/** The best medal a score earns, or null below bronze. */
export function medalFor(game: GameDef, score: number): Medal | null {
  let medal: Medal | null = null;
  MEDALS.forEach((m, i) => {
    if (score >= game.medals[i]) medal = m;
  });
  return medal;
}

/** The next medal to aim for from a score, and the points still needed. */
export function nextMedal(game: GameDef, score: number): { medal: Medal; score: number; toGo: number } | null {
  const i = game.medals.findIndex((s) => score < s);
  return i === -1 ? null : { medal: MEDALS[i], score: game.medals[i], toGo: game.medals[i] - score };
}

export const medalRank = (medal: Medal | null) => (medal ? MEDALS.indexOf(medal) + 1 : 0);
