import type { GuidedAnswer, GuidedScenario, Line } from '@/lib/conversation/types';

/**
 * Special scenes — extra guided conversations unlocked in the shop. Same
 * engine as the other scenes: flexible answers, memory, hints and simpler
 * re-asks. Pitched at Level 3 (A2), but anyone who owns one can play it.
 */

const L = (spanish: string, english: string): Line => ({ spanish, english });

const YES = ['sí {any}', 'claro {any}', 'por supuesto {any}', 'me gusta {any}', 'me encanta {any}', 'vale {any}', 'mucho {any}', 'una vez {any}', 'bastante {any}'];
const NO = ['no {any}', 'nunca {any}', 'nada {any}', 'para nada {any}', 'no mucho {any}', 'todavía no {any}'];
const ANY = ['{any}'];
const BYE = ['adiós {any}', 'hasta luego {any}', 'chao {any}', 'hasta pronto {any}', 'nos vemos {any}', 'gracias {any}', 'buenas noches {any}', '{any} adiós'];

const answer = (patterns: string[], next: string, react?: Line, capture?: GuidedAnswer['capture']): GuidedAnswer => ({ patterns, next, react, capture });

export const SPECIAL_SCENES: GuidedScenario[] = [
  {
    id: 'scene-flamenco',
    level: 3,
    emoji: '💃',
    title: 'Flamenco Night',
    description: 'A night out in Seville: tapas, a tablao and ¡olé!',
    defaults: { tapa: 'la tortilla', drink: 'una caña', plan: 'pasear' },
    start: 'hello',
    nodes: {
      hello: {
        emma: L('¡Bienvenido a Sevilla! Esta noche vamos a un tablao flamenco. ¿Has visto flamenco alguna vez?', "Welcome to Seville! Tonight we're going to a flamenco show. Have you ever seen flamenco?"),
        answers: [
          answer(YES, 'tapas', L('¡Genial! Entonces ya sabes que es increíble.', "Great! Then you already know it's incredible.")),
          answer(NO, 'tapas', L('¡Pues esta noche es tu primera vez! Te va a encantar.', "Then tonight's your first time! You're going to love it.")),
        ],
        hint: L('No, nunca.', 'No, never.'),
        simpler: L('¿Sí o no? ¿Has visto flamenco?', 'Yes or no? Have you seen flamenco?'),
      },
      tapas: {
        emma: L('Primero, unas tapas. ¿Qué te apetece: jamón, tortilla o gambas?', 'First, some tapas. What do you fancy: ham, tortilla or prawns?'),
        answers: [
          answer(
            ['{any} jamón {any}', '{any} tortilla {any}', '{any} gambas {any}', 'me apetece {any}', 'quiero {any}', 'quería {any}', 'para mí {any}', '{any} por favor'],
            'drink',
            L('¡Buena elección! {tapa} aquí es buenísima.', 'Good choice! The {tapa} here is amazing.'),
            { slot: 'tapa', regex: '(?:me apetece|quiero|quería|queria|para mí|para mi)?\\s*((?:el|la|las|los|un|una|unas|unos)?\\s*(?:jamón|jamon|tortilla|gambas))' },
          ),
        ],
        hint: L('Me apetece la tortilla.', 'I fancy the tortilla.'),
        simpler: L('¿Jamón, tortilla o gambas?', 'Ham, tortilla or prawns?'),
      },
      drink: {
        emma: L('¿Y para beber? ¿Una caña, un vino o un refresco?', 'And to drink? A small beer, a wine or a soft drink?'),
        answers: [
          answer(
            ['{any} caña {any}', '{any} vino {any}', '{any} refresco {any}', '{any} agua {any}', 'una {any}', 'un {any}', 'quiero {any}', 'para mí {any}'],
            'show',
            L('¡Marchando {drink}!', 'One {drink}, coming up!'),
            { slot: 'drink', regex: '((?:una|un)\\s+(?:caña|cana|vino(?: tinto| blanco)?|refresco|agua))' },
          ),
        ],
        hint: L('Una caña, por favor.', 'A small beer, please.'),
        simpler: L('¿Qué quieres beber?', 'What do you want to drink?'),
      },
      show: {
        emma: L('¡Shh! Mira, empieza el espectáculo. La guitarra, el cante… ¿Te gusta la música?', "Shh! Look, the show's starting. The guitar, the singing… Do you like the music?"),
        answers: [
          answer(YES, 'dance', L('A mí también. ¡Me pone los pelos de punta!', 'Me too. It gives me goosebumps!')),
          answer(NO, 'dance', L('¡Espera a ver el baile, ya verás!', 'Wait until you see the dancing!')),
        ],
        hint: L('Sí, me encanta.', 'Yes, I love it.'),
        simpler: L('La música, ¿te gusta? ¿Sí o no?', 'The music — do you like it? Yes or no?'),
      },
      dance: {
        emma: L('¿Y tú? ¿Sabes bailar?', 'And you? Can you dance?'),
        answers: [
          answer(['sí {any}', 'un poco {any}', 'claro {any}', 'sé bailar {any}', 'bailo {any}'], 'ole', L('¡Pues luego bailamos juntos!', "Then we'll dance together later!")),
          answer(['no {any}', 'fatal {any}', 'nada {any}', 'no sé {any}'], 'ole', L('¡Yo tampoco! Pero aplaudir sí sabemos. 👏', "Me neither! But we can clap!")),
        ],
        hint: L('Un poco, pero muy mal.', 'A bit, but really badly.'),
        simpler: L('¿Sabes bailar? ¿Sí o no?', 'Can you dance? Yes or no?'),
      },
      ole: {
        emma: L('Cuando la bailaora termina, todo el mundo grita «¡olé!». ¡Venga, dilo tú!', 'When the dancer finishes, everyone shouts "¡olé!". Go on, you say it!'),
        answers: [answer(['olé {any}', '{any} olé {any}', 'ole {any}', '{any} ole {any}'], 'plan', L('¡Olé! ¡Perfecto! Suenas muy sevillano.', 'Olé! Perfect! You sound very Sevillian.'))],
        hint: L('¡Olé!', 'Olé!'),
        simpler: L('Solo di: «¡olé!»', 'Just say: "¡olé!"'),
      },
      plan: {
        emma: L('¿Qué quieres hacer mañana? ¿Ver la catedral o pasear por el río?', 'What do you want to do tomorrow? See the cathedral or walk by the river?'),
        answers: [
          answer(
            ['{any} catedral {any}', '{any} río {any}', '{any} pasear {any}', 'quiero {any}', 'me gustaría {any}', 'prefiero {any}', '{any}'],
            'bye',
            L('¡Buen plan! Sevilla es preciosa por la mañana.', 'Good plan! Seville is beautiful in the morning.'),
          ),
        ],
        hint: L('Quiero ver la catedral.', 'I want to see the cathedral.'),
        simpler: L('¿La catedral o el río?', 'The cathedral or the river?'),
      },
      bye: {
        emma: L('¡Qué noche tan bonita! Gracias por venir conmigo.', 'What a lovely night! Thanks for coming with me.'),
        answers: [answer([...BYE, 'igualmente {any}', 'de nada {any}', ...ANY], 'end', L('¡Buenas noches! 🌙', 'Good night!'))],
        hint: L('¡Gracias a ti! Buenas noches.', 'Thank you! Good night.'),
      },
      end: { emma: L('¡Hasta mañana, compañero de flamenco!', 'See you tomorrow, flamenco buddy!'), end: true },
    },
  },
  {
    id: 'scene-navidad',
    level: 3,
    emoji: '🎄',
    title: 'Navidad in Madrid',
    description: 'Christmas in Spain: turrón, twelve grapes and the Three Kings.',
    defaults: { gift: 'un regalo bonito' },
    start: 'hello',
    nodes: {
      hello: {
        emma: L('¡Feliz Navidad! Estamos en la Plaza Mayor de Madrid, con el mercadillo de Navidad. ¿Te gusta la Navidad?', "Merry Christmas! We're in Madrid's Plaza Mayor, at the Christmas market. Do you like Christmas?"),
        answers: [
          answer(YES, 'home', L('¡A mí me encanta! Las luces, la música…', 'I love it! The lights, the music…')),
          answer(NO, 'home', L('¿No? ¡Pues a lo mejor la Navidad española te convence!', 'No? Well, maybe a Spanish Christmas will win you over!')),
        ],
        hint: L('Sí, me encanta la Navidad.', 'Yes, I love Christmas.'),
        simpler: L('La Navidad, ¿te gusta?', 'Christmas — do you like it?'),
      },
      home: {
        emma: L('¿Y cómo celebras la Navidad en tu país?', 'And how do you celebrate Christmas in your country?'),
        answers: [
          answer(
            ['{any} familia {any}', '{any} comemos {any}', '{any} como {any}', '{any} regalos {any}', 'con {any}', 'en casa {any}', ...ANY],
            'food',
            L('¡Qué bonito! En España, la noche más importante es la Nochebuena, el veinticuatro.', 'How lovely! In Spain, the most important night is Christmas Eve, the twenty-fourth.'),
          ),
        ],
        hint: L('Con mi familia. Comemos pavo.', 'With my family. We eat turkey.'),
        simpler: L('¿Celebras la Navidad con tu familia?', 'Do you celebrate Christmas with your family?'),
      },
      food: {
        emma: L('En Nochebuena comemos marisco, cordero… ¡y turrón! ¿Te gusta el turrón?', 'On Christmas Eve we eat seafood, lamb… and turrón! Do you like turrón?'),
        answers: [
          answer(YES, 'grapes', L('¡A mí también! El de chocolate es mi favorito.', 'Me too! The chocolate one is my favourite.')),
          answer([...NO, 'no sé {any}', '¿qué es {any}', 'qué es {any}'], 'grapes', L('Es un dulce de almendra y miel. ¡Tienes que probarlo!', "It's a sweet made of almonds and honey. You have to try it!")),
        ],
        hint: L('No sé. ¿Qué es el turrón?', "I don't know. What's turrón?"),
        simpler: L('El turrón es un dulce. ¿Te gustan los dulces?', 'Turrón is a sweet. Do you like sweets?'),
      },
      grapes: {
        emma: L('En Nochevieja comemos doce uvas, una con cada campanada. ¿Puedes comer doce uvas en doce segundos?', "On New Year's Eve we eat twelve grapes, one on each chime of the clock. Can you eat twelve grapes in twelve seconds?"),
        answers: [
          answer(YES, 'lottery', L('¡Ja, ja! Eso dicen todos… ¡es más difícil de lo que parece!', "Ha ha! Everyone says that… it's harder than it looks!")),
          answer([...NO, 'imposible {any}', 'es imposible {any}'], 'lottery', L('¡Yo tampoco! Siempre acabo con la boca llena. 🍇', 'Me neither! I always end up with my mouth full.')),
        ],
        hint: L('¡No, es imposible!', "No, it's impossible!"),
        simpler: L('Doce uvas, doce segundos. ¿Puedes?', 'Twelve grapes, twelve seconds. Can you?'),
      },
      lottery: {
        emma: L('El veintidós de diciembre es la lotería de Navidad: ¡El Gordo! ¿Compras lotería?', 'On the twenty-second of December it’s the Christmas lottery: El Gordo! Do you buy lottery tickets?'),
        answers: [
          answer(YES, 'kings', L('¡Ojalá te toque! Si ganas, me invitas a un chocolate con churros. 😄', 'Fingers crossed! If you win, you can buy me hot chocolate and churros.')),
          answer(NO, 'kings', L('Muy sensato. ¡Yo solo compro un décimo con mi familia!', 'Very sensible. I just buy one ticket with my family!')),
        ],
        hint: L('No, nunca compro lotería.', 'No, I never buy lottery tickets.'),
        simpler: L('¿Compras lotería? ¿Sí o no?', 'Do you buy lottery tickets? Yes or no?'),
      },
      kings: {
        emma: L('Y el seis de enero vienen los Reyes Magos con regalos. ¿Qué quieres de regalo este año?', 'And on the sixth of January the Three Kings come with presents. What do you want as a present this year?'),
        answers: [
          answer(
            ['quiero {any}', 'me gustaría {any}', 'un {any}', 'una {any}', 'unos {any}', 'unas {any}', ...ANY],
            'wish',
            L('¡Ojalá te traigan {gift}!', 'I hope they bring you {gift}!'),
            { slot: 'gift', regex: '(?:quiero|me gustaría|me gustaria)?\\s*((?:un|una|unos|unas)\\s+[\\p{L} ]+)' },
          ),
        ],
        hint: L('Quiero un libro en español.', 'I want a book in Spanish.'),
        simpler: L('¿Qué regalo quieres?', 'What present do you want?'),
      },
      wish: {
        emma: L('Para terminar: ¿qué deseas para el año nuevo?', 'To finish: what do you wish for the new year?'),
        answers: [answer(['deseo {any}', 'quiero {any}', 'me gustaría {any}', 'espero {any}', ...ANY], 'bye', L('¡Qué bonito deseo! Seguro que lo consigues.', "What a lovely wish! I'm sure you'll make it happen."))],
        hint: L('Deseo hablar mejor español.', 'I wish to speak better Spanish.'),
        simpler: L('¿Qué quieres para el año nuevo?', 'What do you want for the new year?'),
      },
      bye: {
        emma: L('¡Felices fiestas y próspero año nuevo!', 'Happy holidays and a prosperous new year!'),
        answers: [answer([...BYE, 'igualmente {any}', 'feliz navidad {any}', 'felices fiestas {any}', ...ANY], 'end', L('¡Feliz Navidad! 🎄', 'Merry Christmas!'))],
        hint: L('¡Igualmente! ¡Feliz Navidad!', 'You too! Merry Christmas!'),
      },
      end: { emma: L('¡Nos vemos el año que viene!', 'See you next year!'), end: true },
    },
  },
];

export const SPECIAL_SCENE_IDS = new Set(SPECIAL_SCENES.map((s) => s.id));
