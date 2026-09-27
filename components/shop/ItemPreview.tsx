'use client';

/* eslint-disable @next/next/no-img-element -- pre-optimised WebP crops with explicit srcset */
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { portraitSrc } from '@/components/emma/emma';
import { bubbleFor, SceneBackdrop, sceneFor } from '@/components/cosmetics/cosmetics';
import { Icon } from '@/components/ui/Icon';
import type { Rarity, ShopItem } from '@/data/shop';
import { cn } from '@/lib/utils';

export const RARITY: Record<Rarity, { label: string; chip: string; ring: string }> = {
  common: { label: 'Common', chip: 'bg-cream-deep text-ink-soft', ring: 'ring-sand' },
  rare: { label: 'Rare', chip: 'bg-sky-light text-[#2f5f86]', ring: 'ring-sky/60' },
  epic: { label: 'Epic', chip: 'bg-[#efe0f2] text-[#6a2f78]', ring: 'ring-[#b98bc6]' },
  legendary: { label: 'Legendary', chip: 'bg-sun-light text-honey-dark', ring: 'ring-sun' },
};

function Inner({ item, size }: { item: ShopItem; size: number }) {
  switch (item.category) {
    case 'outfit': {
      // Half-length, so the outfit itself is what you see.
      const { src, srcSet } = portraitSrc('front', item.id);
      return (
        <div className="relative overflow-hidden rounded-2xl" style={{ width: size, height: size, background: sceneFor('bg-cream').disc }}>
          <img
            src={src}
            srcSet={srcSet}
            sizes={`${size}px`}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute left-0 max-w-none select-none"
            style={{ width: size, top: -size * 0.28 }}
          />
        </div>
      );
    }
    case 'background':
      return (
        <div className="relative overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]" style={{ width: size, height: size }}>
          <SceneBackdrop id={item.id} />
        </div>
      );
    case 'frame':
      return <EmmaAvatar framed frame={item.id} size={size} animated={false} decorative />;
    case 'bubble': {
      const bubble = bubbleFor(item.id);
      return (
        <div className="grid place-items-center overflow-hidden" style={{ width: size, height: size }}>
          <span
            className={cn('rounded-2xl rounded-bl-md px-2.5 py-1.5 text-[13px] font-extrabold whitespace-nowrap shadow-card', bubble.className)}
            style={{ ...bubble.style, transform: size < 70 ? `scale(${size / 76})` : undefined }}
          >
            <span lang="es" className="spanish">¡Hola!</span>
          </span>
        </div>
      );
    }
    case 'theme': {
      const [main, light] = item.swatch ?? ['#c65d3b', '#f7e0d5'];
      return (
        <div className="grid place-items-center rounded-2xl" style={{ width: size, height: size, background: light }}>
          <span className="flex flex-col items-center gap-1.5">
            <span className="h-3 w-12 rounded-full" style={{ background: main }} />
            <span className="h-5 w-14 rounded-lg shadow-[0_2px_0_rgb(0_0_0/0.2)]" style={{ background: main }} />
          </span>
        </div>
      );
    }
    default: {
      const [main, light] = item.swatch ?? ['#f2c14e', '#fcefc7'];
      return (
        <div
          className="grid place-items-center rounded-2xl"
          style={{ width: size, height: size, background: `radial-gradient(circle at 30% 25%, ${light}, ${main})`, fontSize: size * 0.46 }}
          aria-hidden
        >
          {item.emoji}
        </div>
      );
    }
  }
}

/** A picture of a shop item. Locked exclusives show as a silhouette. */
export function ItemPreview({ item, size = 72, silhouette = false, className }: { item: ShopItem; size?: number; silhouette?: boolean; className?: string }) {
  return (
    <div className={cn('relative grid shrink-0 place-items-center', className)} style={{ width: size, height: size }} aria-hidden>
      <div className={cn(silhouette && '[filter:brightness(0)_saturate(0)] opacity-25')}>
        <Inner item={item} size={size} />
      </div>
      {silhouette && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-cream shadow-card">
            <Icon name="lock" size={16} />
          </span>
        </span>
      )}
    </div>
  );
}
