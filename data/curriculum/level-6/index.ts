import { defineLevel } from '@/lib/curriculum/dsl';
import { LEVEL_META } from '../levels';
import wishes from './01-wishes';
import emotions from './02-emotions';
import doubt from './03-doubt';
import advice from './04-advice';
import hypotheticals from './05-hypotheticals';
import idioms from './06-idioms';
import connectors from './07-connectors';
import culture from './08-culture';
import reported from './09-reported';
import formal from './10-formal';
import review from './11-review';

export default defineLevel(6, LEVEL_META[6], [
  wishes,
  emotions,
  doubt,
  advice,
  hypotheticals,
  idioms,
  connectors,
  culture,
  reported,
  formal,
  review,
]);
