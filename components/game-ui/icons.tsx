import { useId } from 'react';
import { cn } from '@/lib/utils';

/** A gold coin — the game's currency. */
export function CoinIcon({ size = 20, className, spin = false }: { size?: number; className?: string; spin?: boolean }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn('shrink-0', spin && 'animate-coin', className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="0.55" stopColor="#f2c14e" />
          <stop offset="1" stopColor="#c9962a" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="#b67e17" />
      <circle cx="12" cy="11.3" r="10.2" fill={`url(#${id}-g)`} />
      <circle cx="12" cy="11.3" r="7.2" fill="none" stroke="#c9962a" strokeWidth="1.2" opacity="0.8" />
      <path d="M12 6.8l1.35 2.75 3.03.44-2.19 2.13.52 3.02L12 13.72l-2.71 1.42.52-3.02-2.19-2.13 3.03-.44z" fill="#fff4cf" stroke="#c9962a" strokeWidth="0.6" strokeLinejoin="round" />
      <path d="M5.5 7.5a8 8 0 0 1 4-3" stroke="#fff8e0" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.8" />
    </svg>
  );
}

/** XP: a bright star. */
export function XpIcon({ size = 20, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-x`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd46b" />
          <stop offset="1" stopColor="#e98a4f" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.8l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 16.5l-5.9 3.3 1.3-6.6-4.9-4.5 6.6-.8z"
        fill={`url(#${id}-x)`}
        stroke="#c9642f"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M9.4 8.9l1.6-.2.8-1.8" stroke="#fff6d8" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** A streak flame. */
export function FlameIcon({ size = 20, className, lit = true }: { size?: number; className?: string; lit?: boolean }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lit ? '#ffcf5a' : '#d9c5aa'} />
          <stop offset="1" stopColor={lit ? '#e2552f' : '#a1938a'} />
        </linearGradient>
      </defs>
      <path d="M12 1.5c.8 3.3 5.9 6 5.9 11.6A5.9 5.9 0 0 1 12 19a5.9 5.9 0 0 1-5.9-5.9c0-2.3 1-3.9 2.2-5.1.2 1.6.9 2.7 2 3.2C10 8 11.2 4.6 12 1.5z" fill={`url(#${id}-f)`} />
      <path d="M12 11.2c.4 1.4 2.5 2.4 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1.3.9-2.2 1.5-2.7.2.8.5 1.2 1 1.4-.2-1.2-.2-2.2 0-3.3z" fill={lit ? '#fff1c2' : '#f4e7d5'} />
    </svg>
  );
}

/** A reward chest. */
export function ChestIcon({ size = 40, className, open = false, tone = 'wood' }: { size?: number; className?: string; open?: boolean; tone?: 'wood' | 'gold' | 'ember' }) {
  const palette = {
    wood: { body: '#b0602e', dark: '#7a3d1b', band: '#f2c14e', light: '#d98a4f' },
    gold: { body: '#f2c14e', dark: '#b68520', band: '#fff1bf', light: '#ffe08a' },
    ember: { body: '#c65d3b', dark: '#8a2f22', band: '#f2c14e', light: '#e98a4f' },
  }[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={cn('shrink-0', className)} aria-hidden>
      <ellipse cx="24" cy="43.5" rx="17" ry="2.5" fill="#2a2320" opacity="0.15" />
      {!open && <Body palette={palette} />}
      {open ? (
        <>
          <path d="M9 21 L11.5 7.5 Q24 3.5 36.5 7.5 L39 21z" fill={palette.light} stroke={palette.dark} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 20 L13.6 10 Q24 7 34.4 10 L36 20z" fill={palette.dark} opacity="0.55" />
          <ellipse cx="24" cy="20.5" rx="13" ry="4.5" fill="#fff4cf" />
          <circle cx="18.5" cy="19.8" r="2.6" fill="#f2c14e" stroke="#c9962a" strokeWidth="0.7" />
          <circle cx="24.5" cy="18.8" r="2.8" fill="#ffe08a" stroke="#c9962a" strokeWidth="0.7" />
          <circle cx="30" cy="20.2" r="2.4" fill="#f2c14e" stroke="#c9962a" strokeWidth="0.7" />
          <path d="M24 2.5v3M16 4.5l1.4 2.6M32 4.5l-1.4 2.6" stroke="#ffe08a" strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M7 21 a17 10 0 0 1 34 0z" fill={palette.light} stroke={palette.dark} strokeWidth="1.5" />
          <rect x="21" y="11.5" width="6" height="9.5" fill={palette.band} stroke={palette.dark} strokeWidth="1" />
          <rect x="20.5" y="19" width="7" height="6" rx="1.5" fill="#fff1bf" stroke={palette.dark} strokeWidth="1" />
          <circle cx="24" cy="22" r="1.1" fill={palette.dark} />
        </>
      )}
      {open && <Body palette={palette} />}
    </svg>
  );
}

function Body({ palette }: { palette: { body: string; dark: string; band: string } }) {
  return (
    <>
      <rect x="7" y="21" width="34" height="20" rx="3" fill={palette.body} stroke={palette.dark} strokeWidth="1.5" />
      <rect x="7" y="27" width="34" height="3.5" fill={palette.dark} opacity="0.35" />
      <rect x="21" y="21" width="6" height="20" fill={palette.band} stroke={palette.dark} strokeWidth="1" />
    </>
  );
}
