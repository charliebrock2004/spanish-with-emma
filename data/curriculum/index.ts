import type { LevelDef } from '@/lib/curriculum/dsl';
import level1 from './level-1';
import level2 from './level-2';
import level3 from './level-3';

/** The whole course, in teaching order. */
export const COURSE: LevelDef[] = [level1, level2, level3];
