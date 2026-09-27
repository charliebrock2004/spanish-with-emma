'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatedNumber } from '@/components/ui/primitives';
import { playerLevelFromXp } from '@/lib/game/levels';
import { useNow } from '@/lib/hooks/useNow';
import { localDateKey } from '@/lib/progress/dates';
import { streakStatus } from '@/lib/progress/streak';
import { useGameStore } from '@/store/gameStore';
import { cn, formatNumber } from '@/lib/utils';
import { CoinIcon, FlameIcon, XpIcon } from './icons';

/** Player level with an XP ring around it. */
export function LevelBadge({ level, progress, size = 44, className }: { level: number; progress: number; size?: number; className?: string }) {
  const deg = Math.round(Math.max(0, Math.min(1, progress)) * 360);
  return (
    <div
      className={cn('relative grid shrink-0 place-items-center rounded-full', className)}
      style={{ width: size, height: size, background: `conic-gradient(var(--color-sun) ${deg}deg, rgb(42 35 32 / 0.12) ${deg}deg)` }}
    >
      <div
        className="grid place-items-center rounded-full bg-gradient-to-b from-[#3a302b] to-ink text-cream shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]"
        style={{ width: size - Math.max(6, size * 0.14), height: size - Math.max(6, size * 0.14) }}
      >
        <span className="leading-none font-black tabular-nums" style={{ fontSize: Math.round(size * (level >= 100 ? 0.3 : 0.38)) }}>
          {level}
        </span>
      </div>
    </div>
  );
}

/** A thin XP bar. */
export function XpBar({ progress, className, tone = 'sun' }: { progress: number; className?: string; tone?: 'sun' | 'light' }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full', tone === 'sun' ? 'bg-ink/10' : 'bg-white/25', className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-sun to-[#e98a4f] transition-[width] duration-1000 ease-[var(--ease-out-soft)]"
        style={{ width: `${Math.max(3, Math.min(100, progress * 100))}%` }}
      />
    </div>
  );
}

/** "+25 XP" and "+10 coins" chips. */
export function RewardChips({ xp, coins, size = 'md', className }: { xp?: number; coins?: number; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const text = { sm: 'text-xs px-2 py-0.5 gap-1', md: 'text-sm px-2.5 py-1 gap-1', lg: 'text-lg px-3.5 py-1.5 gap-1.5' }[size];
  const icon = { sm: 14, md: 16, lg: 22 }[size];
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      {xp ? (
        <span className={cn('inline-flex items-center rounded-full bg-sun-light font-black text-honey-dark', text)}>
          +{formatNumber(xp)} <XpIcon size={icon} />
          <span className="sr-only">XP</span>
        </span>
      ) : null}
      {coins ? (
        <span className={cn('inline-flex items-center rounded-full bg-[#fff4d6] font-black text-[#8f5d0f]', text)}>
          +{formatNumber(coins)} <CoinIcon size={icon} />
          <span className="sr-only">coins</span>
        </span>
      ) : null}
    </span>
  );
}

function Star({ filled, size, delay }: { filled: boolean; size: number; delay: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn(filled && delay >= 0 && 'animate-slam')}
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden
    >
      <path
        d="M12 1.8l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 16.5l-5.9 3.3 1.3-6.6-4.9-4.5 6.6-.8z"
        fill={filled ? '#f2c14e' : 'rgb(42 35 32 / 0.1)'}
        stroke={filled ? '#c9962a' : 'rgb(42 35 32 / 0.15)'}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {filled && <path d="M9.2 8.8l1.7-.2.8-1.8" stroke="#fff6d8" strokeWidth="1.3" strokeLinecap="round" fill="none" />}
    </svg>
  );
}

/** ⭐⭐⭐ — the middle star is a touch bigger, like a podium. */
export function StarRating({ stars, size = 28, animated = false, className }: { stars: number; size?: number; animated?: boolean; className?: string }) {
  return (
    <div role="img" aria-label={`${stars} of 3 stars`} className={cn('inline-flex items-end gap-0.5', className)}>
      {[1, 2, 3].map((i) => (
        <Star key={i} filled={i <= stars} size={i === 2 ? Math.round(size * 1.25) : size} delay={animated ? 250 + i * 280 : -1} />
      ))}
    </div>
  );
}

/** Pulses briefly whenever `value` goes up. */
function useBump(value: number) {
  const [bumped, setBumped] = useState(false);
  const previous = useRef(value);
  useEffect(() => {
    if (value > previous.current) {
      setBumped(true);
      const t = window.setTimeout(() => setBumped(false), 700);
      previous.current = value;
      return () => window.clearTimeout(t);
    }
    previous.current = value;
  }, [value]);
  return bumped;
}

/** The game HUD: level and XP, streak, coins and an active XP boost. */
export function Hud({ className }: { className?: string }) {
  const xp = useGameStore((s) => s.xp);
  const coins = useGameStore((s) => s.coins);
  const streak = useGameStore((s) => s.streak);
  const boostUntil = useGameStore((s) => s.inventory.boostUntil);
  const now = useNow();
  const level = playerLevelFromXp(xp);
  const status = streakStatus(streak, localDateKey());
  const boost = now && boostUntil && boostUntil > now ? Math.ceil((boostUntil - now) / 60_000) : 0;
  const coinBump = useBump(coins);
  const levelBump = useBump(level.level);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Link
        href="/profile"
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full pr-1"
        aria-label={`Player level ${level.level}: ${level.xpInto} of ${level.xpForNext} XP to the next level`}
      >
        <LevelBadge level={level.level} progress={level.progress} size={40} className={cn(levelBump && 'animate-pop')} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2 text-[11px] leading-none font-extrabold text-ink-soft">
            <span className="truncate">Level {level.level}</span>
            <span className="tabular-nums">{level.maxed ? 'MAX' : `${formatNumber(level.xpInto)}/${formatNumber(level.xpForNext)}`}</span>
          </span>
          <XpBar progress={level.progress} className="mt-1.5" />
        </span>
      </Link>
      {boost > 0 && (
        <Link href="/shop" className="inline-flex min-h-9 items-center gap-1 rounded-full bg-sun px-2.5 text-xs font-black text-ink shadow-card" aria-label={`Double XP boost: ${boost} minutes left`}>
          ⚡ 2× <span className="tabular-nums">{boost}m</span>
        </Link>
      )}
      <Link
        href="/quests"
        className="inline-flex min-h-10 items-center gap-1 rounded-full bg-paper px-2.5 text-sm font-black shadow-card"
        aria-label={`${status.display} day streak`}
      >
        <FlameIcon size={20} lit={status.activeToday} className={cn(status.activeToday && 'animate-flicker')} />
        <span className="tabular-nums">{status.display}</span>
      </Link>
      <Link
        href="/shop"
        className={cn('inline-flex min-h-10 items-center gap-1 rounded-full bg-paper px-2.5 text-sm font-black shadow-card transition-transform', coinBump && 'scale-110')}
        aria-label={`${coins} coins — open the shop`}
        data-testid="hud-coins"
      >
        <CoinIcon size={20} spin={coinBump} />
        <AnimatedNumber value={coins} duration={700} />
      </Link>
    </div>
  );
}
