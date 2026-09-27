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
  id: 'l3-review',
  title: 'A Day Out in Madrid',
  description: 'Put Level 3 together — café, shops, directions and plans',
  emoji: '⭐',
  difficulty: 5,
  milestone: true,
  vocabulary: [],
  exercises: [
    match('me-pone', 'la-cuenta', 'postre', 'talla', 'llave'),
    meaning('todo-recto'),
    recall('hace-calor'),
    fill('¿Me ___ un cortado, por favor?', 'pone', ['pongo', 'llevo'], 'Could I have a cortado, please?'),
    fill('___ una farmacia en la esquina.', 'Hay', ['Está', 'Es'], "There's a pharmacy on the corner."),
    fill('Mañana ___ a visitar el museo.', 'voy', ['vas', 'vamos'], "Tomorrow I'm going to visit the museum."),
    question('At a hotel reception, you’d say…', '¿Tiene una habitación doble?', ['¿Tienes una habitación doble, tío?', '¿Hay habitación, guapo?']),
    listen('Siga todo recto y gire a la izquierda', 'Go straight on and turn left'),
    order('Me levanto temprano y desayuno en la cafetería', 'I get up early and have breakfast at the café'),
    translate('How much does it cost?', ['¿Cuánto cuesta?', '¿Cuánto es?']),
    speak('La cuenta, por favor', 'The bill, please'),
    understand('Hoy hace sol, pero mañana va a llover', ["Today it's sunny, but tomorrow it's going to rain"]),
    listen('Me duele la cabeza, ¿tiene algo?', "I've got a headache, do you have anything?"),
    translate("I'm going to have dinner at nine", ['Voy a cenar a las nueve']),
    conversation('A day out in Madrid', [
      emma(
        '¡Hola, {name}! ¿Qué te apetece hacer hoy?',
        'Hi {name}! What do you fancy doing today?',
        you(['Me apetece {any}', 'Voy a {any}', 'Quiero {any}', 'Vamos a {any}'], 'I fancy visiting a museum.', {
          hint: 'Me apetece visitar un museo',
          wrong: ['Me duele la espalda', 'Llevo un jersey'],
        }),
      ),
      emma(
        '¡Buena idea! Primero, un café. ¿Qué tomas?',
        'Good idea! First, a coffee. What are you having?',
        you(['Un {any}', 'Una {any}', 'Para mí {any}', '¿Me pone {any}', 'Quiero {any}'], 'A cortado for me.', {
          hint: 'Para mí, un cortado',
          wrong: ['Hace viento', 'A la derecha'],
        }),
      ),
      emma(
        '¿Sabes dónde está el museo?',
        'Do you know where the museum is?',
        you(['Está {any}', 'Sí {any}', 'No {any}', 'Todo recto {any}', 'A la derecha {any}', 'A la izquierda {any}'], "It's straight on and to the left.", {
          hint: 'Está todo recto y a la izquierda',
          wrong: ['Tengo fiebre', 'Me levanto temprano'],
        }),
      ),
      emma('¡Perfecto! Tu español ya es de la vida real. Level 3, ¡hecho! 🌴', 'Perfect! Your Spanish is real-life now. Level 3, done!'),
    ]),
  ],
});
