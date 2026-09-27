import type { LevelId } from '@/types/curriculum';

/**
 * Guided conversations: scripted scenes with flexible understanding and slot
 * memory ("Vivo en Escocia" → Emma remembers Escocia). They run entirely in
 * the browser, so Talk to Emma works with no AI key and offline.
 */

export interface Line {
  spanish: string;
  english: string;
}

export interface GuidedAnswer {
  /** Patterns for matchUtterance ({name}, {any}, {number} wildcards). */
  patterns: string[];
  /** Regex (tested on lower-case text) whose first group is remembered as `slot`. */
  capture?: { slot: string; regex: string };
  /** Emma's reaction before moving on — may use {slots}. */
  react?: Line;
  next: string;
}

export interface GuidedNode {
  emma: Line;
  answers?: GuidedAnswer[];
  /** Model answer offered as a hint. */
  hint?: Line;
  /** A simpler way to ask, used after the player gets stuck. */
  simpler?: Line;
  /** For nodes where Emma just continues. */
  next?: string;
  end?: boolean;
}

export interface GuidedScenario {
  id: string;
  level: LevelId;
  emoji: string;
  title: string;
  description: string;
  /** Default values for slots Emma might mention. */
  defaults?: Record<string, string>;
  start: string;
  nodes: Record<string, GuidedNode>;
}
