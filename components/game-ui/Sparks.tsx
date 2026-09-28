import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

const PALETTE = ['var(--color-sun)', 'var(--color-terracotta)', '#ffffff', 'var(--color-sage)'];

/**
 * A small burst of sparks from the middle of the parent (which must be
 * positioned). Pure CSS transforms, over in under a second, and invisible with
 * reduced motion. Re-mount it (change its `key`) to fire again.
 */
export function Sparks({
  count = 10,
  distance = 44,
  colors = PALETTE,
  size = 7,
  className,
}: {
  count?: number;
  distance?: number;
  colors?: string[];
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn('pointer-events-none absolute inset-0 grid place-items-center', className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const angle = (360 / count) * i + (i % 2 ? 9 : -9);
        const reach = distance * (i % 3 === 0 ? 1.3 : i % 3 === 1 ? 1 : 0.8);
        const style = {
          '--a': `${angle}deg`,
          '--d': `${reach}px`,
          width: size,
          height: size,
          background: colors[i % colors.length],
          animationDelay: `${(i % 3) * 35}ms`,
          gridArea: '1 / 1',
        } as CSSProperties;
        return <span key={i} className={cn('spark', i % 4 === 0 ? 'rounded-[2px]' : 'rounded-full')} style={style} />;
      })}
    </span>
  );
}
