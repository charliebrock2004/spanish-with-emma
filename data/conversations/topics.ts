import type { LevelId } from '@/types/curriculum';
import type { ChatTopic } from '@/types/chat';

export interface TopicDef extends ChatTopic {
  emoji: string;
  description: string;
  minLevel: LevelId;
  /** Emma's opening line by level band: 1–2, 3–4, 5–6. */
  openings: [Opening, Opening, Opening];
}

interface Opening {
  spanish: string;
  english: string;
}

const o = (spanish: string, english: string): Opening => ({ spanish, english });

/** Free conversation topics (AI mode). Emma adapts every reply to the player's level. */
export const CHAT_TOPICS: TopicDef[] = [
  {
    id: 'free',
    emoji: '💬',
    title: 'Free chat',
    description: 'Talk about anything you like.',
    brief: 'A relaxed free conversation. Follow the learner’s interests and ask about their life.',
    minLevel: 1,
    openings: [
      o('¡Hola, {name}! ¿Qué tal estás?', 'Hi {name}! How are you?'),
      o('¡Hola, {name}! ¿Qué tal? ¿Qué haces hoy?', 'Hi {name}! How are things? What are you doing today?'),
      o('¡Hola, {name}! ¿Qué has hecho hoy?', 'Hi {name}! What have you done today?'),
    ],
  },
  {
    id: 'your-day',
    emoji: '☀️',
    title: 'Your day',
    description: 'What you did, how you feel, your plans.',
    brief: 'Chat about the learner’s day: what they have done, how they feel and what they will do later.',
    minLevel: 1,
    openings: [
      o('¡Hola! ¿Cómo estás hoy?', 'Hi! How are you today?'),
      o('¡Hola! ¿Qué vas a hacer hoy?', 'Hi! What are you going to do today?'),
      o('¡Buenas! Cuéntame, ¿qué tal te ha ido el día?', "Hi! Tell me, how's your day been?"),
    ],
  },
  {
    id: 'food',
    emoji: '🥘',
    title: 'Food & cooking',
    description: 'Favourite dishes, cooking, Spanish food.',
    brief: 'Talk about food: favourite dishes, cooking, restaurants and Spanish food like tapas, paella and tortilla.',
    minLevel: 1,
    openings: [
      o('¡Hola! ¿Te gusta la comida española?', 'Hi! Do you like Spanish food?'),
      o('¡Hola! ¿Cuál es tu comida favorita?', "Hi! What's your favourite food?"),
      o('¡Hola! Oye, ¿qué es lo mejor que has comido en tu vida?', "Hi! So, what's the best thing you've ever eaten?"),
    ],
  },
  {
    id: 'tapas-bar',
    emoji: '🍷',
    title: 'Role-play: tapas bar',
    description: 'Emma is your waitress in Madrid.',
    brief: 'Role-play: Emma is a friendly waitress in a busy tapas bar in Madrid. The learner orders drinks and tapas, asks about the menu and pays. Stay in character.',
    minLevel: 2,
    openings: [
      o('¡Hola! Bienvenido. ¿Qué quieres beber?', 'Hi! Welcome. What would you like to drink?'),
      o('¡Buenas! ¿Qué te pongo?', 'Hi there! What can I get you?'),
      o('¡Buenas noches! ¿Ya sabéis lo que vais a tomar, o necesitas un momento?', 'Good evening! Do you know what you’d like, or do you need a moment?'),
    ],
  },
  {
    id: 'travel',
    emoji: '✈️',
    title: 'Travel',
    description: 'Trips you’ve taken and dream destinations.',
    brief: 'Talk about travel: places the learner has been, dream destinations and tips for visiting Spain.',
    minLevel: 2,
    openings: [
      o('¡Hola! ¿Te gusta viajar?', 'Hi! Do you like travelling?'),
      o('¡Hola! ¿Adónde te gustaría viajar?', 'Hi! Where would you like to travel?'),
      o('¡Hola! ¿Cuál ha sido el mejor viaje de tu vida?', "Hi! What's been the best trip of your life?"),
    ],
  },
  {
    id: 'films-music',
    emoji: '🎬',
    title: 'Films & music',
    description: 'What you watch and listen to.',
    brief: 'Talk about films, series and music the learner enjoys; recommend some Spanish films, series or songs.',
    minLevel: 3,
    openings: [
      o('¡Hola! ¿Te gusta la música?', 'Hi! Do you like music?'),
      o('¡Hola! ¿Qué música escuchas normalmente?', 'Hi! What music do you usually listen to?'),
      o('¡Hola! ¿Has visto alguna serie buena últimamente?', 'Hi! Have you watched any good series lately?'),
    ],
  },
  {
    id: 'big-questions',
    emoji: '🧠',
    title: 'Big questions',
    description: 'Opinions, debates and what-ifs.',
    brief: 'A friendly debate: ask for the learner’s opinions and reasons on everyday big questions (technology, cities vs countryside, work-life balance, what-if scenarios). Gently push back to keep it interesting.',
    minLevel: 5,
    openings: [
      o('¡Hola! ¿Te gusta tu ciudad?', 'Hi! Do you like your city?'),
      o('¡Hola! ¿Qué prefieres, la ciudad o el campo?', 'Hi! Which do you prefer, the city or the countryside?'),
      o('¡Hola! Pregunta difícil: si pudieras vivir en cualquier país, ¿dónde vivirías y por qué?', 'Hi! Tricky question: if you could live in any country, where would you live and why?'),
    ],
  },
];

export const TOPICS_BY_ID = new Map(CHAT_TOPICS.map((t) => [t.id, t]));

export function openingFor(topic: TopicDef, level: LevelId): Opening {
  return topic.openings[level <= 2 ? 0 : level <= 4 ? 1 : 2];
}
