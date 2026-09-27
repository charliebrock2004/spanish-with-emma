import {
  conversation,
  defineLesson,
  emma,
  intro,
  listen,
  match,
  meaning,
  order,
  question,
  speak,
  tip,
  translate,
  word,
  you,
} from '@/lib/curriculum/dsl';

export default defineLesson({
  id: 'l1-me-llamo',
  title: 'Introducing Yourself',
  description: 'Say your name and meet people',
  emoji: '🙋',
  difficulty: 1,
  vocabulary: [
    word('me-llamo', 'me llamo', 'my name is', 'people', {
      pron: 'meh YA-mo',
      note: 'Literally "I call myself".',
    }),
    word('soy', 'soy', 'I am', 'people', { pron: 'SOY' }),
    word('como-te-llamas', '¿cómo te llamas?', "what's your name?", 'questions', {
      pron: 'KO-mo teh YA-mas',
      enAlt: ['what is your name?'],
    }),
    word('encantado', 'encantado', 'nice to meet you', 'people', {
      pron: 'en-kan-TA-do',
      alt: ['encantada'],
      enAlt: ['pleased to meet you', 'delighted'],
      note: 'A man says *encantado*; a woman says *encantada*.',
    }),
    word('mucho-gusto', 'mucho gusto', 'pleased to meet you', 'people', {
      pron: 'MOO-cho GOOS-to',
      enAlt: ['nice to meet you'],
    }),
    word('y-tu', '¿y tú?', 'and you?', 'questions', { pron: 'ee TOO' }),
  ],
  exercises: [
    intro('me-llamo', { lines: ['To give your name, say *me llamo*…', 'So I say: *Me llamo Emma.*'] }),
    tip(
      'Double L',
      'In most of Spain *ll* sounds like the "y" in "yes". *Me llamo* → "meh YA-mo".',
      [
        { spanish: 'me llamo', english: 'my name is', pronunciation: 'meh YA-mo' },
        { spanish: '¿cómo te llamas?', english: "what's your name?", pronunciation: 'KO-mo teh YA-mas' },
      ],
    ),
    speak('Me llamo {name}', 'My name is {name}', { prompt: 'Now you — say *me llamo* and your name.' }),
    intro('soy', { lines: ['Even shorter: *soy* means *I am*.', '*Soy Emma.*'] }),
    translate('I am {name}', ['Soy {name}', 'Yo soy {name}']),
    intro('como-te-llamas', { lines: ["To ask someone's name: *¿cómo te llamas?*"] }),
    listen('¿Cómo te llamas?', "What's your name?"),
    intro('encantado', { lines: ['When you meet someone: *encantado* — or *encantada* if you\'re a woman.'] }),
    question('Emma meets you for the first time. What does she say?', 'Encantada', ['Encantado', 'Adiós'], {
      explanation: 'Emma is a woman, so she says *encantada*. A man says *encantado*.',
    }),
    intro('mucho-gusto', { lines: ['*Mucho gusto* works for everyone.'] }),
    intro('y-tu', { lines: ['And to bounce the question back: *¿y tú?*'] }),
    meaning('como-te-llamas'),
    order('Me llamo Emma, ¿y tú?', 'My name is Emma, and you?'),
    match('me-llamo', 'soy', 'encantado', 'y-tu'),
    speak('mucho-gusto'),
    translate('My name is Emma', ['Me llamo Emma', 'Mi nombre es Emma']),
    conversation('Meeting Emma', [
      emma(
        '¡Hola! Me llamo Emma. ¿Cómo te llamas?',
        "Hi! My name's Emma. What's your name?",
        you(['Me llamo {any}', 'Soy {any}', 'Mi nombre es {any}'], 'My name is {name}.', {
          hint: 'Me llamo {name}',
          wrong: ['De nada', 'Buenas noches'],
        }),
      ),
      emma(
        '¡Encantada, {name}!',
        'Nice to meet you, {name}!',
        you(['Encantado', 'Encantada', 'Mucho gusto', 'Igualmente'], 'Nice to meet you!', {
          hint: 'Mucho gusto',
          wrong: ['Lo siento', 'Por favor'],
        }),
      ),
      emma('¡Hasta luego, {name}!', 'See you later!', you(['Adiós', 'Hasta luego'], 'Goodbye!', { wrong: ['Gracias', 'Sí'] })),
    ]),
  ],
});
