/** Local calendar date as YYYY-MM-DD (streaks follow the player's own day). */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  return Math.round((keyToUtc(to) - keyToUtc(from)) / 86_400_000);
}

export function addDays(key: string, days: number): string {
  const date = new Date(keyToUtc(key) + days * 86_400_000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The last `count` date keys ending today, oldest first. */
export function lastDays(count: number, today: string = localDateKey()): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)));
}

export const DAY_MS = 86_400_000;
