/**
 * Subtle sound effects, synthesised with the Web Audio API — no audio files to
 * download, nothing to license, and trivially switched off in Settings.
 */

export type SoundName =
  | 'correct'
  | 'incorrect'
  | 'xp'
  | 'complete'
  | 'levelUp'
  | 'achievement'
  | 'tap'
  | 'match'
  | 'streak';

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  release?: number;
  detune?: number;
}

const NOTE = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

class SoundService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Lazily creates (or resumes) the audio context — must happen after a user gesture on iOS. */
  context(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  unlock(): void {
    this.context();
  }

  private tone(freq: number, start: number, duration: number, opts: ToneOptions = {}) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const { type = 'sine', gain = 0.15, attack = 0.008, release = duration, detune = 0 } = opts;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
    osc.connect(env).connect(master);
    osc.start(start);
    osc.stop(start + attack + release + 0.05);
  }

  /** A soft bell: a fundamental plus inharmonic partials. */
  private bell(freq: number, start: number, gain = 0.1) {
    this.tone(freq, start, 1.1, { gain, release: 1.1 });
    this.tone(freq * 2.76, start, 0.6, { gain: gain * 0.35, release: 0.6 });
    this.tone(freq * 5.4, start, 0.3, { gain: gain * 0.15, release: 0.3 });
  }

  play(name: SoundName): void {
    if (!this.enabled) return;
    const ctx = this.context();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    switch (name) {
      case 'correct':
        this.tone(NOTE(84), t, 0.28, { gain: 0.12, type: 'sine' });
        this.tone(NOTE(88), t + 0.09, 0.4, { gain: 0.12, type: 'sine' });
        this.tone(NOTE(88), t + 0.09, 0.3, { gain: 0.04, type: 'triangle', detune: 6 });
        break;
      case 'incorrect':
        this.tone(NOTE(57), t, 0.18, { gain: 0.09, type: 'triangle' });
        this.tone(NOTE(53), t + 0.12, 0.3, { gain: 0.08, type: 'triangle' });
        break;
      case 'xp':
        [84, 88, 91, 96].forEach((n, i) => this.tone(NOTE(n), t + i * 0.045, 0.16, { gain: 0.06 }));
        break;
      case 'complete':
        [72, 76, 79].forEach((n, i) => this.tone(NOTE(n), t + i * 0.11, 0.3, { gain: 0.1, type: 'triangle' }));
        [72, 76, 79, 84].forEach((n) => this.tone(NOTE(n), t + 0.36, 0.9, { gain: 0.06 }));
        break;
      case 'levelUp':
        [67, 72, 76, 79].forEach((n, i) => this.tone(NOTE(n), t + i * 0.12, 0.35, { gain: 0.1, type: 'triangle' }));
        [72, 76, 79, 84, 88].forEach((n, i) => this.tone(NOTE(n), t + 0.5 + i * 0.015, 1.4, { gain: 0.05 }));
        this.bell(NOTE(96), t + 0.5, 0.04);
        break;
      case 'achievement':
        this.bell(NOTE(79), t, 0.09);
        this.bell(NOTE(86), t + 0.14, 0.08);
        break;
      case 'tap':
        this.tone(1400, t, 0.03, { gain: 0.03 });
        break;
      case 'match':
        this.tone(NOTE(81), t, 0.12, { gain: 0.07 });
        this.tone(NOTE(86), t + 0.05, 0.16, { gain: 0.06 });
        break;
      case 'streak':
        [76, 79, 83, 88].forEach((n, i) => this.tone(NOTE(n), t + i * 0.07, 0.25, { gain: 0.07, type: 'triangle' }));
        break;
    }
  }
}

export const soundService = new SoundService();
