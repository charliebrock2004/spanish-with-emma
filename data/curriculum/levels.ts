import type { LevelId, LevelMeta } from '@/types/curriculum';

export const LEVEL_META: Record<LevelId, Omit<LevelMeta, 'id'>> = {
  1: {
    emoji: '🌱',
    title: 'First Words',
    subtitle: 'Complete beginner',
    cefr: 'A1',
    description: 'Greetings, manners, introductions, numbers and colours.',
  },
  2: {
    emoji: '☀️',
    title: 'Everyday Basics',
    subtitle: 'Foundations',
    cefr: 'A1',
    description: 'Family, food and drink, days and months, your first verbs and questions.',
  },
  3: {
    emoji: '🌴',
    title: 'Real Life',
    subtitle: 'Everyday Spanish',
    cefr: 'A2',
    description: 'Cafés, restaurants, shops, hotels, directions and your daily routine.',
  },
  4: {
    emoji: '✈️',
    title: 'Travel Spanish',
    subtitle: 'Conversation',
    cefr: 'A2+',
    description: 'Plans, the past, opinions, preferences and stories from your travels.',
  },
  5: {
    emoji: '💬',
    title: 'Conversation',
    subtitle: 'Intermediate',
    cefr: 'B1',
    description: 'The imperfect, object pronouns, the future and natural everyday expressions.',
  },
  6: {
    emoji: '🔥',
    title: 'Fluent Foundations',
    subtitle: 'Advanced',
    cefr: 'B2',
    description: 'The subjunctive, idioms, nuance and real-world situations at natural speed.',
  },
};
