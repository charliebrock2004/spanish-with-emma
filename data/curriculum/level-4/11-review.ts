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
  id: 'l4-review',
  title: 'The Big Trip',
  description: 'Put Level 4 together — plan, travel and tell the story',
  emoji: '⭐',
  difficulty: 7,
  milestone: true,
  vocabulary: [],
  exercises: [
    match('vuelo', 'billete', 'anden', 'entrada', 'horario'),
    meaning('merece-la-pena'),
    recall('ida-y-vuelta'),
    fill('¿___ estado alguna vez en Cuba?', 'Has', ['He', 'Fui'], 'Have you ever been to Cuba?'),
    fill('El verano pasado ___ a Mallorca.', 'fui', ['he ido', 'voy'], 'Last summer I went to Mallorca.', {
      explanation: 'A finished time (*el verano pasado*) → the simple past: *fui*.',
    }),
    fill('Madrid es más grande ___ Sevilla.', 'que', ['como', 'de'], 'Madrid is bigger than Seville.'),
    question('Which sentence is correct?', 'La paella es mejor que la pizza', ['La paella es más buena que la pizza', 'La paella es mejor como la pizza']),
    listen('El vuelo tiene retraso y he perdido mi maleta', 'The flight is delayed and I have lost my suitcase'),
    order('Primero fuimos al museo y luego comimos', 'First we went to the museum and then we ate'),
    translate('I think it’s worth it', ['Creo que merece la pena', 'Me parece que merece la pena']),
    speak('Lo pasé genial en España', 'I had a great time in Spain'),
    understand('Todavía no he visitado Granada, pero el año que viene voy a ir', ["I haven't visited Granada yet, but next year I'm going to go"]),
    translate("I don't agree, it's boring", ['No estoy de acuerdo, es aburrido', 'No estoy de acuerdo. Es aburrido']),
    conversation('Your big trip', [
      emma(
        '¡Hola, viajero! ¿Cuál es el mejor viaje de tu vida?',
        'Hi, traveller! What’s the best trip of your life?',
        you(['El mejor {any}', 'Fui a {any}', 'Mi viaje a {any}', 'Cuando fui a {any}'], 'When I went to Italy.', {
          hint: 'Cuando fui a Italia',
          wrong: ['Me duele la cabeza', 'No funciona'],
        }),
      ),
      emma(
        '¿Qué hiciste allí?',
        'What did you do there?',
        you(['Visité {any}', 'Comí {any}', 'Fui {any}', 'Vi {any}', 'Conocí {any}', 'Primero {any}'], 'I visited lots of museums.', {
          hint: 'Visité muchos museos',
          wrong: ['Tengo un hermano', 'Prefiero el té'],
        }),
      ),
      emma(
        '¿Y a dónde vas a viajar la próxima vez?',
        'And where are you going to travel next time?',
        you(['Voy a {any}', 'A {any}', 'Quiero {any}', 'Me gustaría {any}'], "I'm going to travel to Mexico.", {
          hint: 'Voy a viajar a México',
          wrong: ['Ayer comí paella', 'Está roto'],
        }),
      ),
      emma('¡Increíble! Ya viajas en español. Level 4, ¡conseguido! ✈️', 'Amazing! You travel in Spanish now. Level 4, achieved!'),
    ]),
  ],
});
