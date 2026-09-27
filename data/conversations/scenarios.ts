import type { GuidedAnswer, GuidedScenario, Line } from '@/lib/conversation/types';

/**
 * Guided conversations with Emma, two or three per level. Each scene has a
 * natural flow, understands a range of replies, remembers what the player
 * says ({slots}), and simplifies when the player gets stuck.
 */

const L = (spanish: string, english: string): Line => ({ spanish, english });

const YES = ['sí {any}', 'claro {any}', 'por supuesto {any}', 'me gusta {any}', 'me encanta {any}', 'vale {any}', 'bastante {any}'];
const NO = ['no {any}', 'nada {any}', 'para nada {any}', 'no mucho {any}'];
const ANY = ['{any}'];
const BYE = ['adiós {any}', 'hasta luego {any}', 'chao {any}', 'chau {any}', 'hasta pronto {any}', 'nos vemos {any}', 'hasta mañana {any}', '{any} adiós', 'gracias {any}'];

const answer = (patterns: string[], next: string, react?: Line, capture?: GuidedAnswer['capture']): GuidedAnswer => ({
  patterns,
  next,
  react,
  capture,
});

const WORDS = '([\\p{L} ]+)';

export const SCENARIOS: GuidedScenario[] = [
  // ─── Level 1 ────────────────────────────────────────────────────────────
  {
    id: 'meet-emma',
    level: 1,
    emoji: '👋',
    title: 'Meeting Emma',
    description: 'Names, how you are, where you’re from.',
    defaults: { origin: 'tu país', place: 'tu ciudad' },
    start: 'name',
    nodes: {
      name: {
        emma: L('¡Hola! Me llamo Emma. ¿Cómo te llamas?', "Hi! I'm Emma. What's your name?"),
        answers: [
          answer(['me llamo {any}', 'soy {any}', 'mi nombre es {any}', '{name}'], 'how', L('¡Encantada, {pname}!', 'Nice to meet you, {pname}!'), {
            slot: 'pname',
            regex: '(?:me llamo|soy|mi nombre es)\\s+(\\p{L}+)',
          }),
        ],
        hint: L('Me llamo {name}.', 'My name is {name}.'),
        simpler: L('Yo me llamo Emma. ¿Y tú? ¿Cómo te llamas?', "My name's Emma. And you? What's your name?"),
      },
      how: {
        emma: L('¿Cómo estás?', 'How are you?'),
        answers: [
          answer(['{any} bien {any}', 'genial {any}', 'fenomenal {any}', 'estupendo {any}', 'muy bien {any}'], 'from', L('¡Qué bien! Me alegro.', "Great! I'm glad.")),
          answer(['{any} mal {any}', '{any} cansado {any}', '{any} cansada {any}', 'regular {any}', 'más o menos {any}'], 'from', L('Vaya… ¡Ánimo! Hablar español ayuda. 😉', 'Oh dear… Cheer up! Speaking Spanish helps.')),
        ],
        hint: L('Estoy bien, gracias.', "I'm fine, thanks."),
        simpler: L('¿Bien o mal? ¿Cómo estás hoy?', 'Good or bad? How are you today?'),
      },
      from: {
        emma: L('¿De dónde eres?', 'Where are you from?'),
        answers: [
          answer(['soy de {any}', 'de {any}', 'yo soy de {any}', 'soy {any}'], 'live', L('¡Ah, {origin}! ¡Qué bonito!', '{origin}! How lovely!'), {
            slot: 'origin',
            regex: `(?:soy de|de|soy)\\s+${WORDS}`,
          }),
        ],
        hint: L('Soy de Escocia.', "I'm from Scotland."),
        simpler: L('Yo soy de Escocia. ¿Y tú? ¿De dónde eres?', "I'm from Scotland. And you? Where are you from?"),
      },
      live: {
        emma: L('¿Y dónde vives ahora?', 'And where do you live now?'),
        answers: [
          answer(['vivo en {any}', 'en {any}', 'yo vivo en {any}'], 'like', L('¡Ah, {place}!', '{place}!'), {
            slot: 'place',
            regex: `(?:vivo en|en)\\s+${WORDS}`,
          }),
        ],
        hint: L('Vivo en Edimburgo.', 'I live in Edinburgh.'),
        simpler: L('Yo vivo en Madrid. ¿Y tú? ¿Dónde vives?', 'I live in Madrid. And you? Where do you live?'),
      },
      like: {
        emma: L('¿Te gusta vivir allí?', 'Do you like living there?'),
        answers: [
          answer(YES, 'age', L('¡Qué bien! Me encantaría visitar {place}.', "Great! I'd love to visit {place}.")),
          answer(NO, 'age', L('¡Vaya! Pues ven a Madrid, ¡aquí hace sol! ☀️', "Oh no! Well, come to Madrid — it's sunny here!")),
        ],
        hint: L('Sí, me gusta mucho.', 'Yes, I like it a lot.'),
        simpler: L('¿Sí o no? ¿Te gusta {place}?', 'Yes or no? Do you like {place}?'),
      },
      age: {
        emma: L('Una pregunta más: ¿cuántos años tienes?', 'One more question: how old are you?'),
        answers: [answer(['tengo {number} años', 'tengo {number}', '{number} años', '{number}'], 'bye', L('¡Perfecto!', 'Perfect!'))],
        hint: L('Tengo treinta años.', "I'm thirty."),
        simpler: L('Yo tengo veintinueve años. ¿Y tú? ¿Cuántos años tienes?', "I'm twenty-nine. And you? How old are you?"),
      },
      bye: {
        emma: L('¡Hablas muy bien español, {pname}! Me tengo que ir. ¡Hasta luego!', 'You speak Spanish really well, {pname}! I have to go. See you later!'),
        answers: [answer([...BYE, ...ANY], 'end', L('¡Adiós, {pname}! 👋', 'Bye, {pname}!'))],
        hint: L('¡Adiós, Emma!', 'Bye, Emma!'),
      },
      end: { emma: L('¡Hasta la próxima!', 'Until next time!'), end: true },
    },
  },
  {
    id: 'favourites',
    level: 1,
    emoji: '🎨',
    title: 'Favourite Things',
    description: 'Colours, numbers and what you like.',
    defaults: { colour: 'azul' },
    start: 'colour',
    nodes: {
      colour: {
        emma: L('¡Hola, {name}! Una pregunta: ¿cuál es tu color favorito?', "Hi {name}! A question: what's your favourite colour?"),
        answers: [
          answer(
            ['{any} rojo {any}', '{any} azul {any}', '{any} verde {any}', '{any} amarillo {any}', '{any} negro {any}', '{any} blanco {any}', '{any} rosa {any}', '{any} naranja {any}', '{any} gris {any}', '{any} morado {any}', '{any} lila {any}'],
            'number',
            L('¡El {colour}! Qué bonito. El mío es el verde. 💚', 'Lovely! Mine is green.'),
            { slot: 'colour', regex: '(rojo|azul|verde|amarillo|negro|blanco|rosa|naranja|gris|morado|lila)' },
          ),
        ],
        hint: L('Mi color favorito es el azul.', 'My favourite colour is blue.'),
        simpler: L('¿Rojo? ¿Azul? ¿Verde? ¿Qué color te gusta?', 'Red? Blue? Green? Which colour do you like?'),
      },
      number: {
        emma: L('¿Y tienes un número favorito?', 'And do you have a favourite number?'),
        answers: [
          answer(['{any} {number} {any}', 'sí {any}', 'mi número favorito es {any}'], 'coffee', L('¡Buen número! El mío es el siete. 🍀', "Good number! Mine is seven.")),
          answer(NO, 'coffee', L('¡Vale! El mío es el siete. 🍀', 'Okay! Mine is seven.')),
        ],
        hint: L('Mi número favorito es el tres.', 'My favourite number is three.'),
      },
      coffee: {
        emma: L('¿Te gusta el café?', 'Do you like coffee?'),
        answers: [
          answer(YES, 'speak', L('¡A mí también! Café con leche, siempre. ☕', 'Me too! Always a café con leche.')),
          answer(NO, 'speak', L('¿No? ¿Y el té? ¡Eres muy británico! 😄', 'No? And tea? Very British of you!')),
        ],
        hint: L('Sí, me gusta el café.', 'Yes, I like coffee.'),
      },
      speak: {
        emma: L('¿Hablas inglés?', 'Do you speak English?'),
        answers: [
          answer([...YES, 'hablo inglés {any}', '{any} inglés {any}'], 'bye', L('¡Y ahora hablas español también! 😉', 'And now you speak Spanish too!')),
          answer(NO, 'bye', L('¡Pues hablas español! Eso es lo importante. 😉', 'Well, you speak Spanish — that’s what matters!')),
        ],
        hint: L('Sí, hablo inglés.', 'Yes, I speak English.'),
      },
      bye: {
        emma: L('¡Me encanta hablar contigo! Hasta luego, {name}.', 'I love talking with you! See you later, {name}.'),
        answers: [answer([...BYE, ...ANY], 'end', L('¡Adiós! 👋', 'Bye!'))],
        hint: L('¡Hasta luego, Emma!', 'See you later, Emma!'),
      },
      end: { emma: L('¡Chao!', 'Bye!'), end: true },
    },
  },

  // ─── Level 2 ────────────────────────────────────────────────────────────
  {
    id: 'family',
    level: 2,
    emoji: '👨‍👩‍👧',
    title: 'Your Family',
    description: 'Brothers, sisters, pets and home.',
    defaults: { sibling: 'tu hermano' },
    start: 'siblings',
    nodes: {
      siblings: {
        emma: L('Hoy hablamos de la familia. ¿Tienes hermanos?', 'Today we talk about family. Do you have brothers or sisters?'),
        answers: [
          answer(['sí {any}', 'tengo {any} hermano {any}', 'tengo {any} hermana {any}', 'tengo {any} hermanos {any}', 'tengo {any}'], 'sibling-name', L('¡Qué bien!', 'Nice!')),
          answer(NO, 'pet', L('Vale, ¡eres hijo único o hija única! Yo tengo una hermana.', "Okay, you're an only child! I have a sister.")),
        ],
        hint: L('Sí, tengo un hermano.', 'Yes, I have a brother.'),
        simpler: L('¿Tienes un hermano o una hermana? ¿Sí o no?', 'Do you have a brother or a sister? Yes or no?'),
      },
      'sibling-name': {
        emma: L('¿Cómo se llama?', "What's their name?"),
        answers: [
          answer(['se llama {any}', 'se llaman {any}', 'mi hermano se llama {any}', 'mi hermana se llama {any}', '{any}'], 'older', L('¡{sibling}! Qué nombre tan bonito.', '{sibling}! What a lovely name.'), {
            slot: 'sibling',
            regex: '(?:se llama|se llaman)\\s+(\\p{L}+)',
          }),
        ],
        hint: L('Se llama Tom.', 'He’s called Tom.'),
      },
      older: {
        emma: L('¿Es mayor o menor que tú?', 'Is he or she older or younger than you?'),
        answers: [
          answer(['{any} mayor {any}', '{any} menor {any}', '{any} pequeño {any}', '{any} pequeña {any}', '{any} años {any}'], 'pet', L('¡Ah, vale! Yo soy la mayor en mi familia.', "Ah, okay! I'm the oldest in my family.")),
          answer(ANY, 'pet', L('¡Ah, muy bien!', 'Ah, very good!')),
        ],
        hint: L('Es mayor que yo.', "They're older than me."),
      },
      pet: {
        emma: L('¿Y tienes mascota? ¿Un perro, un gato…?', 'And do you have a pet? A dog, a cat…?'),
        answers: [
          answer(['{any} perro {any}', '{any} perra {any}', '{any} gato {any}', '{any} gata {any}', 'sí {any}', 'tengo {any}'], 'live-with', L('¡Me encantan los animales! Yo tengo un gato. Se llama Pepe. 🐱', 'I love animals! I have a cat called Pepe.')),
          answer(NO, 'live-with', L('Yo tengo un gato que se llama Pepe. ¡Es muy perezoso! 🐱', "I have a cat called Pepe. He's very lazy!")),
        ],
        hint: L('Sí, tengo un perro.', 'Yes, I have a dog.'),
      },
      'live-with': {
        emma: L('¿Vives con tu familia?', 'Do you live with your family?'),
        answers: [
          answer([...YES, 'vivo con {any}'], 'bye', L('¡Qué bonito!', 'How lovely!')),
          answer([...NO, 'vivo solo {any}', 'vivo sola {any}', 'vivo con {any}'], 'bye', L('¡Ah, muy bien! Yo vivo con una amiga en Madrid.', 'Ah, good! I live with a friend in Madrid.')),
        ],
        hint: L('Sí, vivo con mi familia.', 'Yes, I live with my family.'),
      },
      bye: {
        emma: L('Gracias por hablarme de tu familia, {name}. ¡Hasta pronto!', 'Thanks for telling me about your family, {name}. See you soon!'),
        answers: [answer([...BYE, ...ANY], 'end', L('¡Adiós! 👋', 'Bye!'))],
        hint: L('¡Hasta pronto!', 'See you soon!'),
      },
      end: { emma: L('¡Un abrazo!', 'A hug!'), end: true },
    },
  },
  {
    id: 'food-drink',
    level: 2,
    emoji: '🥘',
    title: 'Food & Drink',
    description: 'What you like to eat and drink.',
    defaults: { food: 'eso', drink: 'eso' },
    start: 'like',
    nodes: {
      like: {
        emma: L('¡Tengo hambre! 😋 ¿Qué te gusta comer?', "I'm hungry! What do you like to eat?"),
        answers: [
          answer(['me gusta {any}', 'me gustan {any}', 'me encanta {any}', 'me encantan {any}', 'yo gusto {any}', 'gusto {any}', '{any}'], 'dislike', L('¡Mmm, {food}! A mí también me gusta.', 'Mmm, {food}! I like it too.'), {
            slot: 'food',
            regex: '(?:me gustan?|me encantan?|gusto|como)\\s+(?:el |la |los |las |mucho )?([\\p{L} ]+)',
          }),
        ],
        hint: L('Me gusta la pizza.', 'I like pizza.'),
        simpler: L('¿Te gusta la pizza? ¿La paella? ¿Qué comida te gusta?', 'Do you like pizza? Paella? What food do you like?'),
      },
      dislike: {
        emma: L('¿Y qué no te gusta?', "And what don't you like?"),
        answers: [
          answer(['no me gusta {any}', 'no me gustan {any}', 'odio {any}', '{any}'], 'drink', L('¡Uf, te entiendo! A mí no me gustan las aceitunas.', "Ugh, I get it! I don't like olives.")),
        ],
        hint: L('No me gusta el pescado.', "I don't like fish."),
      },
      drink: {
        emma: L('¿Qué bebes por la mañana? ¿Café, té…?', 'What do you drink in the morning? Coffee, tea…?'),
        answers: [
          answer(['{any} café {any}', '{any} té {any}', '{any} zumo {any}', '{any} agua {any}', '{any} leche {any}', 'bebo {any}', '{any}'], 'cook', L('Yo siempre bebo café con leche. ¡Sin café no soy persona! ☕', "I always have a café con leche. I'm not human without coffee!"), {
            slot: 'drink',
            regex: 'bebo\\s+(?:un |una )?([\\p{L} ]+)',
          }),
        ],
        hint: L('Bebo té.', 'I drink tea.'),
      },
      cook: {
        emma: L('¿Cocinas mucho en casa?', 'Do you cook much at home?'),
        answers: [
          answer([...YES, 'cocino {any}', 'a veces {any}'], 'bye', L('¡Genial! Algún día me cocinas algo. 😉', "Great! Someday you'll cook me something.")),
          answer(NO, 'bye', L('¡Yo tampoco! Prefiero comer en un restaurante. 😄', 'Me neither! I prefer eating out.')),
        ],
        hint: L('Sí, cocino a veces.', 'Yes, I cook sometimes.'),
      },
      bye: {
        emma: L('¡Ahora tengo más hambre! Voy a comer algo. ¡Hasta luego!', "Now I'm even hungrier! I'm going to eat something. See you later!"),
        answers: [answer([...BYE, '¡que aproveche! {any}', 'que aproveches {any}', ...ANY], 'end', L('¡Gracias! 😋', 'Thanks!'))],
        hint: L('¡Que aproveche!', 'Enjoy your meal!'),
      },
      end: { emma: L('¡Hasta luego!', 'See you later!'), end: true },
    },
  },

  // ─── Level 3 ────────────────────────────────────────────────────────────
  {
    id: 'cafe',
    level: 3,
    emoji: '☕',
    title: 'At the Café',
    description: 'Emma is your waitress. Order, eat and pay.',
    defaults: { order: 'un café' },
    start: 'order',
    nodes: {
      order: {
        emma: L('¡Buenos días! ¿Qué te pongo?', 'Good morning! What can I get you?'),
        answers: [
          answer(
            ['un café {any}', 'un té {any}', 'quiero {any}', 'quería {any}', 'me pone {any}', 'ponme {any}', 'para mí {any}', '{any} por favor', 'un {any}', 'una {any}'],
            'food',
            L('Muy bien, {order}.', 'Very good, {order}.'),
            { slot: 'order', regex: '(?:quiero|quería|queria|me pone|ponme|para mí|para mi)?\\s*((?:un|una|dos)\\s+[\\p{L} ]+?)(?:\\s+por favor)?$' },
          ),
        ],
        hint: L('Un café con leche, por favor.', 'A white coffee, please.'),
        simpler: L('¿Un café? ¿Un té? ¿Qué quieres tomar?', 'A coffee? A tea? What would you like?'),
      },
      food: {
        emma: L('¿Algo de comer? Tenemos croissants y tostadas.', 'Anything to eat? We have croissants and toast.'),
        answers: [
          answer(['{any} croissant {any}', '{any} cruasán {any}', '{any} tostada {any}', 'sí {any}', 'quiero {any}', 'quería {any}', 'una {any}', 'un {any}'], 'here', L('¡Perfecto!', 'Perfect!')),
          answer(['no {any}', 'nada más {any}', 'nada {any}', 'solo {any}'], 'here', L('Vale.', 'Okay.')),
        ],
        hint: L('Sí, una tostada, por favor.', 'Yes, toast please.'),
      },
      here: {
        emma: L('¿Para tomar aquí o para llevar?', 'For here or to take away?'),
        answers: [
          answer(['{any} aquí {any}', 'para tomar aquí {any}'], 'bill', L('Muy bien, siéntate donde quieras.', 'Very good, sit wherever you like.')),
          answer(['{any} llevar {any}'], 'bill', L('¡Marchando! Te lo pongo para llevar.', 'Coming right up! Take-away it is.')),
        ],
        hint: L('Para tomar aquí.', 'For here.'),
      },
      bill: {
        emma: L('Aquí tienes. ¡Que aproveche! ¿Algo más?', "Here you go. Enjoy! Anything else?"),
        answers: [
          answer(['{any} cuenta {any}', '¿cuánto es {any}', 'cuánto es {any}', 'cuánto cuesta {any}', 'no {any}', 'nada más {any}'], 'pay', L('Son cuatro euros con cincuenta.', "That's four euros fifty.")),
        ],
        hint: L('La cuenta, por favor.', 'The bill, please.'),
        simpler: L('¿Quieres la cuenta?', 'Do you want the bill?'),
      },
      pay: {
        emma: L('¿Pagas con tarjeta o en efectivo?', 'Are you paying by card or cash?'),
        answers: [
          answer(['{any} tarjeta {any}', '{any} efectivo {any}', 'con tarjeta {any}', 'en efectivo {any}', 'con el móvil {any}'], 'bye', L('¡Perfecto, gracias!', 'Perfect, thanks!')),
        ],
        hint: L('Con tarjeta, por favor.', 'By card, please.'),
      },
      bye: {
        emma: L('¡Gracias a ti! ¡Que tengas un buen día!', 'Thank you! Have a good day!'),
        answers: [answer([...BYE, 'igualmente {any}', ...ANY], 'end', L('¡Hasta luego! 👋', 'See you!'))],
        hint: L('¡Gracias, igualmente!', 'Thanks, you too!'),
      },
      end: { emma: L('¡Vuelve pronto!', 'Come back soon!'), end: true },
    },
  },
  {
    id: 'directions',
    level: 3,
    emoji: '🗺️',
    title: 'Lost in Madrid',
    description: 'Ask Emma the way.',
    defaults: { place: 'el museo' },
    start: 'help',
    nodes: {
      help: {
        emma: L('¡Hola! Pareces un poco perdido o perdida… ¿Buscas algo?', 'Hi! You look a little lost… Are you looking for something?'),
        answers: [
          answer(
            ['¿dónde está {any}', 'dónde está {any}', 'busco {any}', 'estoy buscando {any}', 'sí busco {any}', 'sí {any}'],
            'explain',
            L('¿{place}? ¡Está muy cerca!', '{place}? It’s very close!'),
            { slot: 'place', regex: '(?:dónde está|donde esta|donde está|busco|buscando|buscamos)\\s+([\\p{L} ]+)' },
          ),
        ],
        hint: L('¿Dónde está el museo del Prado?', 'Where is the Prado museum?'),
        simpler: L('¿Qué buscas? ¿El museo? ¿La estación?', 'What are you looking for? The museum? The station?'),
      },
      explain: {
        emma: L('Sigue todo recto, y en la segunda calle, gira a la derecha. ¿Lo has entendido?', 'Go straight on, and at the second street, turn right. Did you get that?'),
        answers: [
          answer(['sí {any}', 'vale {any}', 'entendido {any}', 'todo recto {any}', 'a la derecha {any}'], 'transport', L('¡Perfecto!', 'Perfect!')),
          answer(['no {any}', '¿puedes repetir {any}', 'puedes repetir {any}', 'más despacio {any}', 'repite {any}'], 'repeat', L('Claro, más despacio…', 'Of course, more slowly…')),
        ],
        hint: L('Sí, todo recto y a la derecha. ¡Gracias!', 'Yes, straight on and right. Thanks!'),
      },
      repeat: {
        emma: L('Todo… recto. Luego… a la derecha. ¿Vale?', 'Straight… on. Then… right. Okay?'),
        next: 'transport',
        answers: [answer([...YES, ...ANY], 'transport', L('¡Muy bien!', 'Very good!'))],
        hint: L('Vale, gracias.', 'Okay, thanks.'),
      },
      transport: {
        emma: L('¿Vas andando o en metro?', 'Are you walking or taking the metro?'),
        answers: [
          answer(['{any} andando {any}', '{any} a pie {any}', '{any} caminando {any}'], 'far', L('¡Buena idea! Hace un día precioso.', 'Good idea! It’s a beautiful day.')),
          answer(['{any} metro {any}', '{any} autobús {any}', '{any} taxi {any}'], 'far', L('Vale, la parada está ahí mismo.', 'Okay, the stop is right there.')),
        ],
        hint: L('Voy andando.', "I'm walking."),
      },
      far: {
        emma: L('Son unos diez minutos. ¿Es tu primera vez en Madrid?', "It's about ten minutes. Is it your first time in Madrid?"),
        answers: [
          answer(YES, 'bye', L('¡Bienvenido o bienvenida! Te va a encantar.', "Welcome! You're going to love it.")),
          answer(NO, 'bye', L('¡Ah, ya conoces la ciudad! Qué bien.', 'Ah, you know the city already! Great.')),
        ],
        hint: L('Sí, es mi primera vez.', "Yes, it's my first time."),
      },
      bye: {
        emma: L('¡Disfruta de {place}!', 'Enjoy {place}!'),
        answers: [answer([...BYE, 'muchas gracias {any}', ...ANY], 'end', L('¡De nada! ¡Adiós!', "You're welcome! Bye!"))],
        hint: L('¡Muchas gracias por tu ayuda!', 'Thanks so much for your help!'),
      },
      end: { emma: L('¡Buen viaje!', 'Have a good trip!'), end: true },
    },
  },
  {
    id: 'hotel',
    level: 3,
    emoji: '🏨',
    title: 'Hotel Check-in',
    description: 'Emma is the receptionist. Check in politely (usted).',
    defaults: { guest: 'usted', nights: 'dos' },
    start: 'booking',
    nodes: {
      booking: {
        emma: L('¡Buenas tardes! Bienvenido al Hotel Sol. ¿Tiene una reserva?', 'Good afternoon! Welcome to Hotel Sol. Do you have a booking?'),
        answers: [
          answer(['sí {any}', 'tengo una reserva {any}', 'tengo reserva {any}'], 'name', L('Perfecto.', 'Perfect.')),
          answer(['no {any}', '¿tiene habitaciones {any}', 'tiene habitaciones {any}', 'quiero una habitación {any}', 'quería una habitación {any}'], 'room', L('No pasa nada, tenemos habitaciones libres.', 'No problem, we have rooms available.')),
        ],
        hint: L('Sí, tengo una reserva.', 'Yes, I have a booking.'),
        simpler: L('¿Tiene reserva? ¿Sí o no?', 'Do you have a booking? Yes or no?'),
      },
      name: {
        emma: L('¿A nombre de quién?', 'In what name?'),
        answers: [
          answer(['a nombre de {any}', 'de {any}', 'me llamo {any}', '{any}'], 'nights', L('Sí, aquí está: {guest}.', 'Yes, here it is: {guest}.'), {
            slot: 'guest',
            regex: '(?:a nombre de|de|me llamo|soy)\\s+(\\p{L}+(?:\\s\\p{L}+)?)',
          }),
        ],
        hint: L('A nombre de {name}.', 'In the name of {name}.'),
      },
      room: {
        emma: L('¿Quiere una habitación individual o doble?', 'Would you like a single or a double room?'),
        answers: [answer(['{any} individual {any}', '{any} doble {any}'], 'nights', L('Muy bien.', 'Very good.'))],
        hint: L('Una habitación doble, por favor.', 'A double room, please.'),
      },
      nights: {
        emma: L('¿Para cuántas noches?', 'For how many nights?'),
        answers: [
          answer(['{any} {number} noches {any}', '{any} {number} noche {any}', 'para {number} {any}', '{number}'], 'breakfast', L('Perfecto.', 'Perfect.'), {
            slot: 'nights',
            regex: '(\\p{L}+|\\d+)\\s+noches?',
          }),
        ],
        hint: L('Para tres noches.', 'For three nights.'),
      },
      breakfast: {
        emma: L('¿Quiere el desayuno incluido? Son diez euros más.', 'Would you like breakfast included? It’s ten euros more.'),
        answers: [
          answer(YES, 'key', L('Estupendo. El desayuno es de siete a diez.', 'Great. Breakfast is from seven to ten.')),
          answer(NO, 'key', L('Sin problema.', 'No problem.')),
        ],
        hint: L('Sí, por favor.', 'Yes, please.'),
      },
      key: {
        emma: L('Su habitación es la 305, en la tercera planta. Aquí tiene la llave. ¿Necesita algo más?', 'Your room is 305, on the third floor. Here is your key. Do you need anything else?'),
        answers: [
          answer(['{any} wifi {any}', '{any} contraseña {any}'], 'wifi', L('La contraseña del wifi es «HotelSol2026».', 'The wifi password is “HotelSol2026”.')),
          answer([...NO, 'nada más {any}', 'gracias {any}', ...ANY], 'bye'),
        ],
        hint: L('No, gracias. ¿Hay wifi?', 'No, thanks. Is there wifi?'),
      },
      wifi: { emma: L('¿Algo más?', 'Anything else?'), answers: [answer(ANY, 'bye')], hint: L('No, nada más. Gracias.', "No, that's all. Thanks.") },
      bye: {
        emma: L('¡Que disfrute de su estancia!', 'Enjoy your stay!'),
        answers: [answer([...BYE, ...ANY], 'end', L('¡Gracias a usted!', 'Thank you!'))],
        hint: L('Muchas gracias.', 'Thank you very much.'),
      },
      end: { emma: L('¡Buenas noches!', 'Good night!'), end: true },
    },
  },

  // ─── Level 4 ────────────────────────────────────────────────────────────
  {
    id: 'weekend',
    level: 4,
    emoji: '🗓️',
    title: 'Your Weekend',
    description: 'Talk about what you did — and what you’re going to do.',
    start: 'what',
    nodes: {
      what: {
        emma: L('¡Hola, {name}! ¿Qué hiciste el fin de semana?', 'Hi {name}! What did you do at the weekend?'),
        answers: [answer(ANY, 'who', L('¡Qué bien suena eso!', 'That sounds great!'))],
        hint: L('Fui a la playa con mis amigos.', 'I went to the beach with my friends.'),
        simpler: L('¿Fuiste a algún sitio? ¿Viste una película?', 'Did you go anywhere? Did you see a film?'),
      },
      who: {
        emma: L('¿Y con quién?', 'And who with?'),
        answers: [answer(['con {any}', 'solo {any}', 'sola {any}', '{any}'], 'how', L('¡Ah, genial!', 'Ah, great!'))],
        hint: L('Con mi familia.', 'With my family.'),
      },
      how: {
        emma: L('¿Qué tal fue? ¿Te lo pasaste bien?', 'How was it? Did you have a good time?'),
        answers: [
          answer([...YES, '{any} bien {any}', '{any} genial {any}', '{any} fenomenal {any}'], 'me', L('¡Me alegro mucho!', "I'm so glad!")),
          answer([...NO, '{any} aburrido {any}', '{any} mal {any}'], 'me', L('¡Vaya! Otra vez será.', 'Oh well! Next time.')),
        ],
        hint: L('Sí, me lo pasé muy bien.', 'Yes, I had a great time.'),
      },
      me: {
        emma: L('Yo fui a Toledo con mi hermana. ¡Comimos muchísimo! ¿Y qué vas a hacer este fin de semana?', 'I went to Toledo with my sister. We ate so much! And what are you going to do this weekend?'),
        answers: [answer(['voy a {any}', 'vamos a {any}', 'quiero {any}', 'nada {any}', 'no sé {any}', '{any}'], 'bye', L('¡Qué buen plan!', 'What a good plan!'))],
        hint: L('Voy a descansar en casa.', "I'm going to relax at home."),
      },
      bye: {
        emma: L('Bueno, me voy. ¡Que disfrutes del fin de semana!', "Right, I'm off. Enjoy your weekend!"),
        answers: [answer([...BYE, 'igualmente {any}', ...ANY], 'end', L('¡Hasta luego!', 'See you!'))],
        hint: L('¡Igualmente! Hasta luego.', 'You too! See you.'),
      },
      end: { emma: L('¡Chao!', 'Bye!'), end: true },
    },
  },
  {
    id: 'travel-plans',
    level: 4,
    emoji: '✈️',
    title: 'Travel Plans',
    description: 'Dream trips, past trips and plans.',
    defaults: { dest: 'allí' },
    start: 'been',
    nodes: {
      been: {
        emma: L('¿Has estado en España alguna vez?', 'Have you ever been to Spain?'),
        answers: [
          answer(['sí {any}', 'he estado {any}', 'fui {any}'], 'where', L('¡Qué bien! ¿Qué ciudad te gustó más?', 'Great! Which city did you like most?')),
          answer(NO, 'dream', L('¡Tienes que venir! Te va a encantar.', "You have to come! You'll love it.")),
        ],
        hint: L('Sí, he estado en Barcelona.', "Yes, I've been to Barcelona."),
      },
      where: {
        emma: L('Cuéntame: ¿qué hiciste allí?', 'Tell me: what did you do there?'),
        answers: [answer(ANY, 'dream', L('¡Suena increíble!', 'Sounds amazing!'))],
        hint: L('Visité museos y comí tapas.', 'I visited museums and ate tapas.'),
      },
      dream: {
        emma: L('¿Adónde te gustaría viajar el año que viene?', 'Where would you like to travel next year?'),
        answers: [
          answer(['me gustaría ir a {any}', 'a {any}', 'quiero ir a {any}', 'voy a ir a {any}', '{any}'], 'why', L('¡{dest}! ¡Qué buena idea!', '{dest}! What a good idea!'), {
            slot: 'dest',
            regex: '(?:ir a|viajar a|a)\\s+([\\p{L} ]+)',
          }),
        ],
        hint: L('Me gustaría ir a Sevilla.', "I'd like to go to Seville."),
      },
      why: {
        emma: L('¿Por qué {dest}?', 'Why {dest}?'),
        answers: [answer(['porque {any}', '{any}'], 'do', L('¡Tiene sentido!', 'Makes sense!'))],
        hint: L('Porque hace sol y la comida es buenísima.', "Because it's sunny and the food is amazing."),
      },
      do: {
        emma: L('¿Y qué vas a hacer allí?', 'And what are you going to do there?'),
        answers: [answer(['voy a {any}', 'quiero {any}', 'me gustaría {any}', '{any}'], 'bye', L('¡Me das envidia! 😄', "I'm jealous!"))],
        hint: L('Voy a visitar la catedral y bailar flamenco.', "I'm going to visit the cathedral and dance flamenco."),
      },
      bye: {
        emma: L('¡Mándame una foto cuando estés allí! Hasta pronto.', 'Send me a photo when you’re there! See you soon.'),
        answers: [answer([...BYE, ...ANY], 'end', L('¡Buen viaje!', 'Have a good trip!'))],
        hint: L('¡Claro! Hasta pronto.', 'Of course! See you soon.'),
      },
      end: { emma: L('¡Adiós!', 'Bye!'), end: true },
    },
  },

  // ─── Level 5 ────────────────────────────────────────────────────────────
  {
    id: 'childhood',
    level: 5,
    emoji: '🧸',
    title: 'Growing Up',
    description: 'Memories from when you were little (the imperfect).',
    defaults: { town: 'allí' },
    start: 'lived',
    nodes: {
      lived: {
        emma: L('Hoy me apetece hablar de recuerdos. ¿Dónde vivías cuando tenías diez años?', 'Today I feel like talking about memories. Where did you live when you were ten?'),
        answers: [
          answer(['vivía en {any}', 'en {any}', '{any}'], 'play', L('¡Ah, en {town}! ¿Y cómo era?', 'Ah, in {town}! And what was it like?'), {
            slot: 'town',
            regex: '(?:vivía en|vivia en|en)\\s+([\\p{L} ]+)',
          }),
        ],
        hint: L('Vivía en un pueblo pequeño.', 'I lived in a small village.'),
        simpler: L('De pequeño o pequeña, ¿vivías en una ciudad o en un pueblo?', 'As a child, did you live in a city or a village?'),
      },
      play: {
        emma: L('¿Qué te gustaba hacer después del colegio?', 'What did you like doing after school?'),
        answers: [answer(['me gustaba {any}', 'jugaba {any}', 'iba {any}', '{any}'], 'friend', L('¡Qué bonito! Yo siempre jugaba al fútbol en la calle.', 'How lovely! I always played football in the street.'))],
        hint: L('Me gustaba jugar al fútbol con mis amigos.', 'I liked playing football with my friends.'),
      },
      friend: {
        emma: L('¿Tenías un mejor amigo o una mejor amiga?', 'Did you have a best friend?'),
        answers: [answer(['sí {any}', 'tenía {any}', 'se llamaba {any}', 'no {any}', '{any}'], 'dream', L('Los amigos de la infancia son especiales, ¿verdad?', 'Childhood friends are special, aren’t they?'))],
        hint: L('Sí, se llamaba Laura y vivía en mi calle.', 'Yes, she was called Laura and lived on my street.'),
      },
      dream: {
        emma: L('Y de pequeño o pequeña, ¿qué querías ser de mayor?', 'And as a child, what did you want to be when you grew up?'),
        answers: [answer(['quería ser {any}', 'quería {any}', '{any}'], 'now', L('¡Me encanta! Yo quería ser astronauta. 🚀', 'I love it! I wanted to be an astronaut.'))],
        hint: L('Quería ser profesor.', 'I wanted to be a teacher.'),
      },
      now: {
        emma: L('¿Y crees que has cambiado mucho desde entonces?', 'And do you think you’ve changed a lot since then?'),
        answers: [answer(ANY, 'bye', L('Es verdad… Todos cambiamos, pero el niño que llevamos dentro sigue ahí. 😊', 'True… We all change, but our inner child is still there.'))],
        hint: L('Sí, pero todavía me gusta jugar.', 'Yes, but I still like to play.'),
      },
      bye: {
        emma: L('Me ha encantado esta charla, {name}. ¡Hasta la próxima!', 'I loved this chat, {name}. Until next time!'),
        answers: [answer([...BYE, ...ANY], 'end', L('¡Un abrazo!', 'A hug!'))],
        hint: L('A mí también. ¡Hasta la próxima!', 'Me too. Until next time!'),
      },
      end: { emma: L('¡Chao!', 'Bye!'), end: true },
    },
  },
  {
    id: 'work-life',
    level: 5,
    emoji: '💼',
    title: 'Work & Life',
    description: 'Your job, your routine, your dreams.',
    start: 'job',
    nodes: {
      job: {
        emma: L('Oye, nunca te lo he preguntado: ¿a qué te dedicas?', "Hey, I've never asked you: what do you do for a living?"),
        answers: [answer(['soy {any}', 'trabajo {any}', 'estudio {any}', 'estoy {any}', '{any}'], 'like', L('¡Qué interesante!', 'How interesting!'))],
        hint: L('Trabajo en una oficina.', 'I work in an office.'),
        simpler: L('¿Trabajas o estudias?', 'Do you work or study?'),
      },
      like: {
        emma: L('¿Y te gusta lo que haces?', 'And do you like what you do?'),
        answers: [
          answer([...YES, '{any} bastante {any}'], 'hard', L('¡Eso es lo más importante!', "That's the most important thing!")),
          answer(NO, 'hard', L('Vaya… ¿y qué es lo que no te gusta?', 'Oh dear… and what is it you don’t like?')),
          answer(ANY, 'hard'),
        ],
        hint: L('Sí, me gusta mucho, pero es cansado.', 'Yes, I really like it, but it’s tiring.'),
      },
      hard: {
        emma: L('¿Qué es lo más difícil de tu día?', "What's the hardest part of your day?"),
        answers: [answer(ANY, 'change', L('Te entiendo perfectamente.', 'I completely understand.'))],
        hint: L('Levantarme temprano. ¡Odio el despertador!', 'Getting up early. I hate the alarm clock!'),
      },
      change: {
        emma: L('Si pudieras cambiar de trabajo mañana, ¿qué harías?', 'If you could change jobs tomorrow, what would you do?'),
        answers: [answer(['sería {any}', 'trabajaría {any}', 'me gustaría {any}', 'haría {any}', 'abriría {any}', '{any}'], 'bye', L('¡Qué buena idea! Yo abriría una librería con cafetería. 📚☕', 'What a great idea! I’d open a bookshop café.'))],
        hint: L('Sería fotógrafo y viajaría por todo el mundo.', "I'd be a photographer and travel the world."),
      },
      bye: {
        emma: L('Bueno, ¡a seguir trabajando! Hablamos pronto.', 'Right, back to work! Talk soon.'),
        answers: [answer([...BYE, ...ANY], 'end', L('¡Hasta pronto!', 'See you soon!'))],
        hint: L('¡Hablamos pronto!', 'Talk soon!'),
      },
      end: { emma: L('¡Un saludo!', 'Best wishes!'), end: true },
    },
  },

  // ─── Level 6 ────────────────────────────────────────────────────────────
  {
    id: 'advice',
    level: 6,
    emoji: '🧭',
    title: 'Give Emma Advice',
    description: 'Recommendations with the subjunctive.',
    start: 'problem',
    nodes: {
      problem: {
        emma: L('Necesito tu consejo. Mi compañera de piso nunca friega los platos y la cocina está hecha un desastre. ¿Qué me recomiendas?', "I need your advice. My flatmate never washes the dishes and the kitchen is a disaster. What do you recommend?"),
        answers: [
          answer(['te recomiendo que {any}', 'te aconsejo que {any}', 'es mejor que {any}', 'deberías {any}', 'tienes que {any}', 'habla con {any}', 'yo {any}', '{any}'], 'ignore', L('Mmm, buena idea. Es importante que hablemos claro, ¿no?', 'Hmm, good idea. It’s important that we speak clearly, right?')),
        ],
        hint: L('Te recomiendo que hables con ella.', 'I recommend that you talk to her.'),
        simpler: L('¿Qué hago? ¿Hablo con ella?', 'What should I do? Do I talk to her?'),
      },
      ignore: {
        emma: L('¿Y si no me hace caso?', "And what if she ignores me?"),
        answers: [answer(['{any}'], 'second', L('Ja, ja. ¡Eres más estricto de lo que pensaba! 😄', "Ha! You're stricter than I thought!"))],
        hint: L('Entonces es mejor que busques otro piso.', 'Then it’s better that you look for another flat.'),
      },
      second: {
        emma: L('Otra cosa: quiero aprender a cocinar una paella de verdad. ¿Qué me aconsejas?', 'Another thing: I want to learn to cook a real paella. What do you advise?'),
        answers: [answer(['te aconsejo que {any}', 'te recomiendo que {any}', 'que {any}', 'deberías {any}', '{any}'], 'wish', L('¡Me parece un plan perfecto!', 'Sounds like a perfect plan!'))],
        hint: L('Te aconsejo que vayas a Valencia y que aprendas de una abuela.', 'I advise you to go to Valencia and learn from a grandma.'),
      },
      wish: {
        emma: L('Y tú, ¿qué esperas que pase este año?', 'And you, what do you hope happens this year?'),
        answers: [answer(['espero que {any}', 'ojalá {any}', 'quiero que {any}', '{any}'], 'bye', L('Ojalá se cumpla. De verdad.', 'I hope it comes true. Really.'))],
        hint: L('Espero que mi español mejore mucho.', 'I hope my Spanish improves a lot.'),
      },
      bye: {
        emma: L('Gracias por los consejos, {name}. ¡Te debo una!', 'Thanks for the advice, {name}. I owe you one!'),
        answers: [answer([...BYE, 'de nada {any}', ...ANY], 'end', L('¡Un abrazo fuerte!', 'A big hug!'))],
        hint: L('¡De nada! Suerte con tu compañera.', 'You’re welcome! Good luck with your flatmate.'),
      },
      end: { emma: L('¡Hasta pronto!', 'See you soon!'), end: true },
    },
  },
  {
    id: 'city-country',
    level: 6,
    emoji: '🏙️',
    title: 'City or Countryside?',
    description: 'A friendly debate — agree, disagree, give reasons.',
    defaults: { choice: 'eso' },
    start: 'prefer',
    nodes: {
      prefer: {
        emma: L('Vamos a debatir un poco. ¿Prefieres vivir en la ciudad o en el campo?', "Let's have a little debate. Would you rather live in the city or the countryside?"),
        answers: [
          answer(['{any} ciudad {any}'], 'why', L('La ciudad, ¿eh?', 'The city, eh?'), { slot: 'choice', regex: '(ciudad)' }),
          answer(['{any} campo {any}', '{any} pueblo {any}'], 'why', L('El campo, ¿eh?', 'The countryside, eh?'), { slot: 'choice', regex: '(campo|pueblo)' }),
          answer(['depende {any}', '{any}'], 'why', L('Depende, claro…', 'It depends, of course…')),
        ],
        hint: L('Prefiero vivir en la ciudad.', "I'd rather live in the city."),
      },
      why: {
        emma: L('¿Por qué lo prefieres?', 'Why do you prefer it?'),
        answers: [answer(['porque {any}', 'ya que {any}', '{any}'], 'counter', L('Entiendo tu punto de vista.', 'I see your point of view.'))],
        hint: L('Porque hay más cosas que hacer y el transporte es mejor.', "Because there's more to do and the transport is better."),
      },
      counter: {
        emma: L('Pues yo no estoy tan segura. En la ciudad hay demasiado ruido y todo es carísimo. ¿No crees?', "Well, I'm not so sure. In the city there's too much noise and everything is really expensive. Don't you think?"),
        answers: [
          answer(['{any} razón {any}', 'estoy de acuerdo {any}', 'sí {any}', 'es verdad {any}'], 'close', L('¡Vaya, te he convencido! 😄', "Look at that, I've convinced you!")),
          answer(['no estoy de acuerdo {any}', 'no creo que {any}', 'no {any}', 'pero {any}', 'sin embargo {any}', '{any}'], 'close', L('Vale, vale, tienes argumentos. ¡Me gusta debatir contigo!', 'Okay, okay, you’ve got a point. I love debating with you!')),
        ],
        hint: L('Tienes razón, pero en el campo me aburriría.', "You're right, but I'd get bored in the countryside."),
      },
      close: {
        emma: L('Al final, lo importante es estar a gusto donde vives, ¿no te parece?', "In the end, what matters is being happy where you live, don't you think?"),
        answers: [answer(ANY, 'bye', L('Totalmente.', 'Absolutely.'))],
        hint: L('Sí, estoy totalmente de acuerdo.', 'Yes, I completely agree.'),
      },
      bye: {
        emma: L('¡Qué buena conversación! Tu español es cada vez más natural. ¡Hasta pronto!', 'What a good conversation! Your Spanish sounds more natural every time. See you soon!'),
        answers: [answer([...BYE, ...ANY], 'end', L('¡Un abrazo!', 'A hug!'))],
        hint: L('¡Gracias, Emma! Hasta pronto.', 'Thanks, Emma! See you soon.'),
      },
      end: { emma: L('¡Chao!', 'Bye!'), end: true },
    },
  },
];

export const SCENARIOS_BY_ID = new Map(SCENARIOS.map((s) => [s.id, s]));
