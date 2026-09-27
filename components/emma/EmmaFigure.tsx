/* eslint-disable @next/next/no-img-element -- pre-optimised WebP crops with explicit srcset */
import { cn } from '@/lib/utils';
import { FULL_BODY, MOTION_FOR_STATE, POSE_FOR_STATE, portraitSrc, type EmmaState } from './emma';

/** Half-length Emma for heroes, lesson intros and conversation headers. */
export function EmmaPortrait({
  state = 'happy',
  className,
  width = 200,
  priority = false,
  animated = true,
  fade = false,
}: {
  state?: EmmaState;
  className?: string;
  width?: number;
  priority?: boolean;
  animated?: boolean;
  /** Softly fade out the bottom edge where the crop ends. */
  fade?: boolean;
}) {
  const { src, srcSet } = portraitSrc(POSE_FOR_STATE[state]);
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={`${width}px`}
      width={width}
      height={Math.round(width * 1.5)}
      alt={`Emma, ${state}`}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      draggable={false}
      className={cn(
        'select-none',
        animated && MOTION_FOR_STATE[state],
        fade && '[mask-image:linear-gradient(to_bottom,black_72%,transparent_98%)]',
        className,
      )}
    />
  );
}

/** Full-length Emma for onboarding and big celebrations. */
export function EmmaFullBody({
  className,
  height = 320,
  animated = true,
  celebrating = false,
  priority = false,
}: {
  className?: string;
  height?: number;
  animated?: boolean;
  celebrating?: boolean;
  priority?: boolean;
}) {
  const width = Math.round((FULL_BODY.width / FULL_BODY.height) * height);
  return (
    <img
      src={FULL_BODY.src}
      srcSet={FULL_BODY.srcSet}
      sizes={`${width}px`}
      width={width}
      height={height}
      alt={celebrating ? 'Emma celebrating' : 'Emma'}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      draggable={false}
      className={cn('select-none', animated && (celebrating ? 'animate-bounce-soft' : 'animate-float'), className)}
    />
  );
}
