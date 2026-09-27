import { defineLevel } from '@/lib/curriculum/dsl';
import { LEVEL_META } from '../levels';
import family from './01-family';
import food from './02-food';
import drinks from './03-drinks';
import days from './04-days';
import time from './05-time';
import verbs from './06-verbs';
import hobbies from './07-hobbies';
import questions from './08-questions';
import home from './09-home';
import months from './10-months';
import review from './11-review';

export default defineLevel(2, LEVEL_META[2], [family, food, drinks, days, time, verbs, hobbies, questions, home, months, review]);
