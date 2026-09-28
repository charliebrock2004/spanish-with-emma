/**
 * Small vibrations for answers and rewards, on phones that support them
 * (Android browsers). iOS Safari has no vibration API, so there it's simply a
 * no-op — sound, animation and text always carry the meaning too.
 */

export type HapticPattern = 'tap' | 'soft' | 'success' | 'combo' | 'milestone';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 8,
  // A wrong answer: one gentle nudge, never a telling-off.
  soft: 14,
  success: 20,
  combo: [18, 45, 24],
  milestone: [22, 55, 22, 55, 44],
};

class Haptics {
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  get supported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  play(pattern: HapticPattern): void {
    if (!this.enabled || !this.supported) return;
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      // Some browsers throw when called without a recent user gesture.
    }
  }
}

export const haptics = new Haptics();
