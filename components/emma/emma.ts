import outfits from '@/data/outfits.json';

/**
 * Emma's fifteen states. Each maps onto one of the supplied illustrations
 * (a "pose") plus motion and a small badge — no new drawings needed:
 *   front    smiling, facing you
 *   aside    three-quarter glance
 *   profile  side view (listening)
 *   full body for welcomes and big celebrations
 *
 * Drop-in art: to give a state its own drawing, add the cut-outs as
 * `public/emma/emma-<pose>-avatar-{96,192,320}.webp` and
 * `public/emma/emma-<pose>-portrait-{300,600}.webp` (the asset script makes
 * them from a source image), add the pose name to `EmmaPose` and point the
 * state at it in `POSE_FOR_STATE`. Nothing else changes.
 */
export type EmmaState =
  | 'idle'
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'listening'
  | 'speaking'
  | 'correct'
  | 'almost'
  | 'wrong'
  | 'celebrating'
  | 'surprised'
  | 'encouraging'
  | 'proud'
  | 'confused'
  | 'sleepy';

export const EMMA_STATES: EmmaState[] = [
  'idle',
  'happy',
  'excited',
  'thinking',
  'listening',
  'speaking',
  'correct',
  'almost',
  'wrong',
  'celebrating',
  'surprised',
  'encouraging',
  'proud',
  'confused',
  'sleepy',
];

export type EmmaPose = 'front' | 'aside' | 'profile';

export const POSE_FOR_STATE: Record<EmmaState, EmmaPose> = {
  idle: 'front',
  happy: 'front',
  excited: 'front',
  speaking: 'front',
  correct: 'front',
  celebrating: 'front',
  surprised: 'front',
  encouraging: 'front',
  proud: 'front',
  almost: 'aside',
  wrong: 'aside',
  thinking: 'aside',
  confused: 'aside',
  sleepy: 'aside',
  listening: 'profile',
};

export const BADGE_FOR_STATE: Partial<Record<EmmaState, string>> = {
  excited: '🤩',
  thinking: '💭',
  correct: '✨',
  almost: '🤏',
  wrong: '❤️',
  celebrating: '🎉',
  surprised: '😮',
  encouraging: '💪',
  proud: '👏',
  confused: '❓',
  sleepy: '💤',
};

export const MOTION_FOR_STATE: Record<EmmaState, string> = {
  idle: 'animate-breathe',
  happy: 'animate-float',
  excited: 'animate-hop',
  thinking: 'animate-float',
  listening: '',
  speaking: 'animate-talk',
  correct: 'animate-nod',
  almost: 'animate-tilt',
  wrong: 'animate-tilt',
  celebrating: 'animate-hop',
  surprised: 'animate-pop',
  encouraging: 'animate-float',
  proud: 'animate-breathe',
  confused: 'animate-tilt',
  sleepy: 'animate-doze',
};

/** Friendly names for screen readers. */
export const STATE_LABEL: Record<EmmaState, string> = {
  idle: 'Emma',
  happy: 'Emma, smiling',
  excited: 'Emma, excited',
  thinking: 'Emma, thinking',
  listening: 'Emma, listening',
  speaking: 'Emma, speaking',
  correct: 'Emma, pleased',
  almost: 'Emma, nearly there',
  wrong: 'Emma, encouraging you',
  celebrating: 'Emma, celebrating',
  surprised: 'Emma, surprised',
  encouraging: 'Emma, encouraging you',
  proud: 'Emma, proud of you',
  confused: 'Emma, puzzled',
  sleepy: 'Emma, a bit sleepy',
};

const OUTFIT_IDS = new Set(Object.keys(outfits));

/** Where the art for an outfit lives (the classic outfit is the original art). */
function base(outfit?: string | null) {
  return outfit && OUTFIT_IDS.has(outfit) ? `/emma/outfits/${outfit}` : '/emma';
}

const AVATAR_WIDTHS = [96, 192, 320];
const PORTRAIT_WIDTHS = [300, 600];

export function avatarSrc(pose: EmmaPose, outfit?: string | null) {
  const dir = base(outfit);
  return {
    src: `${dir}/emma-${pose}-avatar-192.webp`,
    srcSet: AVATAR_WIDTHS.map((w) => `${dir}/emma-${pose}-avatar-${w}.webp ${w}w`).join(', '),
  };
}

export function portraitSrc(pose: EmmaPose, outfit?: string | null) {
  const dir = base(outfit);
  return {
    src: `${dir}/emma-${pose}-portrait-300.webp`,
    srcSet: PORTRAIT_WIDTHS.map((w) => `${dir}/emma-${pose}-portrait-${w}.webp ${w}w`).join(', '),
  };
}

export const FULL_BODY = { width: 500, height: 1120 };

export function fullBodySrc(outfit?: string | null) {
  const dir = base(outfit);
  return {
    src: `${dir}/emma-full-body-240.webp`,
    srcSet: `${dir}/emma-full-body-240.webp 240w, ${dir}/emma-full-body-480.webp 480w`,
  };
}
