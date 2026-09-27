export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Small, fast, deterministic PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickRandom<T>(items: readonly T[], random: () => number = Math.random): T {
  return items[Math.floor(random() * items.length)];
}

export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

export function unique<T>(items: Iterable<T>): T[] {
  return Array.from(new Set(items));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Replaces {name} with the player's name. */
export function personalise(text: string, name: string): string {
  return text.replace(/\{name\}/g, name || 'amigo');
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-GB').format(n);
}

export function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
