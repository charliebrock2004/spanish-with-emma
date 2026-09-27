import { soundService } from './SoundService';

/**
 * Optional background music: a slow, warm nylon-guitar loop generated live
 * (Karplus–Strong plucked strings over an Andalusian-flavoured progression).
 * It plays quietly on menu screens and ducks whenever Emma speaks or listens.
 */

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// Am – G – F – E, then Am – Dm – E – Am.
const PROGRESSION: number[][] = [
  [45, 52, 57, 60, 64],
  [43, 50, 55, 59, 62],
  [41, 48, 53, 57, 60],
  [40, 47, 52, 56, 59],
  [45, 52, 57, 60, 64],
  [38, 50, 57, 62, 65],
  [40, 47, 52, 56, 59],
  [45, 52, 57, 60, 64],
];
const ARPEGGIO = [0, 2, 3, 4, 3, 2, 3, 1];
const MELODY = [69, 72, 74, 76, 79, 81];
const BPM = 72;
const EIGHTH = 60 / BPM / 2;
const VOLUME = 0.22;

class MusicService {
  private playing = false;
  private gain: GainNode | null = null;
  private timer = 0;
  private nextTime = 0;
  private step = 0;
  private buffers = new Map<number, AudioBuffer>();
  private reverb: ConvolverNode | null = null;
  private ducked = false;
  private seed = 7;

  private random(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  private pluck(ctx: AudioContext, midi: number): AudioBuffer {
    const cached = this.buffers.get(midi);
    if (cached) return cached;
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * 2.6);
    const buffer = ctx.createBuffer(1, length, rate);
    const out = buffer.getChannelData(0);
    const period = Math.max(2, Math.round(rate / midiToFreq(midi)));
    const ring = new Float32Array(period);
    // A softened noise burst gives a nylon-string attack.
    let last = 0;
    for (let i = 0; i < period; i++) {
      const noise = Math.random() * 2 - 1;
      last = last * 0.6 + noise * 0.4;
      ring[i] = last;
    }
    const damping = midi < 50 ? 0.9965 : 0.9945;
    let idx = 0;
    for (let i = 0; i < length; i++) {
      const next = (idx + 1) % period;
      const value = ring[idx];
      ring[idx] = damping * 0.5 * (value + ring[next]);
      out[i] = value;
      idx = next;
    }
    this.buffers.set(midi, buffer);
    return buffer;
  }

  private makeReverb(ctx: AudioContext): ConvolverNode {
    const seconds = 2.2;
    const length = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
    const conv = ctx.createConvolver();
    conv.buffer = impulse;
    return conv;
  }

  private note(ctx: AudioContext, midi: number, time: number, velocity: number) {
    if (!this.gain) return;
    const src = ctx.createBufferSource();
    src.buffer = this.pluck(ctx, midi);
    const amp = ctx.createGain();
    amp.gain.value = velocity;
    src.connect(amp);
    amp.connect(this.gain);
    if (this.reverb) {
      const send = ctx.createGain();
      send.gain.value = 0.25;
      amp.connect(send).connect(this.reverb);
    }
    src.start(time);
  }

  private schedule = () => {
    const ctx = soundService.context();
    if (!ctx || !this.playing) return;
    while (this.nextTime < ctx.currentTime + 0.3) {
      const bar = Math.floor(this.step / 8) % PROGRESSION.length;
      const beat = this.step % 8;
      const chord = PROGRESSION[bar];
      const velocity = beat === 0 ? 0.55 : 0.32 + this.random() * 0.08;
      this.note(ctx, chord[ARPEGGIO[beat]], this.nextTime, velocity);
      if ((beat === 0 || beat === 4) && this.random() < 0.35) {
        const melody = MELODY[Math.floor(this.random() * MELODY.length)];
        this.note(ctx, melody, this.nextTime + EIGHTH * (this.random() < 0.5 ? 0 : 1), 0.22);
      }
      this.nextTime += EIGHTH * (beat % 2 === 0 ? 1.04 : 0.96); // a little swing
      this.step++;
    }
  };

  start(): void {
    if (this.playing) return;
    const ctx = soundService.context();
    if (!ctx) return;
    this.playing = true;
    if (!this.gain) {
      this.gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3200;
      this.gain.connect(filter).connect(ctx.destination);
      this.reverb = this.makeReverb(ctx);
      this.reverb.connect(filter);
    }
    this.gain.gain.cancelScheduledValues(ctx.currentTime);
    this.gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.gain.gain.exponentialRampToValueAtTime(this.ducked ? 0.02 : VOLUME, ctx.currentTime + 2.5);
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = window.setInterval(this.schedule, 100);
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    window.clearInterval(this.timer);
    const ctx = soundService.context();
    if (ctx && this.gain) {
      this.gain.gain.cancelScheduledValues(ctx.currentTime);
      this.gain.gain.setValueAtTime(this.gain.gain.value, ctx.currentTime);
      this.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    }
  }

  setDucked(ducked: boolean): void {
    this.ducked = ducked;
    if (!this.playing || !this.gain) return;
    const ctx = soundService.context();
    if (!ctx) return;
    this.gain.gain.cancelScheduledValues(ctx.currentTime);
    this.gain.gain.setValueAtTime(Math.max(0.0001, this.gain.gain.value), ctx.currentTime);
    this.gain.gain.exponentialRampToValueAtTime(ducked ? 0.02 : VOLUME, ctx.currentTime + 0.4);
  }

  isPlaying(): boolean {
    return this.playing;
  }
}

export const musicService = new MusicService();
