import type { MistakeType } from '@/types/curriculum';
import { stripAccents } from './normalize';

/**
 * Classic English-speaker mistakes in Spanish, with a friendly explanation and,
 * where possible, the corrected sentence. Used by the correction system in
 * lessons and in conversations with Emma.
 */
export interface MistakeHint {
  id: string;
  type: MistakeType;
  /** Emma-markup explanation. */
  message: string;
  /** The player's sentence, corrected (when it can be rewritten reliably). */
  corrected?: string;
}

interface Rule {
  id: string;
  type: MistakeType;
  /** Tested against lower-case, accent-free text. */
  test: RegExp;
  message: string;
  fix?: (plain: string) => string;
}

const ARTICLES: Record<string, string> = {
  pizza: 'la pizza', paella: 'la paella', musica: 'la música', cerveza: 'la cerveza', playa: 'la playa',
  fruta: 'la fruta', comida: 'la comida', leche: 'la leche', tortilla: 'la tortilla', ensalada: 'la ensalada',
  cafe: 'el café', te: 'el té', chocolate: 'el chocolate', futbol: 'el fútbol', vino: 'el vino', pan: 'el pan',
  queso: 'el queso', cine: 'el cine', pescado: 'el pescado', pollo: 'el pollo', arroz: 'el arroz',
  helado: 'el helado', verano: 'el verano', invierno: 'el invierno', deporte: 'el deporte', agua: 'el agua',
  jamon: 'el jamón', tenis: 'el tenis', baloncesto: 'el baloncesto', golf: 'el golf', teatro: 'el teatro',
};

const YO_FORMS: Record<string, string> = {
  tiene: 'tengo', quiere: 'quiero', puede: 'puedo', hace: 'hago', va: 'voy', come: 'como', vive: 'vivo',
  habla: 'hablo', trabaja: 'trabajo', estudia: 'estudio', bebe: 'bebo', necesita: 'necesito', sabe: 'sé',
  conoce: 'conozco', sale: 'salgo', pone: 'pongo', viene: 'vengo', dice: 'digo', juega: 'juego', duerme: 'duermo',
};

const SUBJUNCTIVE: Record<string, string> = {
  tienes: 'tengas', estas: 'estés', eres: 'seas', vienes: 'vengas', puedes: 'puedas', haces: 'hagas',
  vas: 'vayas', hablas: 'hables', comes: 'comas', es: 'sea', esta: 'esté', tiene: 'tenga', hay: 'haya',
  va: 'vaya', puede: 'pueda', viene: 'venga', hace: 'haga', sabe: 'sepa',
};

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const RULES: Rule[] = [
  {
    id: 'yo-gusto',
    type: 'grammar',
    test: /(\byo gusto\b|^gusto (?!en\b|de\b|conocer))/,
    message:
      'To say you like something, Spanish flips it round: *me gusta* — literally "it pleases me".',
    fix: (s) =>
      s.replace(/^(yo )?gusto (el |la |los |las )?(\w+)/, (_m, _yo, art: string | undefined, noun: string) =>
        `me gusta ${art ? `${art}${noun}` : ARTICLES[noun] ?? noun}`,
      ).replace(/\byo gusto\b/, 'me gusta'),
  },
  {
    id: 'yo-me-gusta',
    type: 'grammar',
    test: /\byo me gusta/,
    message: 'Drop the *yo* — just *me gusta*, or *a mí me gusta* if you want to stress it.',
    fix: (s) => s.replace(/\byo me gusta/, 'me gusta'),
  },
  {
    id: 'gusta-plural',
    type: 'grammar',
    test: /\bme gusta (los|las) /,
    message: 'When you like more than one thing, it becomes *me gustan*: *me gustan los perros*.',
    fix: (s) => s.replace(/\bme gusta (los|las) /, 'me gustan $1 '),
  },
  {
    id: 'gustan-singular',
    type: 'grammar',
    test: /\bme gustan (el|la) /,
    message: 'For one thing it\'s *me gusta*: *me gusta el café*.',
    fix: (s) => s.replace(/\bme gustan (el|la) /, 'me gusta $1 '),
  },
  {
    id: 'ser-feelings',
    type: 'grammar',
    test: /\bsoy (muy )?(bien|mal|cansad[oa]|enferm[oa]|content[oa]|triste|nervios[oa]|ocupad[oa]|enfadad[oa]|preocupad[oa]|emocionad[oa]|estresad[oa]|regular)\b/,
    message: 'For how you feel right now, Spanish uses *estar*: *estoy bien*, *estoy cansado*.',
    fix: (s) => s.replace(/\bsoy\b/, 'estoy'),
  },
  {
    id: 'estar-origin',
    type: 'grammar',
    test: /\bestoy de (?!acuerdo|vacaciones|viaje|pie|broma|buen|mal)\w+/,
    message: 'Where you\'re *from* uses *ser*: *soy de Escocia*.',
    fix: (s) => s.replace(/\bestoy de\b/, 'soy de'),
  },
  {
    id: 'ser-age',
    type: 'grammar',
    test: /\b(soy|estoy) (\w+ ){1,3}anos\b/,
    message: 'In Spanish you *have* years: *tengo treinta años*.',
    fix: (s) => s.replace(/\b(soy|estoy)\b/, 'tengo'),
  },
  {
    id: 'years-old',
    type: 'vocabulary',
    test: /\banos (viej[oa]s?|de edad)\b/,
    message: 'No need for "old": *tengo treinta años* already says it.',
    fix: (s) => s.replace(/\banos (viej[oa]s?|de edad)\b/, 'años'),
  },
  {
    id: 'mi-llamo',
    type: 'grammar',
    test: /\bmi llamo\b/,
    message: 'It\'s *me llamo* (me, not *mi*) — literally "I call myself".',
    fix: (s) => s.replace(/\bmi llamo\b/, 'me llamo'),
  },
  {
    id: 'yo-llamo',
    type: 'grammar',
    test: /(\byo llamo\b|^llamo \w+$)/,
    message: '*Me llamo…* means "I call myself", so it needs the *me*.',
    fix: (s) => s.replace(/^(yo )?llamo\b/, 'me llamo').replace(/\byo llamo\b/, 'me llamo'),
  },
  {
    id: 'me-llamo-es',
    type: 'grammar',
    test: /\bme llamo es\b/,
    message: 'Just *me llamo Charlie* — no *es* needed.',
    fix: (s) => s.replace(/\bme llamo es\b/, 'me llamo'),
  },
  {
    id: 'estar-identity',
    type: 'grammar',
    test: /\bestoy (un |una )?(profesor|profesora|estudiante|medic[oa]|enfermer[oa]|ingenier[oa]|abogad[oa]|escoces|escocesa|ingles|inglesa|espanol|espanola|alt[oa]|baj[oa]|simpatic[oa])\b/,
    message: 'For who you are — job, nationality, personality — use *ser*: *soy profesor*, *soy escocesa*.',
    fix: (s) => s.replace(/\bestoy (un |una )?/, 'soy '),
  },
  {
    id: 'tener-states',
    type: 'grammar',
    test: /\b(estoy|soy) (hambre|sed|frio|calor|sueno|miedo|prisa|razon)\b/,
    message: 'Spanish *has* hunger, thirst and cold: *tengo hambre*, *tengo frío*.',
    fix: (s) => s.replace(/\b(estoy|soy) (hambre|sed|frio|calor|sueno|miedo|prisa|razon)\b/, 'tengo $2'),
  },
  {
    id: 'ser-location',
    type: 'grammar',
    test: /\bdonde es (el|la|los|las|mi|tu)\b/,
    message: 'For where something *is*, use *estar*: *¿dónde está el baño?*',
    fix: (s) => s.replace(/\bdonde es\b/, 'dónde está'),
  },
  {
    id: 'yo-es',
    type: 'grammar',
    test: /\byo es\b/,
    message: 'With *yo* it\'s *soy*: *yo soy Charlie*.',
    fix: (s) => s.replace(/\byo es\b/, 'yo soy'),
  },
  {
    id: 'tu-es',
    type: 'grammar',
    test: /\btu es\b/,
    message: 'With *tú* it\'s *eres*: *tú eres muy simpático*.',
    fix: (s) => s.replace(/\btu es\b/, 'tú eres'),
  },
  {
    id: 'yo-third-person',
    type: 'grammar',
    test: new RegExp(`\\byo (${Object.keys(YO_FORMS).join('|')})\\b`),
    message: 'With *yo*, the verb usually ends in *-o*: *yo tengo*, *yo quiero*, *yo como*.',
    fix: (s) => s.replace(new RegExp(`\\byo (${Object.keys(YO_FORMS).join('|')})\\b`), (_m, v: string) => `yo ${YO_FORMS[v]}`),
  },
  {
    id: 'a-el',
    type: 'grammar',
    test: /\ba el (?!que)\w+/,
    message: '*a + el* squeezes into *al*: *voy al cine*.',
    fix: (s) => s.replace(/\ba el\b/, 'al'),
  },
  {
    id: 'masc-a',
    type: 'grammar',
    test: /\b(la|una) (problema|dia|mapa|idioma|programa|sistema|tema|clima|planeta)\b/,
    message: 'Sneaky one — that word is masculine even though it ends in *-a*: *el problema*, *el día*.',
    fix: (s) => s.replace(/\b(la|una) (problema|dia|mapa|idioma|programa|sistema|tema|clima|planeta)\b/, (_m, art: string, w: string) => `${art === 'la' ? 'el' : 'un'} ${w === 'dia' ? 'día' : w}`),
  },
  {
    id: 'fem-o',
    type: 'grammar',
    test: /\b(el|un) (mano|foto|moto|radio)\b/,
    message: 'That one\'s feminine even though it ends in *-o*: *la mano*, *la foto*.',
    fix: (s) => s.replace(/\b(el|un) (mano|foto|moto|radio)\b/, (_m, art: string, w: string) => `${art === 'el' ? 'la' : 'una'} ${w}`),
  },
  {
    id: 'mas-mejor',
    type: 'grammar',
    test: /\bmas (mejor|peor)\b/,
    message: '*Mejor* already means "better" (and *peor* "worse") — no *más* needed.',
    fix: (s) => s.replace(/\bmas (mejor|peor)\b/, '$1'),
  },
  {
    id: 'muy-mucho',
    type: 'grammar',
    test: /\bmuy mucho\b/,
    message: 'Just *mucho* — or *muchísimo* if you really mean it.',
    fix: (s) => s.replace(/\bmuy mucho\b/, 'muchísimo'),
  },
  {
    id: 'espero-que',
    type: 'grammar',
    test: /\b(espero|quiero|ojala) que (tu )?(tienes|estas|eres|vienes|puedes|haces|vas|hablas|comes)\b/,
    message: 'After *espero que* / *quiero que*, Spanish switches to the subjunctive: *espero que tengas un buen día*.',
    fix: (s) => s.replace(/\b(espero|quiero|ojala) que (tu )?(\w+)\b/, (_m, v: string, tu: string | undefined, verb: string) => `${v === 'ojala' ? 'ojalá' : v} que ${tu ? 'tú ' : ''}${SUBJUNCTIVE[verb] ?? verb}`),
  },
  {
    id: 'no-creo-que',
    type: 'grammar',
    test: /\bno creo que (es|esta|tiene|hay|va|puede|viene|hace|sabe)\b/,
    message: '*No creo que* is followed by the subjunctive: *no creo que sea verdad*.',
    fix: (s) => s.replace(/\bno creo que (\w+)\b/, (_m, verb: string) => `no creo que ${SUBJUNCTIVE[verb] ?? verb}`),
  },
  {
    id: 'si-conditional',
    type: 'grammar',
    test: /\bsi (yo )?(tendria|seria|podria|iria|haria|estaria)\b/,
    message: 'After *si*, use the imperfect subjunctive — the conditional goes in the other half: *si tuviera tiempo, viajaría*.',
  },
  {
    id: 'gente-plural',
    type: 'grammar',
    test: /\bla gente (son|estan|tienen|hablan)\b/,
    message: '*La gente* is singular in Spanish: *la gente es muy simpática*.',
    fix: (s) => s.replace(/\bla gente son\b/, 'la gente es').replace(/\bla gente estan\b/, 'la gente está').replace(/\bla gente tienen\b/, 'la gente tiene').replace(/\bla gente hablan\b/, 'la gente habla'),
  },
  {
    id: 'soy-de-acuerdo',
    type: 'grammar',
    test: /\bsoy de acuerdo\b/,
    message: 'Agreeing uses *estar*: *estoy de acuerdo*.',
    fix: (s) => s.replace(/\bsoy de acuerdo\b/, 'estoy de acuerdo'),
  },
  {
    id: 'duele-plural',
    type: 'grammar',
    test: /\bme duele (los|las|mis) /,
    message: 'More than one thing hurting? *Me duelen los pies*.',
    fix: (s) => s.replace(/\bme duele (los|las|mis) /, 'me duelen $1 '),
  },
  {
    id: 'hay-article',
    type: 'grammar',
    test: /\bhay (el|la|los|las) /,
    message: '*Hay* goes with *un/una* or no article: *hay un banco cerca*.',
  },
];

/** Puts the player's own spellings (accents, capitalised names) back into a rewritten sentence. */
function restoreSpelling(fixed: string, original: string): string {
  const spelled = new Map<string, string>();
  original.split(' ').forEach((word, i) => {
    const plain = stripAccents(word.toLowerCase());
    if (!plain) return;
    // The first word is capitalised because it starts the sentence — keep only its accents.
    const form = i === 0 ? word.toLowerCase() : word;
    if (form !== plain) spelled.set(plain, form);
  });
  return fixed
    .split(' ')
    .map((word) => spelled.get(word) ?? word)
    .join(' ');
}

export function detectCommonMistake(input: string): MistakeHint | null {
  const cleaned = input.replace(/[¿?¡!.,;:"]/g, ' ').replace(/\s+/g, ' ').trim();
  const plain = stripAccents(cleaned.toLowerCase());
  if (!plain) return null;
  for (const rule of RULES) {
    if (!rule.test.test(plain)) continue;
    let corrected: string | undefined;
    if (rule.fix) {
      const fixed = rule.fix(plain);
      if (fixed !== plain) corrected = `${capitalise(restoreSpelling(fixed, cleaned))}.`;
    }
    return { id: rule.id, type: rule.type, message: rule.message, corrected };
  }
  return null;
}
