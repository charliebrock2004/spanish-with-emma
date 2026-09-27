export type GameId = 'word-match' | 'listen-pick' | 'speed-round' | 'build-sentence' | 'vocab-blast' | 'conversation-challenge';

export interface GameDef {
  id: GameId;
  emoji: string;
  title: string;
  tagline: string;
  howTo: string;
  /** What the game is built from. */
  source: 'words' | 'sentences' | 'conversations';
  /** Needs Emma's voice (text-to-speech). */
  audio?: boolean;
  /** Seconds, for timed games. */
  seconds?: number;
  tone: string;
}

export const GAMES: GameDef[] = [
  {
    id: 'word-match',
    emoji: '🧩',
    title: 'Word Match',
    tagline: 'Pair each word with its meaning.',
    howTo: 'Tap a Spanish word, then its English meaning. Three boards — go as fast as you can without mixing them up.',
    source: 'words',
    tone: 'bg-sun-light',
  },
  {
    id: 'listen-pick',
    emoji: '👂',
    title: 'Listen & Pick',
    tagline: 'Hear it, pick what it means.',
    howTo: 'I’ll say a word in Spanish — tap what it means. Ten words. Tap the speaker to hear it again.',
    source: 'words',
    audio: true,
    tone: 'bg-sky-light',
  },
  {
    id: 'speed-round',
    emoji: '⚡',
    title: 'Speed Round',
    tagline: '60 seconds. How many can you get?',
    howTo: 'Answer as many as you can in 60 seconds. Spanish to English and back again. Wrong answers cost you time, not points.',
    source: 'words',
    seconds: 60,
    tone: 'bg-terracotta-light',
  },
  {
    id: 'vocab-blast',
    emoji: '💥',
    title: 'Vocab Blast',
    tagline: 'True or false — fast!',
    howTo: 'Does the Spanish word mean the English word? Tap ✓ or ✗. Build a combo for bonus points. 45 seconds.',
    source: 'words',
    seconds: 45,
    tone: 'bg-[#f3e1f0]',
  },
  {
    id: 'build-sentence',
    emoji: '🧱',
    title: 'Build the Sentence',
    tagline: 'Put the words in the right order.',
    howTo: 'Six sentences from your lessons. Tap the words in the right order to build each one.',
    source: 'sentences',
    tone: 'bg-sage-light',
  },
  {
    id: 'conversation-challenge',
    emoji: '🎙️',
    title: 'Conversation Challenge',
    tagline: 'Quick-fire chats with Emma.',
    howTo: 'Two short conversations from your lessons. Answer Emma out loud — or type if you need to.',
    source: 'conversations',
    tone: 'bg-honey-light',
  },
];

export const GAME_BY_ID = new Map(GAMES.map((g) => [g.id, g]));

/** Minimum material to play. */
export const MIN_SENTENCES = 3;
export const MIN_CONVERSATIONS = 1;
