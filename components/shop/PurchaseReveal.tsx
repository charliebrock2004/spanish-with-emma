'use client';

import { useEffect, useRef, useState } from 'react';
import { EmmaBubble, SceneBackdrop, useEquipped } from '@/components/cosmetics/cosmetics';
import { EmmaAvatar } from '@/components/emma/EmmaAvatar';
import { EmmaPortrait } from '@/components/emma/EmmaFigure';
import { emmaLine } from '@/components/emma/lines';
import { Sparks } from '@/components/game-ui/Sparks';
import { Button } from '@/components/ui/Button';
import { Confetti } from '@/components/ui/Confetti';
import type { ShopItem } from '@/data/shop';
import { haptics } from '@/services/haptics';
import { soundService } from '@/services/sound/SoundService';
import { voiceService } from '@/services/voice/VoiceService';
import { useGameStore } from '@/store/gameStore';
import { RARITY } from './ItemPreview';

/**
 * Just bought something Emma can wear: she puts it on straight away. Outfits,
 * backgrounds, frames, bubbles and colour themes each show off in their own
 * way; "Switch back" undoes the change if the old look was better.
 */
export function PurchaseReveal({ item, previous, onClose }: { item: ShopItem; previous: string | null; onClose: () => void }) {
  const equip = useGameStore((s) => s.equip);
  const equipped = useEquipped();
  const [line] = useState(() => (item.category === 'theme' ? 'Ooh — everything’s changed colour!' : emmaLine('wearing')));
  const closeRef = useRef<HTMLButtonElement>(null);

  // The reveal is the moment: achievement toasts wait until it's closed.
  const setToastsPaused = useGameStore((s) => s.setToastsPaused);
  useEffect(() => {
    setToastsPaused(true, 'reveal');
    return () => setToastsPaused(false, 'reveal');
  }, [setToastsPaused]);

  useEffect(() => {
    const sparkle = window.setTimeout(() => soundService.play('unlock'), 250);
    haptics.play('milestone');
    const speak = window.setTimeout(() => void voiceService.say(line, { style: 'excited' }), 700);
    const focus = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 400);
    return () => {
      window.clearTimeout(sparkle);
      window.clearTimeout(speak);
      window.clearTimeout(focus);
    };
  }, [line]);

  const stage = () => {
    switch (item.category) {
      case 'frame':
        return (
          <div className="absolute inset-0 grid place-items-center">
            <span className="relative animate-pop">
              <EmmaAvatar framed frame={item.id} size={168} state="excited" />
              <Sparks count={14} distance={110} size={8} />
            </span>
          </div>
        );
      case 'bubble':
        return (
          <>
            <EmmaPortrait state="excited" width={220} className="absolute -right-3 -bottom-12 w-[200px] drop-shadow-xl" />
            <div className="absolute top-8 left-4 max-w-[52%] animate-pop">
              <EmmaBubble id={item.id} tail="right">
                <p className="font-bold">¡Hola! Do you like my new bubble?</p>
              </EmmaBubble>
            </div>
          </>
        );
      default:
        return (
          <span className="absolute inset-x-0 -bottom-14 mx-auto block w-[250px] animate-pop">
            <EmmaPortrait state="excited" outfit={item.category === 'outfit' ? item.id : undefined} width={260} className="w-full drop-shadow-xl" />
            <Sparks count={16} distance={130} size={8} className="bottom-24" />
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex animate-fade flex-col bg-ink/55 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={`${item.name} — Emma's wearing it now`}>
      <Confetti intensity={110} origin={0.4} className="z-[66]" />
      <div className="relative z-[67] mx-auto mt-auto w-full max-w-md animate-sheet overflow-hidden rounded-t-[2rem] bg-cream shadow-lift safe-bottom">
        <div className="relative isolate h-[min(44dvh,340px)] overflow-hidden">
          <SceneBackdrop id={item.category === 'background' ? item.id : equipped.background} />
          {stage()}
          <span className="absolute top-4 right-4 animate-slam rounded-full bg-sun px-3 py-1 text-xs font-black tracking-[0.14em] text-ink uppercase shadow-card [animation-delay:350ms]">
            New look!
          </span>
        </div>
        <div className="px-5 pt-4 pb-5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide uppercase ${RARITY[item.rarity].chip}`}>{RARITY[item.rarity].label}</span>
          <h2 className="mt-1 font-display text-[28px] leading-tight font-semibold">{item.name}</h2>
          <p className="mt-1 flex items-start gap-2 text-[17px] font-bold text-ink">
            <EmmaAvatar state="excited" size={32} animated={false} decorative />
            <span className="pt-1">{line}</span>
          </p>
          <div className="mt-5 space-y-2">
            <Button ref={closeRef} size="lg" block onClick={onClose}>
              ¡Me encanta!
            </Button>
            {previous && previous !== item.id && (
              <Button
                variant="ghost"
                size="md"
                block
                onClick={() => {
                  equip(previous);
                  soundService.play('tap');
                  onClose();
                }}
              >
                Keep it for later — switch back
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
