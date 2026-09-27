'use client';

/* eslint-disable @next/next/no-img-element -- pre-optimised WebP crops with explicit srcset */
import { useEquipped } from '@/components/cosmetics/cosmetics';
import { cn } from '@/lib/utils';
import { FULL_BODY, fullBodySrc, MOTION_FOR_STATE, POSE_FOR_STATE, portraitSrc, STATE_LABEL, type EmmaState } from './emma';

/** Half-length Emma for heroes, lesson intros and conversation headers. */
export function EmmaPortrait({
  state = 'happy',
  className,
  width = 200,
  priority = false,
  animated = true,
  fade = false,
  outfit,
}: {
  state?: EmmaState;
  className?: string;
  width?: number;
  priority?: boolean;
  animated?: boolean;
  /** Softly fade out the bottom edge where the crop ends. */
  fade?: boolean;
  /** Preview an outfit instead of the equipped one. */
  outfit?: string;
}) {
  const equipped = useEquipped();
  const { src, srcSet } = portraitSrc(POSE_FOR_STATE[state], outfit ?? equipped.outfit);
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={`${width}px`}
      width={width}
      height={Math.round(width * 1.5)}
      alt={STATE_LABEL[state]}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      draggable={false}
      data-emma-state={state}
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
  outfit,
}: {
  className?: string;
  height?: number;
  animated?: boolean;
  celebrating?: boolean;
  priority?: boolean;
  outfit?: string;
}) {
  const equipped = useEquipped();
  const width = Math.round((FULL_BODY.width / FULL_BODY.height) * height);
  const { src, srcSet } = fullBodySrc(outfit ?? equipped.outfit);
  const state: EmmaState = celebrating ? 'celebrating' : 'happy';
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={`${width}px`}
      width={width}
      height={height}
      alt={STATE_LABEL[state]}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      draggable={false}
      className={cn('select-none', animated && (celebrating ? 'animate-hop' : 'animate-float'), className)}
    />
  );
}
