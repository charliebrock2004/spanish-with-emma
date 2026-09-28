'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { Icon } from '@/components/ui/Icon';
import { REGIONS } from '@/data/regions';
import { LEVEL_IDS, type LevelProgress } from '@/lib/progress/journey';
import type { LevelId, LevelMeta } from '@/types/curriculum';
import { cn } from '@/lib/utils';
import { Skyline } from './Skyline';

/**
 * The journey across Spain, in pieces: a postcard for each stop, the passport
 * stamp you get for finishing one, the train ride between them, and the route
 * strip that shows how far you've come.
 */

const sky = (level: LevelId) => `linear-gradient(180deg, ${REGIONS[level].sky[0]} 0%, ${REGIONS[level].sky[1]} 100%)`;

/** A passport stamp for a finished stop. */
export function PassportStamp({ level, className, animated = false }: { level: LevelId; className?: string; animated?: boolean }) {
  const region = REGIONS[level];
  return (
    <span
      className={cn(
        'pointer-events-none grid h-[78px] w-[78px] rotate-[-12deg] place-items-center rounded-full border-[3px] border-double text-center select-none',
        animated && 'animate-slam',
        className,
      )}
      style={{ borderColor: region.colour, color: region.colour, background: 'rgb(251 243 232 / 0.72)' }}
      aria-label={`${region.name} complete`}
      role="img"
    >
      <span className="leading-none">
        <span className={cn('block font-black tracking-[0.06em] uppercase', region.name.length > 7 ? 'text-[8px]' : 'text-[9.5px]')}>{region.name}</span>
        <span className="mt-1 block text-lg leading-none" aria-hidden>
          ✓
        </span>
        <span className="mt-0.5 block text-[7px] font-extrabold tracking-[0.1em] uppercase">Completado</span>
      </span>
    </span>
  );
}

/** One stop on the map: its skyline, how far through it you are, or what's waiting there. */
export function RegionPostcard({
  meta,
  progress,
  stars,
  current,
  previous,
}: {
  meta: LevelMeta;
  progress: LevelProgress;
  stars: number;
  /** The stop you're working through now. */
  current: boolean;
  previous: LevelProgress | null;
}) {
  const region = REGIONS[meta.id];
  const locked = !progress.unlocked;
  const toGo = previous ? previous.total - previous.done : 0;
  return (
    <article
      className="relative isolate overflow-hidden rounded-[var(--radius-card)] shadow-card"
      style={{ background: sky(meta.id), ...(current ? ({ outline: `3px solid ${region.colour}`, outlineOffset: 3 } as CSSProperties) : {}) }}
      aria-label={`Stop ${meta.id}: ${region.name}${locked ? ', not reached yet' : progress.complete ? ', complete' : ''}`}
    >
      <div className="relative z-10 px-5 pt-4">
        <div className="flex items-start gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-lg font-semibold text-white shadow-card"
            style={{ background: locked ? 'var(--color-ink-faint)' : region.colour }}
            aria-hidden
          >
            {locked ? <Icon name="lock" size={16} strokeWidth={2.6} /> : meta.id}
          </span>
          <div className="min-w-0 flex-1 pr-16">
            <p className="text-[11px] font-extrabold tracking-[0.16em] uppercase" style={{ color: locked ? undefined : region.colour }}>
              {current ? 'You are here' : locked ? 'Next stop' : `Stop ${meta.id}`} · {meta.cefr}
            </p>
            <h2 className="font-display text-[28px] leading-none font-semibold">{region.name}</h2>
            <p className="mt-1 text-sm font-bold text-ink-soft">{meta.title}</p>
          </div>
        </div>
        <p className="mt-2 text-sm text-ink-soft">{region.blurb}</p>
      </div>

      {progress.complete && <PassportStamp level={meta.id} className="absolute top-3 right-3 z-10" />}

      {/* The skyline, sitting on the progress strip like a postcard picture. */}
      <div className={cn('relative mt-1 h-[112px]', locked && 'opacity-50 grayscale-[0.65]')} aria-hidden>
        <Skyline level={meta.id} className="absolute inset-0 h-full w-full" />
      </div>
      <div className="relative border-t border-sand/70 bg-paper px-4 py-2.5">
        {locked ? (
          <p className="flex items-center gap-2 text-sm font-bold text-ink-soft">
            <Icon name="lock" size={15} />
            <span className="min-w-0 flex-1">
              {previous ? `${toGo} lesson${toGo === 1 ? '' : 's'} more in ${REGIONS[previous.level].name} to travel here` : 'Coming up'}
            </span>
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream-deep"
              role="progressbar"
              aria-label={`${region.name} progress`}
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.done}
            >
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%`, background: region.colour }} />
            </div>
            <span className="shrink-0 text-sm font-extrabold tabular-nums text-ink-soft">
              {progress.done}/{progress.total}
            </span>
            <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-extrabold text-honey-dark" aria-label={`${stars} of ${progress.total * 3} stars`}>
              ⭐ {stars}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

/** The ride between two stops. */
export function TravelLeg({ to, travelled }: { to: LevelId; travelled: boolean }) {
  const region = REGIONS[to];
  const line = travelled ? { borderColor: region.colour } : undefined;
  return (
    <div className="flex items-center gap-2 pt-10 pb-2" aria-label={`On to ${region.name}: ${region.travel}`}>
      <span className="flex-1 border-t-[3px] border-dashed border-sand" style={line} aria-hidden />
      <span className={cn('flex max-w-[80%] items-center gap-2 rounded-2xl px-3.5 py-2 shadow-card', travelled ? 'bg-paper text-ink' : 'bg-cream-deep text-ink-soft')}>
        <span className="text-lg" aria-hidden>
          🚆
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-xs font-black">On to {region.name}</span>
          <span className="block text-[11px] font-bold opacity-75">{region.travel}</span>
        </span>
      </span>
      <span className="flex-1 border-t-[3px] border-dashed border-sand" style={line} aria-hidden />
    </div>
  );
}

/** Madrid to Santiago on one line: where you've been, where you are, what's left. */
export function JourneyRoute({ levels, current, compact = false, className }: { levels: LevelProgress[]; current: LevelId; compact?: boolean; className?: string }) {
  const node = compact ? 22 : 28;
  const done = levels.filter((l) => l.complete).length;
  return (
    <div
      className={cn('relative', compact ? 'pt-5 pb-4' : 'pt-7 pb-5', className)}
      role="img"
      aria-label={`Journey: ${done} of ${LEVEL_IDS.length} stops complete, now in ${REGIONS[current].name}`}
    >
      <div className="relative flex items-center justify-between">
        {/* The line underneath: coloured as far as you've travelled. */}
        <span className="absolute inset-x-2 top-1/2 -translate-y-1/2 border-t-[3px] border-dashed border-sand" aria-hidden />
        <span
          className="absolute left-2 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-sage transition-[width] duration-700"
          style={{ width: `calc(${((current - 1) / (LEVEL_IDS.length - 1)) * 100}% - 0.5rem)` }}
          aria-hidden
        />
        {LEVEL_IDS.map((id) => {
          const region = REGIONS[id];
          const state = levels.find((l) => l.level === id);
          const isCurrent = id === current;
          const complete = Boolean(state?.complete);
          return (
            <span key={id} className="relative grid place-items-center" style={{ width: node, height: node }}>
              {isCurrent ? (
                <>
                  <span className="absolute inset-[-4px] animate-pulse-ring rounded-full" style={{ background: `${region.colour}33` }} aria-hidden />
                  <EmmaAvatar size={node + 6} state="happy" animated={false} decorative className="relative rounded-full ring-2 ring-paper" />
                  <span
                    className={cn('absolute left-1/2 -translate-x-1/2 font-extrabold whitespace-nowrap', compact ? '-top-5 text-[11px]' : '-top-7 text-xs')}
                    style={{ color: region.colour }}
                  >
                    {region.name}
                  </span>
                </>
              ) : (
                <span
                  className={cn('grid h-full w-full place-items-center rounded-full text-[10px] font-black ring-2 ring-cream', complete ? 'text-white' : 'bg-cream-deep text-ink-faint')}
                  style={complete ? { background: region.colour } : undefined}
                  aria-hidden
                >
                  {complete ? <Icon name="check" size={compact ? 11 : 13} strokeWidth={3.4} /> : id}
                </span>
              )}
              {(id === 1 || id === 6) && !isCurrent && (
                <span className={cn('absolute left-1/2 -translate-x-1/2 font-bold whitespace-nowrap text-ink-faint', compact ? '-bottom-4 text-[10px]' : '-bottom-5 text-[11px]')}>
                  {region.name}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Home's "where am I going" card: this stop's progress, the next stop and the whole route. */
export function JourneyCard({ levels, current, lessonsLeft }: { levels: LevelProgress[]; current: LevelId; lessonsLeft: number }) {
  const region = REGIONS[current];
  const next = current < 6 ? REGIONS[(current + 1) as LevelId] : null;
  const progress = levels.find((l) => l.level === current);
  return (
    <Link
      href="/learn"
      className="relative isolate mt-4 block overflow-hidden rounded-[var(--radius-card)] px-4 pt-3.5 pb-2 shadow-card transition-transform active:scale-[0.99]"
      style={{ background: sky(current) }}
      aria-label={`Your journey: ${region.name}, ${progress?.done ?? 0} of ${progress?.total ?? 0} lessons. Open the map`}
    >
      <Skyline level={current} clouds={false} className="absolute right-0 bottom-0 -z-10 h-[86px] w-[62%] opacity-70" />
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-extrabold tracking-[0.16em] uppercase" style={{ color: region.colour }}>
          Your journey · Stop {current} of 6
        </p>
        <Icon name="chevronRight" size={16} className="shrink-0 text-ink-soft" />
      </div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <h2 className="font-display text-2xl leading-tight font-semibold">{region.name}</h2>
        <span className="text-sm font-extrabold tabular-nums text-ink-soft">
          {progress?.done ?? 0}/{progress?.total ?? 0}
        </span>
      </div>
      <p className="text-sm font-bold text-ink-soft">
        {next ? (lessonsLeft > 0 ? `${lessonsLeft} lesson${lessonsLeft === 1 ? '' : 's'} to ${next.name} 🚆` : `Next stop: ${next.name} 🚆`) : 'The last stop of the Camino 🐚'}
      </p>
      <JourneyRoute levels={levels} current={current} compact className="mx-1 mt-1" />
    </Link>
  );
}

/** The results screen's journey line: this lesson moved you along. */
export function RegionProgress({ level, before, after, total }: { level: LevelId; before: number; after: number; total: number }) {
  const region = REGIONS[level];
  const next = level < 6 ? REGIONS[(level + 1) as LevelId] : null;
  const left = total - after;
  return (
    <div className="relative isolate mt-3 overflow-hidden rounded-2xl px-4 py-3 shadow-card" style={{ background: sky(level) }}>
      <Skyline level={level} clouds={false} className="absolute right-0 bottom-0 -z-10 h-16 w-1/2 opacity-60" />
      <div className="flex items-center justify-between gap-3">
        <p className="font-extrabold">
          {region.name}{' '}
          <span className="tabular-nums text-ink-soft">
            {after}/{total}
          </span>
        </p>
        {after > before && (
          <span className="animate-pop rounded-full bg-paper px-2 py-0.5 text-xs font-black shadow-card [animation-delay:1100ms]" style={{ color: region.colour }}>
            +1 lesson
          </span>
        )}
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-paper/80" aria-hidden>
        <div
          className="grow-bar h-full rounded-full"
          style={{ '--from': `${(before / Math.max(1, total)) * 100}%`, '--to': `${(after / Math.max(1, total)) * 100}%`, background: region.colour } as CSSProperties}
        />
      </div>
      <p className="mt-1.5 text-sm font-bold text-ink-soft">
        {left > 0 ? (next ? `${left} more lesson${left === 1 ? '' : 's'} to ${next.name} 🚆` : `${left} more to finish the Camino`) : `${region.name} complete!`}
      </p>
    </div>
  );
}
