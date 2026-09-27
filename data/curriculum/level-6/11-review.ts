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
  id: 'l6-review',
  title: 'Fluent Foundations',
  description: 'The final challenge — a real, nuanced conversation with Emma',
  emoji: '🏆',
  difficulty: 10,
  milestone: true,
  vocabulary: [],
  exercises: [
    match('sin-embargo', 'pan-comido', 'por-lo-visto', 'yo-que-tu', 'sobremesa'),
    meaning('meter-la-pata'),
    recall('ojala'),
    fill('Espero que te ___ bien en el examen.', 'vaya', ['va', 'irá'], 'I hope the exam goes well for you.'),
    fill('No creo que ___ razón.', 'tengas', ['tienes', 'tendrás'], "I don't think you're right."),
    fill('Si ___ más tiempo, aprendería italiano.', 'tuviera', ['tengo', 'tendría'], "If I had more time, I'd learn Italian."),
    fill('Me dijo que ___ al día siguiente.', 'vendría', ['vendrá', 'viene'], 'He said he would come the next day.'),
    question('Which sentence is correct?', 'Aunque llueva, iremos a la playa', ['Aunque lloverá, iremos a la playa', 'Aunque llover, iremos a la playa']),
    listen('Te recomiendo que no trasnoches antes de la entrevista', "I recommend you don't stay up late before the interview"),
    order('Por un lado es caro; sin embargo, merece la pena', "On the one hand it's expensive; however, it's worth it"),
    translate("I'm glad you're here", ['Me alegro de que estés aquí']),
    speak('Ojalá pudiera quedarme más tiempo en España', 'I wish I could stay longer in Spain'),
    understand('Si me tocara la lotería, me compraría una casa con jardín', ["If I won the lottery, I'd buy myself a house with a garden", 'If I won the lottery, I would buy a house with a garden']),
    conversation('Fluent Foundations', [
      emma(
        '{name}, ¿te acuerdas de tu primera palabra en español?',
        '{name}, do you remember your first word in Spanish?',
        you(['Sí {any}', 'Fue {any}', '¡Hola! {any}', 'Hola {any}', 'Claro {any}', 'Creo que {any}'], 'Yes, it was "hola"!', {
          hint: 'Sí, fue «hola»',
          wrong: ['Me da rabia', 'Por lo tanto'],
        }),
      ),
      emma(
        'Y ahora mírate. ¿Qué es lo que más te ha gustado de aprender español?',
        'And look at you now. What have you enjoyed most about learning Spanish?',
        you(['Lo que más me ha gustado {any}', 'Me ha gustado {any}', 'Me encanta {any}', 'Me encantó {any}', 'Hablar {any}', 'Las conversaciones {any}', 'Creo que {any}'], 'What I enjoyed most was talking with you.', {
          hint: 'Lo que más me ha gustado es hablar contigo',
          wrong: ['Si me tocara la lotería', 'Atentamente'],
        }),
      ),
      emma(
        '¡Qué bonito! Y si pudieras darle un consejo a alguien que empieza, ¿qué le dirías?',
        'That’s lovely! And if you could give someone who’s starting out one piece of advice, what would you tell them?',
        you(['Le diría que {any}', 'Le recomendaría que {any}', 'Que {any}', 'Le aconsejaría que {any}', 'Yo que tú {any}', 'Le diría {any}'], "I'd tell them to speak every day, without fear.", {
          hint: 'Le diría que hablara todos los días, sin miedo',
          wrong: ['Tengo un hermano', 'Hace sol'],
        }),
      ),
      emma(
        'Perfecto. Has llegado muy lejos, {name}. Estoy muy orgullosa de ti. ¡Y esto no acaba aquí! 🔥',
        "Perfect. You've come so far, {name}. I'm so proud of you. And this isn't the end!",
      ),
    ]),
  ],
});
