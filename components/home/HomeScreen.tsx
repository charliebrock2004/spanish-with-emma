'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EmmaBubble, SceneBackdrop, sceneFor, useEquipped } from '@/components/cosmetics/cosmetics';
import { EmmaPortrait } from '@/components/emma/EmmaFigure';
import type { EmmaState } from '@/components/emma/emma';
import { ChestIcon, CoinIcon, FlameIcon } from '@/components/game-ui/icons';
import { LevelBadge, XpBar } from '@/components/game-ui/parts';
import { DailyQuestList, TomorrowPreview, WeeklyCard } from '@/components/quests/QuestParts';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/primitives';
import { useVoiceStatus } from '@/components/voice/hooks';
import { REGIONS } from '@/data/regions';
import { CHESTS } from '@/lib/game/chests';
import { levelUpReward } from '@/lib/game/economy';
import { playerLevelFromXp } from '@/lib/game/levels';
import { allQuestsDone } from '@/lib/game/quests';
import { nextMilestone } from '@/lib/game/streakRewards';
import { useNow } from '@/lib/hooks/useNow';
import { localDateKey } from '@/lib/progress/dates';
import { computeJourney } from '@/lib/progress/journey';
import { reviewQueue } from '@/lib/progress/srs';
import { streakStatus } from '@/lib/progress/streak';
import { voiceService } from '@/services/voice/VoiceService';
import { useGameStore } from '@/store/gameStore';
import { useUiStore } from '@/store/uiStore';
import type { LessonSummary, LevelMeta } from '@/types/curriculum';
import { cn, formatNumber } from '@/lib/utils';

interface Mood {
  state: EmmaState;
  line: string;
}

function greeting(hour: number, name: string) {
  const who = name || 'amigo';
  if (hour >= 5 && hour < 13) return `¡Buenos días, ${who}!`;
  if (hour >= 13 && hour < 20) return `¡Buenas tardes, ${who}!`;
  return `¡Buenas noches, ${who}!`;
}

/** What Emma says on the Home screen — she notices what's going on. */
function useMood(): Mood {
  const name = useGameStore((s) => s.profile.name);
  const lessons = useGameStore((s) => Object.keys(s.completedLessons).length);
  const streak = useGameStore((s) => s.streak);
  const quests = useGameStore((s) => s.quests);
  const unopened = useGameStore((s) => s.chests.filter((c) => !c.openedAt).length);
  const now = useNow();
  return useMemo(() => {
    const hour = now ? new Date(now).getHours() : 12;
    const hello = greeting(hour, name);
    const status = streakStatus(streak, localDateKey());
    if (lessons === 0) return { state: 'excited', line: `${hello} I'm Emma. Let's get your very first Spanish words sorted — it takes five minutes.` };
    if (unopened > 0) return { state: 'excited', line: `${hello} Ooh — you've got ${unopened === 1 ? 'a chest' : `${unopened} chests`} to open. Go on…` };
    if (allQuestsDone(quests)) return { state: 'proud', line: `${hello} Every quest done today. ¡Qué crack! Anything else is a bonus.` };
    if (hour >= 22 || hour < 5) return { state: 'sleepy', line: `${hello} It's late… one wee lesson and then bed?` };
    if (status.lapsed && streak.longest > 1) return { state: 'happy', line: `${hello} No guilt — let's just pick up where we left off.` };
    if (status.atRisk && status.display > 0) return { state: 'encouraging', line: `${hello} Your ${status.display}-day streak is waiting for you. One quick lesson?` };
    if (status.activeToday) return { state: 'happy', line: `${hello} Nice work today. Fancy a quest or a wee chat?` };
    return { state: 'happy', line: `${hello} Ready for a little Spanish?` };
  }, [name, lessons, streak, quests, unopened, now]);
}

/** Emma on her stage, in the player's chosen outfit and background. Tap her to hear her. */
function Stage({ mood, children }: { mood: Mood; children?: React.ReactNode }) {
  const name = useGameStore((s) => s.profile.name);
  const equipped = useEquipped();
  const dark = sceneFor(equipped.background).tone === 'dark';
  const { speaking } = useVoiceStatus();
  const [tapped, setTapped] = useState(false);
  const state: EmmaState = speaking && tapped ? 'speaking' : mood.state;
  return (
    <section className="relative isolate min-h-[272px] animate-enter overflow-hidden rounded-[2rem] shadow-lift" aria-label="Emma">
      <SceneBackdrop id={equipped.background} />
      <button
        type="button"
        onClick={() => {
          setTapped(true);
          void voiceService.say(mood.line.replace(/¡[^!]*!/, (m) => `*${m}*`), { style: mood.state === 'sleepy' ? 'calm' : mood.state === 'encouraging' ? 'gentle' : 'cheerful' });
        }}
        className="absolute -right-2 -bottom-24 w-[52%] max-w-[240px]"
        aria-label="Hear Emma"
      >
        <EmmaPortrait state={state} width={240} priority className="w-full drop-shadow-xl" />
      </button>
      <div className="relative z-10 max-w-[58%] px-4 pt-5 pb-5">
        <h1 className={cn('font-display text-[28px] leading-[1.05] font-semibold tracking-tight', dark ? 'text-cream' : 'text-ink')}>
          Hola {name || 'amigo'} <span className="inline-block origin-bottom-right animate-tilt">👋</span>
        </h1>
        <EmmaBubble className="mt-3 animate-pop" tail="left">
          <p className="text-[15px] leading-snug font-bold">{mood.line}</p>
        </EmmaBubble>
        {children}
      </div>
    </section>
  );
}

/** The next thing worth earning, with a bar towards it. */
function NextReward() {
  const xp = useGameStore((s) => s.xp);
  const streak = useGameStore((s) => s.streak);
  const level = playerLevelFromXp(xp);
  const reward = levelUpReward(level.level + 1);
  const milestone = nextMilestone(streak.current);
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <Link href="/profile" className="rounded-2xl bg-paper px-3 py-2.5 shadow-card active:scale-[0.98]">
        <span className="flex items-center gap-2">
          <LevelBadge level={level.level + 1} progress={level.progress} size={30} />
          <span className="min-w-0 text-xs leading-tight font-extrabold">
            Level {level.level + 1}
            <span className="block font-bold text-ink-soft">{formatNumber(level.xpForNext - level.xpInto)} XP to go</span>
          </span>
        </span>
        <XpBar progress={level.progress} className="mt-2" />
        <span className="mt-1.5 flex items-center gap-1 text-[11px] font-extrabold text-ink-soft">
          +{reward.coins} <CoinIcon size={12} /> {reward.chest ? '+ chest' : ''}
        </span>
      </Link>
      <Link href="/quests#streak" className="rounded-2xl bg-paper px-3 py-2.5 shadow-card active:scale-[0.98]">
        <span className="flex items-center gap-2">
          <FlameIcon size={30} lit={streak.current > 0} />
          <span className="min-w-0 text-xs leading-tight font-extrabold">
            {milestone ? `${milestone.days} day streak` : 'Legend status'}
            <span className="block font-bold text-ink-soft">{milestone ? `${milestone.days - streak.current} day${milestone.days - streak.current === 1 ? '' : 's'} to go` : 'You did it'}</span>
          </span>
        </span>
        <XpBar progress={milestone ? streak.current / milestone.days : 1} className="mt-2" />
        {milestone && (
          <span className="mt-1.5 flex items-center gap-1 text-[11px] font-extrabold text-ink-soft">
            +{milestone.coins} <CoinIcon size={12} /> {milestone.item || milestone.chest ? '+ a surprise' : ''}
          </span>
        )}
      </Link>
    </div>
  );
}

function ChestShelf() {
  const all = useGameStore((s) => s.chests);
  const chests = useMemo(() => all.filter((c) => !c.openedAt), [all]);
  const openChest = useUiStore((s) => s.openChest);
  if (chests.length === 0) return null;
  return (
    <section className="mt-4 animate-enter rounded-[var(--radius-card)] bg-gradient-to-r from-sun-light to-[#fff4d6] p-4 shadow-card" aria-label="Chests to open">
      <div className="flex items-center gap-3">
        <ChestIcon size={52} tone="gold" className="animate-chest-shake" />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">
            {chests.length === 1 ? 'A chest is waiting!' : `${chests.length} chests are waiting!`}
          </p>
          <p className="truncate text-sm text-ink-soft">{CHESTS[chests[0].kind].name} · {chests[0].source}</p>
        </div>
        <button
          type="button"
          onClick={() => openChest(chests[0].id)}
          className="min-h-11 rounded-full bg-terracotta px-5 text-sm font-black text-white shadow-[0_3px_0_var(--color-terracotta-dark)] active:translate-y-[2px] active:shadow-none"
        >
          Open
        </button>
      </div>
    </section>
  );
}

function QuickTile({ href, emoji, title, detail, tone }: { href: string; emoji: string; title: string; detail: string; tone: string }) {
  return (
    <Link href={href} className={cn('rounded-[var(--radius-card)] p-4 shadow-card transition-transform active:scale-[0.97]', tone)}>
      <span className="text-2xl" aria-hidden>
        {emoji}
      </span>
      <span className="mt-2 block font-extrabold">{title}</span>
      <span className="block text-sm opacity-75">{detail}</span>
    </Link>
  );
}

export function HomeScreen({ lessons, levels }: { lessons: LessonSummary[]; levels: LevelMeta[] }) {
  const placement = useGameStore((s) => s.profile.placementLevel);
  const completed = useGameStore((s) => s.completedLessons);
  const quests = useGameStore((s) => s.quests);
  const weekly = useGameStore((s) => s.weekly);
  const coins = useGameStore((s) => s.coins);
  const vocab = useGameStore((s) => s.vocab);
  const mood = useMood();
  const now = useNow();

  const journey = useMemo(() => computeJourney(lessons, completed, placement), [lessons, completed, placement]);
  const dueCount = useMemo(() => (now ? reviewQueue(vocab, now, { limit: 99 }).length : 0), [vocab, now]);
  const region = REGIONS[journey.currentLevel];
  const meta = levels.find((l) => l.id === journey.currentLevel);
  const progress = journey.levels.find((l) => l.level === journey.currentLevel);
  const next = journey.current;
  const firstTime = Object.keys(completed).length === 0;
  const todayDone = allQuestsDone(quests);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-3">
      <Stage mood={mood}>
        <Link
          href="/learn"
          className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-paper/85 px-3 py-1.5 text-xs font-extrabold text-ink shadow-card backdrop-blur"
        >
          <span aria-hidden>{region.landmark}</span>
          <span className="truncate">
            {region.name} · Level {journey.currentLevel}
            {meta ? ` · ${meta.cefr}` : ''}
          </span>
        </Link>
      </Stage>

      {/* The big button */}
      <div className="mt-4 animate-enter [animation-delay:60ms]">
        {next ? (
          <ButtonLink
            href={`/lesson/${next.id}`}
            size="lg"
            block
            className="!h-auto min-h-16 flex-col !gap-0 py-2.5"
            icon={undefined}
            aria-label={`${firstTime ? 'Start learning' : 'Continue quest'}: ${next.title}`}
          >
            <span className="flex items-center gap-2 text-lg">
              <Icon name="play" size={20} filled strokeWidth={0} /> {firstTime ? 'Start learning' : 'Continue quest'}
            </span>
            <span className="text-xs font-bold tracking-normal normal-case opacity-90">
              {next.emoji} {next.title}
              {progress ? ` · lesson ${progress.done + 1} of ${progress.total}` : ''}
            </span>
          </ButtonLink>
        ) : (
          <ButtonLink href="/emma" size="lg" block>
            Talk to Emma
          </ButtonLink>
        )}
        <NextReward />
      </div>

      <ChestShelf />

      {/* Daily quests */}
      {quests && (
        <Card className="mt-4 animate-enter p-4 [animation-delay:120ms]">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">{todayDone ? 'Today complete ✓' : 'Daily quests'}</h2>
            <Link href="/quests" className="inline-flex min-h-11 items-center gap-1 text-sm font-extrabold text-terracotta">
              All quests <Icon name="chevronRight" size={16} />
            </Link>
          </div>
          <DailyQuestList daily={quests} />
          {todayDone && <TomorrowPreview className="mt-3" />}
        </Card>
      )}

      {weekly && (
        <Link href="/quests" className="mt-4 block animate-enter [animation-delay:180ms]">
          <Card className="p-4 transition-transform active:scale-[0.99]">
            <WeeklyCard weekly={weekly} compact />
          </Card>
        </Link>
      )}

      {/* Quick actions */}
      <div className="mt-4 grid animate-enter grid-cols-2 gap-3 [animation-delay:240ms]">
        <QuickTile href="/emma" emoji="💬" title="Talk to Emma" detail="Real conversation practice" tone="bg-ink text-cream" />
        <QuickTile href="/review" emoji="🎮" title="Games & review" detail={dueCount > 0 ? `${dueCount} word${dueCount === 1 ? '' : 's'} to refresh` : 'Six games to play'} tone="bg-paper" />
        <QuickTile href="/shop" emoji="🛍️" title="Shop" detail={`${formatNumber(coins)} coins to spend`} tone="bg-[#fff4d6]" />
        <QuickTile href="/learn" emoji="🗺️" title="World map" detail={`${region.name} · ${progress?.done ?? 0}/${progress?.total ?? 0}`} tone="bg-sage-light" />
      </div>

      <p className="mt-6 mb-2 text-center text-xs font-bold text-ink-faint">Tip: tap Emma to hear her.</p>
    </div>
  );
}
