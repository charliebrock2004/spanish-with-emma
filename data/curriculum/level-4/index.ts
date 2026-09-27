import { defineLevel } from '@/lib/curriculum/dsl';
import { LEVEL_META } from '../levels';
import airport from './01-airport';
import transport from './02-transport';
import perfect from './03-perfect';
import pastRegular from './04-past-regular';
import pastIrregular from './05-past-irregular';
import opinions from './06-opinions';
import comparisons from './07-comparisons';
import sightseeing from './08-sightseeing';
import problems from './09-problems';
import stories from './10-stories';
import review from './11-review';

export default defineLevel(4, LEVEL_META[4], [
  airport,
  transport,
  perfect,
  pastRegular,
  pastIrregular,
  opinions,
  comparisons,
  sightseeing,
  problems,
  stories,
  review,
]);
