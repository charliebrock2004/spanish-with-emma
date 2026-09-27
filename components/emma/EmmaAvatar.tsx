/* eslint-disable @next/next/no-img-element -- pre-optimised WebP crops with explicit srcset */
import { cn } from '@/lib/utils';
import { avatarSrc, BADGE_FOR_STATE, MOTION_FOR_STATE, POSE_FOR_STATE, type EmmaState } from './emma';

interface EmmaAvatarProps {
  state?: EmmaState;
  size?: number;
  /** Gentle idle motion (disable for dense lists). */
  animated?: boolean;
  className?: string;
  /** Hide from assistive tech when a caption already names Emma. */
  decorative?: boolean;
  priority?: boolean;
}

/** Emma's round avatar — the same character everywhere, with state-driven motion. */
export function EmmaAvatar({
  state = 'happy',
  size = 56,
  animated = true,
  className,
  decorative = false,
  priority = false,
}: EmmaAvatarProps) {
  const pose = POSE_FOR_STATE[state];
  const { src, srcSet } = avatarSrc(pose);
  const badge = BADGE_FOR_STATE[state];
  const motion = animated ? MOTION_FOR_STATE[state] : '';

  return (
    <div
      className={cn('relative inline-block shrink-0', className)}
      style={{ width: size, height: size }}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : `Emma, ${state}`}
      aria-hidden={decorative || undefined}
    >
      {state === 'listening' && (
        <>
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-terracotta/40" />
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-terracotta/30 [animation-delay:0.6s]" />
        </>
      )}
      <div
        className={cn(
          'relative h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-sun-light via-cream to-terracotta-light ring-2 ring-paper',
          state === 'listening' && 'ring-terracotta/60',
          state === 'celebrating' && 'ring-sun',
          motion,
        )}
      >
        <img
          src={src}
          srcSet={srcSet}
          sizes={`${size}px`}
          alt=""
          width={size}
          height={size}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          className="h-full w-full object-cover"
        />
      </div>
      {badge && (
        <span
          className="absolute -right-1 -bottom-1 grid animate-pop place-items-center rounded-full bg-paper shadow-card"
          style={{ width: Math.max(20, size * 0.36), height: Math.max(20, size * 0.36), fontSize: Math.max(11, size * 0.2) }}
          aria-hidden
        >
          {badge}
        </span>
      )}
      {state === 'speaking' && <SpeakingBadge size={size} />}
    </div>
  );
}

function SpeakingBadge({ size }: { size: number }) {
  const s = Math.max(20, size * 0.38);
  return (
    <span
      className="absolute -right-1 -bottom-1 flex items-center justify-center gap-[2px] rounded-full bg-terracotta shadow-card"
      style={{ width: s, height: s }}
      aria-hidden
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] origin-bottom rounded-full bg-white"
          style={{
            height: s * 0.42,
            animation: `talk-bar 0.9s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </span>
  );
}
