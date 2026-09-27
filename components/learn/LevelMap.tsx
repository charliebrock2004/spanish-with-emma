'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { StarRating } from '@/components/game-ui/parts';
import { PageHeader } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Chip, ProgressBar } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/Sheet';
import { REGIONS } from '@/data/regions';
import { lessonStars } from '@/lib/game/economy';
import { computeJourney, type JourneyLesson, type LevelProgress } from '@/lib/progress/journey';
import { useGameStore } from '@/store/gameStore';
import type { LessonSummary, LevelId, LevelMeta } from '@/types/curriculum';
import { cn } from '@/lib/utils';

const ROW = 118;
const PATH_WIDTH = 300;

const LEVEL_INK: Record<LevelId, string> = {
  1: 'text-sage-dark',
  2: 'text-honey-dark',
  3: 'text-[#2f6b58]',
  4: 'text-[#3d6a8c]',
  5: 'text-terracotta-dark',
  6: 'text-brick',
};

const offsetFor = (i: number) => Math.sin(i * 0.95) * 78;

function RegionBanner({ meta, progress, stars }: { meta: LevelMeta; progress: LevelProgress; stars: number }) {
  const region = REGIONS[meta.id];
  const previous = meta.id > 1 ? REGIONS[(meta.id - 1) as LevelId] : null;
  return (
    <div
      className={cn('relative overflow-hidden rounded-[var(--radius-card)] px-5 py-5 shadow-card', !progress.unlocked && 'grayscale-[0.7]')}
      style={{ background: `linear-gradient(135deg, ${region.sky[0]}, ${region.sky[1]})` }}
    >
      <span className="pointer-events-none absolute -top-3 -right-2 text-[88px] leading-none opacity-20 select-none" aria-hidden>
        {region.landmark}
      </span>
      <div className="relative flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-paper text-3xl shadow-card" aria-hidden>
          {progress.unlocked ? region.landmark : '🔒'}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs font-extrabold tracking-[0.16em] uppercase', LEVEL_INK[meta.id])}>
            {region.name} · Level {meta.id}
          </p>
          <h2 className="font-display text-2xl leading-tight font-semibold">{meta.title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{region.blurb}</p>
        </div>
        <Chip className="bg-paper/80">{meta.cefr}</Chip>
      </div>
      {progress.unlocked ? (
        <div className="relative mt-4 flex items-center gap-3">
          <ProgressBar value={progress.done} max={progress.total} label={`${region.name} progress`} size="sm" tone="warm" />
          <span className="shrink-0 text-sm font-extrabold tabular-nums text-ink-soft">
            {progress.done}/{progress.total}
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-extrabold text-honey-dark" aria-label={`${stars} of ${progress.total * 3} stars`}>
            ⭐ {stars}/{progress.total * 3}
          </span>
        </div>
      ) : (
        <p className="relative mt-4 flex items-center gap-2 text-sm font-bold text-ink-soft">
          <Icon name="lock" size={16} /> Finish {previous?.name ?? `Level ${meta.id - 1}`} to travel here
        </p>
      )}
    </div>
  );
}

function LessonNode({
  lesson,
  x,
  onOpen,
  colour,
  stars,
}: {
  lesson: JourneyLesson;
  x: number;
  onOpen: () => void;
  colour: string;
  stars: number;
}) {
  const size = lesson.isMilestone ? 80 : 68;
  const { status } = lesson;
  return (
    // A fixed width stops the label wrapping word-by-word near the edge of the path.
    <div className="absolute flex w-[9.5rem] flex-col items-center" style={{ left: `calc(50% + ${x}px)`, top: 0, transform: 'translateX(-50%)' }}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${lesson.title} — ${status === 'completed' ? 'completed' : status === 'locked' ? 'locked' : status === 'current' ? 'next lesson' : 'available'}`}
        data-current={status === 'current' || undefined}
        className={cn(
          'relative grid place-items-center rounded-full text-3xl transition-transform duration-150 active:translate-y-[3px]',
          status === 'locked' && 'bg-cream-deep text-ink-faint shadow-[0_5px_0_var(--color-sand)] grayscale',
          status === 'completed' && 'bg-paper shadow-[0_5px_0_var(--color-sand)]',
          status === 'available' && 'border-4 bg-paper shadow-[0_5px_0_var(--color-sand)]',
          status === 'current' && 'animate-glow text-white',
        )}
        style={{
          width: size,
          height: size,
          ...(status === 'current' ? { background: colour, boxShadow: `0 5px 0 color-mix(in srgb, ${colour} 70%, black)` } : {}),
          ...(status === 'available' ? { borderColor: colour } : {}),
        }}
      >
        <span className={cn(status === 'locked' && 'opacity-40')} aria-hidden>
          {lesson.emoji}
        </span>
        {status === 'completed' && (
          <span className="absolute -right-1 -bottom-1 grid h-7 w-7 place-items-center rounded-full bg-sage text-white ring-4 ring-cream" aria-hidden>
            <Icon name="check" size={16} strokeWidth={3.2} />
          </span>
        )}
        {status === 'locked' && (
          <span className="absolute -right-1 -bottom-1 grid h-7 w-7 place-items-center rounded-full bg-sand text-ink-soft ring-4 ring-cream" aria-hidden>
            <Icon name="lock" size={14} strokeWidth={2.6} />
          </span>
        )}
      </button>
      {status === 'completed' && <StarRating stars={stars} size={14} className="mt-1.5" />}
      <span
        className={cn(
          'max-w-[9.5rem] rounded-full bg-cream/90 px-2 py-0.5 text-center text-[13px] leading-tight font-extrabold',
          status === 'completed' ? 'mt-0.5' : 'mt-2',
          status === 'locked' ? 'text-ink-faint' : 'text-ink',
        )}
      >
        {lesson.title}
      </span>
      {status === 'current' && (
        <div
          className="absolute top-2 flex items-center gap-1.5"
          style={{ [x > 0 ? 'right' : 'left']: `calc(50% + ${size / 2 + 10}px)` }}
        >
          <EmmaAvatar size={40} state="excited" animated decorative />
          <span className="animate-pop rounded-2xl bg-ink px-3 py-1.5 text-xs font-extrabold whitespace-nowrap text-cream">You are here · ¡Vamos!</span>
        </div>
      )}
    </div>
  );
}

function LevelPath({ lessons, colour, onOpen, starsFor }: { lessons: JourneyLesson[]; colour: string; onOpen: (l: JourneyLesson) => void; starsFor: (id: string) => number }) {
  const height = lessons.length * ROW;
  const points = lessons.map((_, i) => ({ x: PATH_WIDTH / 2 + offsetFor(i), y: i * ROW + 36 }));
  const d = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const midY = (prev.y + p.y) / 2;
    return `${acc} C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
  }, '');
  const doneCount = lessons.filter((l) => l.status === 'completed').length;

  return (
    <div className="relative mx-auto mt-6" style={{ width: PATH_WIDTH, height }}>
      <svg className="absolute inset-0" width={PATH_WIDTH} height={height} aria-hidden>
        <path d={d} fill="none" stroke="var(--color-sand)" strokeWidth={10} strokeLinecap="round" strokeDasharray="0 18" />
        {doneCount > 1 && (
          <path
            d={points.slice(0, doneCount).reduce((acc, p, i, arr) => {
              if (i === 0) return `M ${p.x} ${p.y}`;
              const prev = arr[i - 1];
              const midY = (prev.y + p.y) / 2;
              return `${acc} C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
            }, '')}
            fill="none"
            stroke={colour}
            strokeOpacity={0.45}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray="0 18"
          />
        )}
      </svg>
      {lessons.map((lesson, i) => (
        <div key={lesson.id} className="absolute inset-x-0" style={{ top: i * ROW, height: ROW }}>
          <LessonNode lesson={lesson} x={offsetFor(i)} colour={colour} stars={starsFor(lesson.id)} onOpen={() => onOpen(lesson)} />
        </div>
      ))}
    </div>
  );
}

export function LevelMap({ lessons, levels }: { lessons: LessonSummary[]; levels: LevelMeta[] }) {
  const router = useRouter();
  const completed = useGameStore((s) => s.completedLessons);
  const placement = useGameStore((s) => s.profile.placementLevel);
  const journey = useMemo(() => computeJourney(lessons, completed, placement), [lessons, completed, placement]);
  const [open, setOpen] = useState<JourneyLesson | null>(null);
  const scrolled = useRef(false);

  useEffect(() => {
    if (scrolled.current) return;
    scrolled.current = true;
    const node = document.querySelector('[data-current]');
    node?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
  }, []);

  const totalDone = journey.lessons.filter((l) => l.status === 'completed').length;
  const record = open ? completed[open.id] : undefined;
  const starsFor = (id: string) => {
    const r = completed[id];
    return r ? (r.stars ?? lessonStars(r.bestAccuracy, r.perfect)) : 0;
  };
  const totalStars = journey.lessons.reduce((n, l) => n + starsFor(l.id), 0);

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <PageHeader
        title="Your journey"
        subtitle={`${totalDone} of ${journey.lessons.length} lessons · ⭐ ${totalStars} of ${journey.lessons.length * 3} · Madrid to Santiago`}
      />
      <div className="mt-4 space-y-10 pb-8">
        {levels.map((meta) => {
          const progress = journey.levels.find((l) => l.level === meta.id)!;
          const levelLessons = journey.lessons.filter((l) => l.level === meta.id);
          return (
            <section key={meta.id} aria-labelledby={`level-${meta.id}`}>
              <h2 id={`level-${meta.id}`} className="sr-only">
                Level {meta.id}: {meta.title}
              </h2>
              <RegionBanner meta={meta} progress={progress} stars={levelLessons.reduce((n, l) => n + starsFor(l.id), 0)} />
              {levelLessons.length > 0 && <LevelPath lessons={levelLessons} colour={REGIONS[meta.id].colour} onOpen={setOpen} starsFor={starsFor} />}
            </section>
          );
        })}
      </div>

      <Sheet open={Boolean(open)} onClose={() => setOpen(null)} label={open?.title ?? 'Lesson'}>
        {open && (
          <div>
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-cream-deep text-4xl" aria-hidden>
                {open.emoji}
              </span>
              <div>
                <p className="text-xs font-extrabold tracking-[0.16em] text-terracotta uppercase">
                  Level {open.level} · Lesson {open.order}
                  {open.isMilestone && ' · Checkpoint'}
                </p>
                <h3 className="font-display text-2xl leading-tight font-semibold">{open.title}</h3>
                <p className="text-ink-soft">{open.description}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Chip>
                <Icon name="clock" size={14} /> {open.estimatedMinutes} min
              </Chip>
              <Chip>✨ {open.xpReward}+ XP</Chip>
              {open.vocabCount > 0 && <Chip>📚 {open.vocabCount} new words</Chip>}
              {record && <Chip className="bg-sage-light text-sage-dark">✓ Best {Math.round(record.bestAccuracy * 100)}%</Chip>}
              {record && (
                <Chip className="bg-sun-light">
                  <StarRating stars={starsFor(open.id)} size={12} />
                </Chip>
              )}
            </div>
            <div className="mt-6">
              {open.status === 'locked' ? (
                <p className="flex items-center gap-3 rounded-2xl bg-cream-deep px-4 py-3 font-bold text-ink-soft">
                  <Icon name="lock" size={20} />
                  Finish the lessons before this one to unlock it.
                </p>
              ) : (
                <>
                  <Button size="lg" block onClick={() => router.push(`/lesson/${open.id}`)}>
                    {open.status === 'completed' ? (starsFor(open.id) < 3 ? 'Play again for ⭐⭐⭐' : 'Practise again') : 'Start lesson'}
                  </Button>
                  {open.status === 'completed' && starsFor(open.id) < 3 && (
                    <p className="mt-2 text-center text-xs font-bold text-ink-faint">Three stars = no mistakes at all. Perfect runs earn a bonus.</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
