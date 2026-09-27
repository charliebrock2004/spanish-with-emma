'use client';

import { useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-[var(--radius-card)] border border-sand/70 bg-paper shadow-card', className)}
      {...props}
    />
  );
}

export function ProgressBar({
  value,
  max = 1,
  label,
  tone = 'warm',
  size = 'md',
  className,
}: {
  value: number;
  max?: number;
  label: string;
  tone?: 'warm' | 'sage' | 'sun' | 'terracotta';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const fills = {
    warm: 'bg-gradient-to-r from-sun to-terracotta',
    sage: 'bg-sage',
    sun: 'bg-sun',
    terracotta: 'bg-terracotta',
  };
  const heights = { sm: 'h-2', md: 'h-3', lg: 'h-4' };
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn('w-full overflow-hidden rounded-full bg-cream-deep', heights[size], className)}
    >
      <div
        className={cn('relative h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-soft)]', fills[tone])}
        style={{ width: `${pct}%`, minWidth: pct > 0 ? '0.75rem' : 0 }}
      >
        {size !== 'sm' && <span className="absolute inset-x-2 top-[3px] h-[3px] rounded-full bg-white/35" />}
      </div>
    </div>
  );
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 7,
  label,
  children,
  tone = 'var(--color-terracotta)',
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
  tone?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-cream-deep)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-1000 ease-[var(--ease-out-soft)]"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block font-bold text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-sage' : 'bg-sand',
        )}
      >
        <span
          className={cn(
            'absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200 ease-[var(--ease-spring)]',
            checked && 'translate-x-6',
          )}
        />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-cream-deep p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-11 rounded-xl px-2 text-sm font-bold transition-all duration-200',
              active ? 'bg-paper text-ink shadow-card' : 'text-ink-soft hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label: string;
  format?: (value: number) => string;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-2">
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor={id} className="font-bold">
          {label}
        </label>
        <span className="text-sm font-bold text-terracotta">{format ? format(value) : value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-3 w-full cursor-pointer appearance-none rounded-full accent-terracotta"
        style={{ background: `linear-gradient(90deg, var(--color-terracotta) ${pct}%, var(--color-cream-deep) ${pct}%)` }}
      />
    </div>
  );
}

/** Counts smoothly up to `value` (e.g. XP earned). */
export function AnimatedNumber({ value, duration = 900, className }: { value: number; duration?: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const initial = from.current;
    let frame = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');
    if (reduce || initial === value) {
      from.current = value;
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(initial + (value - initial) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <span className={cn('tabular-nums', className)}>{shown.toLocaleString('en-GB')}</span>;
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-block h-5 w-5 animate-spin-slow rounded-full border-[3px] border-current border-t-transparent', className)}
    />
  );
}

export function Chip({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full bg-cream-deep px-2.5 py-1 text-xs font-extrabold text-ink-soft', className)}
      {...props}
    />
  );
}
