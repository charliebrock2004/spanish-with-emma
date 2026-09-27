import { defineLevel } from '@/lib/curriculum/dsl';
import { LEVEL_META } from '../levels';
import cafe from './01-cafe';
import restaurant from './02-restaurant';
import shopping from './03-shopping';
import clothes from './04-clothes';
import town from './05-town';
import directions from './06-directions';
import hotel from './07-hotel';
import routine from './08-routine';
import weather from './09-weather';
import plans from './10-plans';
import health from './11-health';
import review from './12-review';

export default defineLevel(3, LEVEL_META[3], [cafe, restaurant, shopping, clothes, town, directions, hotel, routine, weather, plans, health, review]);
