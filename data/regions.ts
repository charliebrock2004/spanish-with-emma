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
  /** How you get here from the previous stop (shown on the map between regions). */
  travel: string;
  /** Something true and memorable about the place, discovered on arrival. */
  fact: string;
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
    travel: 'Where every journey in Spain starts',
    fact: 'Madrid is the very middle of Spain: road distances are measured from Kilómetro Cero, a plaque in the Puerta del Sol.',
  },
  2: {
    level: 2,
    name: 'Salamanca',
    landmark: '🎓',
    blurb: 'The student city: family, food and your first verbs.',
    welcome: 'Salamanca! A whole city of students — you’ll fit right in.',
    sky: ['#fcefc7', '#fbf3e8'],
    colour: '#c9861a',
    travel: 'West across Castilla by train',
    fact: 'The University of Salamanca was founded in 1218 — one of the oldest universities in Europe.',
  },
  3: {
    level: 3,
    name: 'Barcelona',
    landmark: '⛪',
    blurb: 'Cafés, markets, hotels and finding your way around.',
    welcome: 'Barcelona! Time to order coffee like a local.',
    sky: ['#dcefe6', '#fbf3e8'],
    colour: '#2f8a6f',
    travel: 'All the way to the Mediterranean',
    fact: 'The Sagrada Família has been under construction since 1882.',
  },
  4: {
    level: 4,
    name: 'Sevilla',
    landmark: '💃',
    blurb: 'Travel south: trains, sights and stories about your trip.',
    welcome: 'Sevilla — sunshine, orange trees and lots of stories to tell.',
    sky: ['#e3eef6', '#fbf3e8'],
    colour: '#4d86b3',
    travel: 'South to Andalucía on the AVE',
    fact: 'La Giralda began life as a minaret; its Renaissance bell tower was added in the 1500s.',
  },
  5: {
    level: 5,
    name: 'Valencia',
    landmark: '🥘',
    blurb: 'Long chats by the sea — the past, the future and feelings.',
    welcome: 'Valencia! Real conversations, and the best paella in Spain.',
    sky: ['#f7e0d5', '#fbf3e8'],
    colour: '#c65d3b',
    travel: 'Back up to the coast and the sea',
    fact: 'Paella comes from Valencia — and a traditional paella valenciana has no chorizo.',
  },
  6: {
    level: 6,
    name: 'Santiago',
    landmark: '🐚',
    blurb: 'The end of the Camino: nuance, idioms and natural speed.',
    welcome: 'Santiago de Compostela — the end of the Camino. Look how far you’ve come.',
    sky: ['#f3d3cc', '#fbf3e8'],
    colour: '#8a2f22',
    travel: 'North-west, the last stretch of the Camino',
    fact: 'Pilgrims have walked the Camino de Santiago for over a thousand years.',
  },
};
