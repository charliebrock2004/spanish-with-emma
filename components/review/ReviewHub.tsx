'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { MEDAL_EMOJI, medalFor } from '@/components/games/medals';
import { GAMES, MIN_CONVERSATIONS, MIN_SENTENCES, type GameDef } from '@/components/games/catalog';
import { PageHeader } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Card, Chip, Segmented } from '@/components/ui/primitives';
import { SpeakerButton } from '@/components/voice/SpeakerButton';
import { useNow } from '@/lib/hooks/useNow';
import { isDue } from '@/lib/progress/srs';
import { gameWords, masteryLabel, MIN_GAME_WORDS, seenWords, wordBucket, type WordFilter } from '@/lib/review/build';
import { normalizeText, stripAccents } from '@/lib/text/normalize';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/store/gameStore';
import type { MistakeType } from '@/types/curriculum';

const MISTAKE_LABELS: Record<MistakeType, string> = {
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  pronunciation: 'Pronunciation',
  'word-order': 'Word order',
  listening: 'Listening',
};

/** Alphabetical order ignores the opening ¿ ¡ of questions and exclamations. */
const sortKey = (spanish: string) => spanish.replace(/^[¿¡"'«\s]+/, '').toLowerCase();

function MasteryBar({ mastery }: { mastery: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`Mastery ${mastery} of 5: ${masteryLabel(mastery)}`} role="img">
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          key={step}
          className={cn('h-2 w-3 rounded-full', step <= mastery ? (mastery >= 4 ? 'bg-sage' : 'bg-sun-dark') : 'bg-cream-deep')}
        />
      ))}
    </span>
  );
}

function GameCard({ game, locked, lockText, best }: { game: GameDef; locked: boolean; lockText: string; best?: number }) {
  const body = (
    <>
      <span className={cn('grid h-12 w-12 place-items-center rounded-2xl text-2xl', game.tone, locked && 'grayscale')} aria-hidden>
        {game.emoji}
      </span>
      <span className="mt-3 block font-extrabold leading-tight">{game.title}</span>
      <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{game.tagline}</span>
      <span className="mt-2 block text-xs font-extrabold text-ink-faint">
        {locked ? (
          <span className="inline-flex items-center gap-1">
            <Icon name="lock" size={12} /> {lockText}
          </span>
        ) : best ? (
          <span className="text-honey-dark">
            {medalFor(game, best) ? `${MEDAL_EMOJI[medalFor(game, best)!]} ` : ''}Best: {best}
          </span>
        ) : (
          'New'
        )}
      </span>
    </>
  );
  return locked ? (
    <div className="rounded-[var(--radius-card)] border border-sand/60 p-4 opacity-70" aria-disabled="true">
      {body}
    </div>
  ) : (
    <Link href={`/play/${game.id}`} className="rounded-[var(--radius-card)] bg-paper p-4 shadow-card transition-transform active:scale-[0.97]">
      {body}
    </Link>
  );
}

export function ReviewHub({ sentenceLessons, conversationLessons }: { sentenceLessons: Record<string, number>; conversationLessons: Record<string, number> }) {
  const vocab = useGameStore((s) => s.vocab);
  const mistakes = useGameStore((s) => s.mistakes);
  const completed = useGameStore((s) => s.completedLessons);
  const bests = useGameStore((s) => s.gameBests);
  const now = useNow();
  const [filter, setFilter] = useState<WordFilter>('all');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const search = useDeferredValue(query);

  const words = useMemo(() => seenWords(vocab), [vocab]);
  const playable = useMemo(() => gameWords(vocab).length, [vocab]);
  const dueCount = useMemo(() => (now ? words.filter((w) => isDue(w, now)).length : 0), [words, now]);
  const open = mistakes.filter((m) => !m.resolved);
  const mistakeTypes = useMemo(() => {
    const counts = new Map<MistakeType, number>();
    for (const m of open) counts.set(m.type, (counts.get(m.type) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [open]);

  const buckets = useMemo(() => {
    const counts = { learning: 0, strong: 0, tricky: 0 };
    for (const w of words) counts[wordBucket(w)] += 1;
    return counts;
  }, [words]);

  const sum = (counts: Record<string, number>) => Object.entries(counts).reduce((n, [id, c]) => n + (completed[id] ? c : 0), 0);
  const sentences = sum(sentenceLessons);
  const chats = sum(conversationLessons);

  const list = useMemo(() => {
    const q = stripAccents(normalizeText(search.trim()));
    return words
      .filter((w) => filter === 'all' || wordBucket(w) === filter)
      .filter((w) => !q || stripAccents(normalizeText(w.spanish)).includes(q) || w.english.toLowerCase().includes(q))
      .sort((a, b) => sortKey(a.spanish).localeCompare(sortKey(b.spanish), 'es'));
  }, [words, filter, search]);
  const shown = showAll ? list : list.slice(0, 30);

  const emma =
    words.length === 0
      ? { text: 'Finish your first lesson and I’ll start building your review — the right words at the right moment.', cta: { href: '/learn', label: 'Start a lesson' } }
      : dueCount > 0
        ? {
            text: `You’ve got ${dueCount} word${dueCount === 1 ? '' : 's'} ready for review. A few minutes now and they’ll stick for good.`,
            cta: { href: '/review/smart', label: 'Start smart review' },
          }
        : { text: 'Nothing due right now — your memory’s in great shape. Want to practise anyway?', cta: { href: '/review/smart', label: 'Practise anyway' } };

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <PageHeader title="Review" subtitle="Keep your Spanish fresh." />

      {/* Smart review */}
      <section className="mt-3 animate-enter rounded-[2rem] bg-gradient-to-br from-sky-light via-cream to-sun-light p-5">
        <div className="flex items-start gap-3">
          <EmmaAvatar state={dueCount > 0 ? 'encouraging' : 'happy'} size={52} />
          <div className="min-w-0">
            <p className="text-xs font-extrabold tracking-[0.14em] text-[#3d6a8c] uppercase">Smart review</p>
            <p className="mt-1 text-[15px] leading-snug font-bold">{emma.text}</p>
          </div>
        </div>
        {words.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-paper/80 px-2 py-2.5">
              <p className="text-xl font-black tabular-nums">{dueCount}</p>
              <p className="text-xs font-bold text-ink-soft">due now</p>
            </div>
            <div className="rounded-2xl bg-paper/80 px-2 py-2.5">
              <p className="text-xl font-black tabular-nums">{words.length}</p>
              <p className="text-xs font-bold text-ink-soft">words met</p>
            </div>
            <div className="rounded-2xl bg-paper/80 px-2 py-2.5">
              <p className="text-xl font-black tabular-nums">{buckets.strong}</p>
              <p className="text-xs font-bold text-ink-soft">strong</p>
            </div>
          </div>
        )}
        <ButtonLink href={emma.cta.href} size="lg" block className="mt-4">
          {emma.cta.label}
        </ButtonLink>
      </section>

      {/* Mistakes */}
      <Card className="mt-4 animate-enter p-5 [animation-delay:60ms]">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-honey-light text-2xl" aria-hidden>
            🩹
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold">Fix my mistakes</h2>
            <p className="text-sm text-ink-soft">
              {open.length > 0
                ? `${open.length} thing${open.length === 1 ? '' : 's'} to put right — from lessons and chats.`
                : 'Nothing waiting. Mistakes you make are saved here to fix later.'}
            </p>
          </div>
        </div>
        {mistakeTypes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {mistakeTypes.map(([type, n]) => (
              <Chip key={type}>
                {MISTAKE_LABELS[type]} · {n}
              </Chip>
            ))}
          </div>
        )}
        {open.length > 0 && (
          <ButtonLink href="/review/mistakes" variant="secondary" size="md" block className="mt-4">
            Fix them now
          </ButtonLink>
        )}
      </Card>

      {/* Games */}
      <section className="mt-7 animate-enter [animation-delay:120ms]" aria-labelledby="games">
        <h2 id="games" className="px-1 font-display text-xl font-semibold">
          Games
        </h2>
        <p className="mt-1 px-1 text-sm text-ink-soft">Quick, fun practice with the words and sentences you know.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {GAMES.map((g) => {
            const locked =
              g.source === 'words' ? playable < MIN_GAME_WORDS : g.source === 'sentences' ? sentences < MIN_SENTENCES : chats < MIN_CONVERSATIONS;
            const lockText = g.source === 'words' ? `Meet ${MIN_GAME_WORDS - playable} more words` : 'Finish more lessons';
            return <GameCard key={g.id} game={g} locked={locked} lockText={lockText} best={bests[g.id]} />;
          })}
        </div>
      </section>

      {/* Words */}
      {words.length > 0 && (
        <section className="mt-7 animate-enter [animation-delay:180ms]" aria-labelledby="words">
          <div className="flex items-baseline justify-between px-1">
            <h2 id="words" className="font-display text-xl font-semibold">
              Your words
            </h2>
            <span className="text-sm font-bold text-ink-soft">{words.length} met</span>
          </div>
          <div className="mt-3">
            <Segmented
              label="Filter words"
              value={filter}
              onChange={(v) => {
                setFilter(v);
                setShowAll(false);
              }}
              options={[
                { value: 'all', label: 'All' },
                { value: 'learning', label: <>Learning <span className="text-ink-faint">{buckets.learning}</span></> },
                { value: 'strong', label: <>Strong <span className="text-ink-faint">{buckets.strong}</span></> },
                { value: 'tricky', label: <>Tricky <span className="text-ink-faint">{buckets.tricky}</span></> },
              ]}
            />
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-full border-2 border-sand bg-paper px-4 focus-within:border-terracotta">
            <Icon name="search" size={18} className="text-ink-faint" />
            <span className="sr-only">Search your words</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in Spanish or English"
              className="h-11 min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-ink-faint"
              autoComplete="off"
            />
          </label>
          <ul className="mt-3 divide-y divide-sand/60 overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-card">
            {shown.map((w) => (
              <li key={w.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p lang="es" className="spanish truncate text-[17px]">
                    {w.spanish}
                  </p>
                  <p className="truncate text-sm text-ink-soft">{w.english}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <MasteryBar mastery={w.mastery} />
                  <span className="text-[11px] font-bold text-ink-faint">{masteryLabel(w.mastery)}</span>
                </div>
                <SpeakerButton text={w.spanish} size="sm" showSlow={false} quiet label={`Hear ${w.spanish}`} />
              </li>
            ))}
            {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-soft">No words match.</li>}
          </ul>
          {list.length > shown.length && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1 text-sm font-extrabold text-terracotta"
            >
              Show all {list.length} <Icon name="chevronDown" size={16} />
            </button>
          )}
        </section>
      )}
    </div>
  );
}
