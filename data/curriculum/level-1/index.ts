import { defineLevel } from '@/lib/curriculum/dsl';
import { LEVEL_META } from '../levels';
import hola from './01-hola';
import manners from './02-manners';
import meLlamo from './03-me-llamo';
import comoEstas from './04-como-estas';
import numbers from './05-numbers';
import colours from './06-colours';
import deDonde from './07-de-donde';
import age from './08-age';
import review from './09-review';

export default defineLevel(1, LEVEL_META[1], [hola, manners, meLlamo, comoEstas, numbers, colours, deDonde, age, review]);
