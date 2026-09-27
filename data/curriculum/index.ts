import type { LevelDef } from '@/lib/curriculum/dsl';
import level1 from './level-1';
import level2 from './level-2';
import level3 from './level-3';
import level4 from './level-4';
import level5 from './level-5';
import level6 from './level-6';

/** The whole course, in teaching order. */
export const COURSE: LevelDef[] = [level1, level2, level3, level4, level5, level6];
