'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface DayBar {
  key: string;
  /** Short label under the column (e.g. "M"). */
  label: string;
  /** Full label for the readout and table (e.g. "Monday 22 Sep"). */
  full: string;
  minutes: number;
  xp: number;
  today: boolean;
}

const PLOT = 128;

/**
 * Minutes practised per day for the last week — one series, one hue, with the
 * daily goal as a reference line. Tap or focus a column for its numbers; a
 * table twin carries the same values for screen readers.
 */
export function WeekChart({ days, goal }: { days: DayBar[]; goal: number }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(goal * 1.25, ...days.map((d) => d.minutes), 1);
  const pct = (minutes: number) => (minutes / max) * 100;
  const shown = days.find((d) => d.key === active) ?? days.find((d) => d.today) ?? days[days.length - 1];

  return (
    <figure className="m-0">
      <div className="flex items-baseline justify-between gap-3">
        <figcaption className="text-sm font-bold text-ink-soft">Minutes practised, last 7 days</figcaption>
        <p className="shrink-0 text-sm text-ink-soft" aria-live="polite">
          <span className="font-extrabold text-ink">{shown.minutes} min</span> · {shown.today ? 'today' : shown.full.split(' ')[0]}
        </p>
      </div>

      <div className="relative mt-4" style={{ height: PLOT }}>
        {/* Daily goal reference line */}
        <div className="pointer-events-none absolute inset-x-0 border-t border-ink-faint/70" style={{ bottom: `${pct(goal)}%` }} aria-hidden="true">
          <span className="absolute right-0 -translate-y-full bg-paper pl-1.5 text-[11px] font-bold text-ink-soft">Goal {goal} min</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-sand" aria-hidden="true" />
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setActive(active === d.key ? null : d.key)}
              onFocus={() => setActive(d.key)}
              onBlur={() => setActive(null)}
              aria-label={`${d.full}: ${d.minutes} minutes, ${d.xp} XP`}
              className={cn('group relative flex h-full items-end justify-center rounded-t-xl', active === d.key && 'bg-cream-deep/50')}
            >
              <span
                className={cn(
                  'block w-[22px] rounded-t-[4px] bg-terracotta transition-[height,opacity] duration-500 ease-out',
                  active && active !== d.key && 'opacity-45',
                )}
                style={{ height: `${pct(d.minutes)}%` }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1.5 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {days.map((d) => (
          <span key={d.key} className={cn('text-center text-xs font-extrabold', d.today ? 'text-ink' : 'text-ink-faint')}>
            {d.label}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Minutes practised in the last 7 days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Minutes</th>
            <th scope="col">XP</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.full}</th>
              <td>{d.minutes}</td>
              <td>{d.xp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
