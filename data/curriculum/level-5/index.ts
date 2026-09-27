import { defineLevel } from '@/lib/curriculum/dsl';
import { LEVEL_META } from '../levels';
import imperfect from './01-imperfect';
import pastContrast from './02-past-contrast';
import directPronouns from './03-direct-pronouns';
import indirectPronouns from './04-indirect-pronouns';
import future from './05-future';
import conditional from './06-conditional';
import expressions from './07-expressions';
import feelings from './08-feelings';
import work from './09-work';
import porPara from './10-por-para';
import review from './11-review';

export default defineLevel(5, LEVEL_META[5], [
  imperfect,
  pastContrast,
  directPronouns,
  indirectPronouns,
  future,
  conditional,
  expressions,
  feelings,
  work,
  porPara,
  review,
]);
