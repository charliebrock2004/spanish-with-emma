import {
  conversation,
  defineLesson,
  emma,
  fill,
  listen,
  match,
  meaning,
  order,
  recall,
  speak,
  translate,
  you,
} from '@/lib/curriculum/dsl';

export default defineLesson({
  id: 'l1-review',
  title: 'Your First Conversation',
  description: 'Put Level 1 together — then chat with Emma',
  emoji: '⭐',
  difficulty: 3,
  milestone: true,
  vocabulary: [],
  exercises: [
    listen('Buenos días'),
    meaning('lo-siento'),
    recall('genial'),
    fill('___ de Escocia.', 'Soy', ['Estoy', 'Tengo'], "I'm from Scotland.", {
      explanation: 'Where you\'re from uses *soy* (ser).',
    }),
    fill('___ bien, gracias.', 'Estoy', ['Soy', 'Tengo'], "I'm fine, thanks.", {
      explanation: 'How you feel uses *estoy* (estar).',
    }),
    fill('___ veinte años.', 'Tengo', ['Soy', 'Estoy'], "I'm twenty.", {
      explanation: 'Age uses *tengo* — you "have" years.',
    }),
    translate('My name is Emma', ['Me llamo Emma', 'Mi nombre es Emma', 'Soy Emma']),
    order('Hola, me llamo Emma', 'Hi, my name is Emma'),
    speak('¿Cómo estás?', 'How are you?'),
    match('gracias', 'por-favor', 'de-nada', 'perdon', 'adios'),
    listen('Tengo treinta años', "I'm thirty"),
    translate('Nice to meet you', ['Encantado', 'Encantada', 'Mucho gusto']),
    order('Soy de Escocia y vivo en Madrid', "I'm from Scotland and I live in Madrid"),
    speak('Soy de Escocia', "I'm from Scotland", {
      prompt: 'Tell me where you\'re from — any country works.',
      accept: ['Soy de {any}'],
    }),
    translate('Thank you very much', ['Muchas gracias']),
    conversation('Your first real conversation', [
      emma(
        '¡Hola! ¿Cómo te llamas?',
        "Hi! What's your name?",
        you(['Me llamo {any}', 'Soy {any}', 'Mi nombre es {any}'], 'My name is {name}.', {
          hint: 'Me llamo {name}',
          wrong: ['Tengo veinte años', 'Adiós'],
        }),
      ),
      emma(
        '¡Encantada, {name}! ¿Cómo estás?',
        'Nice to meet you, {name}! How are you?',
        you(['Estoy {any}', 'Muy bien {any}', 'Bien {any}', 'Genial', 'Más o menos'], "I'm fine, thanks.", {
          hint: 'Estoy bien, gracias',
          wrong: ['Soy de Escocia', 'De nada'],
        }),
      ),
      emma(
        '¿De dónde eres?',
        'Where are you from?',
        you(['Soy de {any}', 'De {any}'], "I'm from Scotland.", { hint: 'Soy de Escocia', wrong: ['Tengo frío', 'Por favor'] }),
      ),
      emma(
        '¡Qué bien! ¿Cuántos años tienes?',
        'Great! How old are you?',
        you(['Tengo {number} años', 'Tengo {number}'], "I'm thirty.", { hint: 'Tengo treinta años', wrong: ['Me llamo Emma', 'Sí'] }),
      ),
      emma(
        '¿Cuál es tu color favorito?',
        "What's your favourite colour?",
        you(['{any} rojo', '{any} azul', '{any} verde', '{any} amarillo', '{any} negro', '{any} blanco', '{any} rosa', '{any} naranja', '{any} gris', '{any} morado'], 'Blue.', {
          hint: 'Mi color favorito es el azul',
          wrong: ['Hasta luego', 'Lo siento'],
        }),
      ),
      emma(
        '¡Genial! Hablas muy bien español. ¡Hasta luego!',
        'Great! You speak Spanish really well. See you later!',
        you(['Adiós', 'Hasta luego', 'Gracias {any}', 'Muchas gracias'], 'Thanks! Bye!', { hint: '¡Muchas gracias! Adiós', wrong: ['Buenos días', 'Encantada'] }),
      ),
    ]),
  ],
});
