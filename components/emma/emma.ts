/**
 * Emma's states map onto the four supplied illustrations — no new drawings:
 *   front (smiling, facing you)   happy, encouraging, speaking, surprised, celebrating
 *   aside (three-quarter glance)  thinking, confused
 *   profile (side view)           listening
 *   full body                     welcome & big celebrations
 * Motion and a small badge carry the rest of the expression.
 */
export type EmmaState =
  | 'happy'
  | 'encouraging'
  | 'thinking'
  | 'surprised'
  | 'celebrating'
  | 'confused'
  | 'listening'
  | 'speaking';

export type EmmaPose = 'front' | 'aside' | 'profile';

export const POSE_FOR_STATE: Record<EmmaState, EmmaPose> = {
  happy: 'front',
  encouraging: 'front',
  speaking: 'front',
  surprised: 'front',
  celebrating: 'front',
  thinking: 'aside',
  confused: 'aside',
  listening: 'profile',
};

export const BADGE_FOR_STATE: Partial<Record<EmmaState, string>> = {
  encouraging: '❤️',
  thinking: '💭',
  confused: '❓',
  surprised: '✨',
  celebrating: '🎉',
};

export const MOTION_FOR_STATE: Record<EmmaState, string> = {
  happy: 'animate-float',
  encouraging: 'animate-float',
  speaking: 'animate-talk',
  surprised: 'animate-pop',
  celebrating: 'animate-bounce-soft',
  thinking: 'animate-float',
  confused: 'animate-tilt',
  listening: '',
};

const AVATAR_WIDTHS = [96, 192, 320];
const PORTRAIT_WIDTHS = [300, 600];

export function avatarSrc(pose: EmmaPose) {
  return {
    src: `/emma/emma-${pose}-avatar-192.webp`,
    srcSet: AVATAR_WIDTHS.map((w) => `/emma/emma-${pose}-avatar-${w}.webp ${w}w`).join(', '),
  };
}

export function portraitSrc(pose: EmmaPose) {
  return {
    src: `/emma/emma-${pose}-portrait-300.webp`,
    srcSet: PORTRAIT_WIDTHS.map((w) => `/emma/emma-${pose}-portrait-${w}.webp ${w}w`).join(', '),
  };
}

export const FULL_BODY = {
  src: '/emma/emma-full-body-240.webp',
  srcSet: '/emma/emma-full-body-240.webp 240w, /emma/emma-full-body-480.webp 480w',
  width: 500,
  height: 1120,
};
