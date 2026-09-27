import {
  conversation,
  defineLesson,
  emma,
  fill,
  listen,
  match,
  meaning,
  order,
  question,
  recall,
  speak,
  translate,
  understand,
  you,
} from '@/lib/curriculum/dsl';

export default defineLesson({
  id: 'l5-review',
  title: 'Real Conversations',
  description: 'Put Level 5 together — past, future, feelings and flair',
  emoji: '⭐',
  difficulty: 8,
  milestone: true,
  vocabulary: [],
  exercises: [
    match('vale', 'me-da-igual', 'echo-de-menos', 'agobiado', 'quizas'),
    meaning('solia'),
    recall('me-gustaria'),
    fill('Cuando era pequeño ___ en un pueblo.', 'vivía', ['viví', 'viviré'], 'When I was little I lived in a village.'),
    fill('Estaba en la ducha cuando ___ el teléfono.', 'sonó', ['sonaba', 'suena'], 'I was in the shower when the phone rang.'),
    fill('¿Las entradas? Ya ___ compré.', 'las', ['los', 'les'], 'The tickets? I already bought them.'),
    fill('Gracias ___ venir.', 'por', ['para', 'de'], 'Thanks for coming.'),
    question('Which is a polite request?', '¿Podría decirme la hora?', ['¡Dime la hora!', 'Diré la hora.']),
    listen('Algún día viviré en España y seré muy feliz', 'One day I will live in Spain and I will be very happy'),
    order('Me gustaría viajar más, pero no tengo tiempo', "I'd like to travel more, but I don't have time"),
    translate("I'd love to go with you", ['Me encantaría ir contigo']),
    speak('¡Qué fuerte! ¿En serio?', 'No way! Really?'),
    understand('Le dije la verdad, pero no me creyó', ["I told him the truth, but he didn't believe me", "I told her the truth, but she didn't believe me"]),
    conversation('A real conversation', [
      emma(
        '¡Hola, {name}! ¿Qué tal la semana?',
        'Hi {name}! How was your week?',
        you(['Bien {any}', 'Muy bien {any}', 'Genial {any}', 'Estoy {any}', 'Fatal {any}', 'Regular {any}', 'Más o menos {any}'], 'Good, but I’m a bit stressed.', {
          hint: 'Bien, pero estoy un poco agobiado',
          wrong: ['Para mañana', 'Lo compré ayer'],
        }),
      ),
      emma(
        '¿Qué hacías cuando eras pequeño los fines de semana?',
        'What did you use to do at weekends when you were little?',
        you(['Jugaba {any}', 'Iba {any}', 'Solía {any}', 'Veía {any}', 'Siempre {any}', 'Me gustaba {any}'], 'I used to go to the beach.', {
          hint: 'Iba a la playa',
          wrong: ['Me dedico a la enseñanza', 'Iré a Madrid'],
        }),
      ),
      emma(
        '¿Y qué harás este fin de semana?',
        'And what will you do this weekend?',
        you(['Iré {any}', 'Voy a {any}', 'Quizás {any}', 'Veré {any}', 'Haré {any}', 'Saldré {any}', 'Descansaré {any}', 'Nada {any}'], "I'll see my friends.", {
          hint: 'Veré a mis amigos',
          wrong: ['Echo de menos Escocia', 'Tengo fiebre'],
        }),
      ),
      emma('¡Qué guay! Ya hablas con fluidez. Level 5, ¡superado! 💬', 'How cool! You speak fluently now. Level 5, conquered!'),
    ]),
  ],
});
