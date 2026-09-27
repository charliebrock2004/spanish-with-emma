'use client';

import { useRef, useState } from 'react';
import { comboMultiplier } from '@/lib/game/economy';
import { soundService } from '@/services/sound/SoundService';

/**
 * The same combo ladder as lessons: ×2 at 3 in a row, ×3 at 5, ×5 at 10.
 * `hit()` returns the multiplier for the answer just given.
 */
export function useCombo() {
  const [combo, setCombo] = useState(0);
  const run = useRef(0);
  const best = useRef(0);
  return {
    combo,
    best,
    hit(): number {
      run.current += 1;
      best.current = Math.max(best.current, run.current);
      setCombo(run.current);
      const multiplier = comboMultiplier(run.current);
      if (run.current === 3 || run.current === 5 || run.current === 10) window.setTimeout(() => soundService.playCombo(multiplier), 120);
      return multiplier;
    },
    miss() {
      run.current = 0;
      setCombo(0);
    },
  };
}
