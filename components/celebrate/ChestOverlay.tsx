'use client';

import { useEffect, useRef, useState } from 'react';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { emmaLine } from '@/components/emma/lines';
import { ChestIcon } from '@/components/game-ui/icons';
import { Button } from '@/components/ui/Button';
import { Confetti } from '@/components/ui/Confetti';
import { CHESTS, chestOdds, type ResolvedPrize } from '@/lib/game/chests';
import { soundService } from '@/services/sound/SoundService';
import { useGameStore } from '@/store/gameStore';
import { useUiStore } from '@/store/uiStore';
import type { Chest } from '@/types/game';
import { cn } from '@/lib/utils';
import { describePrize, PrizeCard } from './prizes';

const TONE = { daily: 'wood', level: 'gold', milestone: 'gold', streak: 'ember', welcome: 'ember' } as const;

function Odds({ chest }: { chest: Chest }) {
  const table = CHESTS[chest.kind];
  return (
    <div className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-left text-sm text-cream/90">
      <p className="font-extrabold text-cream">What&rsquo;s inside</p>
      <p className="mt-1">Always: {table.guaranteed.map(describePrize).join(' + ')}.</p>
      <p className="mt-1">Plus one of:</p>
      <ul className="mt-1 space-y-0.5">
        {chestOdds(chest.kind).map(({ prize, percent }, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>{describePrize(prize)}</span>
            <span className="font-extrabold tabular-nums">{percent}%</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-cream/70">Chests are earned by playing — they can&rsquo;t be bought. Contents are fixed the moment you open one.</p>
    </div>
  );
}

function Reveal({ chest, onClose }: { chest: Chest; onClose: () => void }) {
  const alreadyOpen = Boolean(chest.openedAt && chest.prizes);
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>(alreadyOpen ? 'open' : 'closed');
  const [prizes, setPrizes] = useState<ResolvedPrize[]>(chest.prizes ?? []);
  const [shown, setShown] = useState(alreadyOpen ? (chest.prizes?.length ?? 0) : 0);
  const [showOdds, setShowOdds] = useState(false);
  const [line] = useState(() => emmaLine('chest'));
  const closeRef = useRef<HTMLButtonElement>(null);
  const table = CHESTS[chest.kind];

  const open = () => {
    if (phase !== 'closed') return;
    // Saved before the animation starts: a reload now can't change or repeat the prizes.
    const result = useGameStore.getState().openChest(chest.id);
    setPrizes(result ?? []);
    setPhase('opening');
    soundService.play('chest');
  };

  useEffect(() => {
    if (phase !== 'opening') return;
    const t = window.setTimeout(() => setPhase('open'), 650);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'open' || shown >= prizes.length) return;
    const t = window.setTimeout(() => {
      setShown((n) => n + 1);
      const prize = prizes[shown];
      soundService.play(prize?.type === 'item' ? 'reward' : 'coin');
    }, shown === 0 ? 150 : 420);
    return () => window.clearTimeout(t);
  }, [phase, shown, prizes]);

  const done = phase === 'open' && shown >= prizes.length;
  useEffect(() => {
    if (done) closeRef.current?.focus({ preventScroll: true });
  }, [done]);

  return (
    <div className="fixed inset-0 z-[80] flex animate-fade flex-col items-center overflow-y-auto bg-ink/90 px-5 pt-10 pb-8 text-center text-cream backdrop-blur-sm safe-top safe-bottom" role="dialog" aria-modal="true" aria-label={table.name}>
      {phase !== 'closed' && <Confetti intensity={110} origin={0.3} className="z-[90]" />}
      <p className="text-xs font-extrabold tracking-[0.22em] text-sun uppercase">{table.name}</p>
      <p className="mt-1 text-sm text-cream/75">{chest.source}</p>

      <button
        type="button"
        onClick={open}
        disabled={phase !== 'closed'}
        className="relative mt-6 grid h-48 w-48 shrink-0 place-items-center rounded-full"
        aria-label={phase === 'closed' ? 'Open the chest' : 'Chest opened'}
      >
        <span className="absolute inset-4 rounded-full bg-sun/25 blur-2xl" aria-hidden />
        {phase === 'opening' && <span className="absolute inset-10 animate-burst rounded-full border-4 border-sun" aria-hidden />}
        <ChestIcon size={160} open={phase !== 'closed'} tone={TONE[chest.kind]} className={cn('relative', phase === 'closed' && 'animate-chest-shake')} />
      </button>

      {phase === 'closed' ? (
        <>
          <p className="mt-3 font-display text-2xl font-semibold">Tap to open!</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-cream/80">
            <EmmaAvatar state="excited" size={36} animated={false} decorative />
            <span>{line}</span>
          </div>
          <button type="button" onClick={() => setShowOdds((v) => !v)} className="mt-5 min-h-11 text-sm font-extrabold text-sun underline underline-offset-4">
            {showOdds ? 'Hide the odds' : 'What could be inside?'}
          </button>
          {showOdds && <Odds chest={chest} />}
          <Button variant="ghost" size="md" className="mt-4 !text-cream/70" onClick={onClose}>
            Open later
          </Button>
        </>
      ) : (
        <div className="mt-2 w-full max-w-sm space-y-2.5" aria-live="polite">
          {prizes.slice(0, shown).map((prize, i) => (
            <PrizeCard key={i} prize={prize} className="animate-pop" />
          ))}
          {done && (
            <Button ref={closeRef} size="lg" block className="!mt-6 animate-enter" onClick={onClose}>
              Collect
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Full-screen chest opening, shown whenever a chest is picked to open. */
export function ChestOverlay() {
  const chestId = useUiStore((s) => s.chestId);
  const close = useUiStore((s) => s.closeChest);
  const chest = useGameStore((s) => (chestId ? s.chests.find((c) => c.id === chestId) : undefined));
  if (!chestId || !chest) return null;
  return <Reveal key={chestId} chest={chest} onClose={close} />;
}
