import type { LevelId } from '@/types/curriculum';

/**
 * The world map: each curriculum level is a stop on a journey across Spain,
 * ending — like the Camino — in Santiago.
 */
export interface Region {
  level: LevelId;
  name: string;
  landmark: string;
  blurb: string;
  /** Emma's line when the region opens. */
  welcome: string;
  /** Sky gradient for the banner. */
  sky: [string, string];
  /** Path and node colour. */
  colour: string;
}

export const REGIONS: Record<LevelId, Region> = {
  1: {
    level: 1,
    name: 'Madrid',
    landmark: '🏛️',
    blurb: 'Your first ¡hola! in the heart of Spain.',
    welcome: 'Welcome to Madrid! Everything starts with ¡hola!',
    sky: ['#e2efdc', '#fbf3e8'],
    colour: '#4f8a5b',
  },
  2: {
    level: 2,
    name: 'Salamanca',
    landmark: '🎓',
    blurb: 'The student city: family, food and your first verbs.',
    welcome: 'Salamanca! A whole city of students — you’ll fit right in.',
    sky: ['#fcefc7', '#fbf3e8'],
    colour: '#c9861a',
  },
  3: {
    level: 3,
    name: 'Barcelona',
    landmark: '⛪',
    blurb: 'Cafés, markets, hotels and finding your way around.',
    welcome: 'Barcelona! Time to order coffee like a local.',
    sky: ['#dcefe6', '#fbf3e8'],
    colour: '#2f8a6f',
  },
  4: {
    level: 4,
    name: 'Sevilla',
    landmark: '💃',
    blurb: 'Travel south: trains, sights and stories about your trip.',
    welcome: 'Sevilla — sunshine, orange trees and lots of stories to tell.',
    sky: ['#e3eef6', '#fbf3e8'],
    colour: '#4d86b3',
  },
  5: {
    level: 5,
    name: 'Valencia',
    landmark: '🥘',
    blurb: 'Long chats by the sea — the past, the future and feelings.',
    welcome: 'Valencia! Real conversations, and the best paella in Spain.',
    sky: ['#f7e0d5', '#fbf3e8'],
    colour: '#c65d3b',
  },
  6: {
    level: 6,
    name: 'Santiago',
    landmark: '🐚',
    blurb: 'The end of the Camino: nuance, idioms and natural speed.',
    welcome: 'Santiago de Compostela — the end of the Camino. Look how far you’ve come.',
    sky: ['#f3d3cc', '#fbf3e8'],
    colour: '#8a2f22',
  },
};
