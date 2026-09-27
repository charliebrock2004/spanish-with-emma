import type { VocabLike } from '@/lib/progress/srs';
import type { GameDef } from './catalog';
import type { GameOutcome } from './GameResults';

/** Props shared by the arcade-style games. */
export interface ArcadeProps {
  game: GameDef;
  /** Words the player has met (at least MIN_GAME_WORDS). */
  pool: VocabLike[];
  /** Different every round, so each game is new. */
  seed: number;
  onFinish: (outcome: GameOutcome) => void;
  onClose: () => void;
}
