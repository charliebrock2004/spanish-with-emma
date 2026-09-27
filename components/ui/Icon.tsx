import type { SVGProps } from 'react';

/** A small hand-drawn icon set (24×24, rounded strokes) — no icon library needed. */
const PATHS = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </>
  ),
  chat: (
    <>
      <path d="M21 12a8.5 8.5 0 0 1-12.3 7.6L3.5 21l1.4-4.6A8.5 8.5 0 1 1 21 12z" />
      <path d="M8.5 12h.01M12.5 12h.01M16.5 12h.01" strokeWidth={2.8} />
    </>
  ),
  book: (
    <>
      <path d="M2.5 5.5c3-1.5 6.3-1.3 9.5 1 3.2-2.3 6.5-2.5 9.5-1v13.5c-3-1.4-6.3-1.2-9.5 1-3.2-2.2-6.5-2.4-9.5-1z" />
      <path d="M12 6.5V20" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6h9M18 6h2M4 12h3M12 12h8M4 18h11M20 18h0" />
      <circle cx="15.5" cy="6" r="2.2" />
      <circle cx="9.5" cy="12" r="2.2" />
      <circle cx="17.5" cy="18" r="2.2" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  micOff: (
    <>
      <path d="M15 10V6a3 3 0 0 0-5.7-1.3M9 9v2a3 3 0 0 0 4.8 2.4" />
      <path d="M5.5 11a6.5 6.5 0 0 0 10.6 5M18.5 11a6.5 6.5 0 0 1-.3 1.9M12 17.5V21M3 3l18 18" />
    </>
  ),
  speaker: (
    <>
      <path d="M11 5 6.5 9H3.5v6h3L11 19z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  turtle: (
    <>
      <path d="M2.5 15.5c0-4.2 3.6-7.5 8-7.5s8 3.3 8 7.5z" />
      <path d="M7 15.5l3.5-4.5 3.5 4.5M5.5 15.5v3M15.5 15.5v3" />
      <path d="M18.5 13.5c.3-1.6 1.2-2.5 2.2-2.5a1.4 1.4 0 0 1 0 2.8h-1" />
    </>
  ),
  check: <path d="M5 12.5 10 17.5 19 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  flame: (
    <path d="M12 2.5c1 3.4 5.5 5.6 5.5 11.2a5.5 5.5 0 0 1-11 0c0-2.4 1.1-4.4 2.5-5.6.3 1.6 1 2.6 2 3.1-.1-3.6.3-6 1-8.7z" />
  ),
  heart: <path d="M12 20.5s-8-4.8-8-11A4.5 4.5 0 0 1 12 6.8 4.5 4.5 0 0 1 20 9.5c0 6.2-8 11-8 11z" />,
  trophy: (
    <>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4.5a2.8 2.8 0 0 0 2.8 4M17 6h2.5a2.8 2.8 0 0 1-2.8 4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  sparkles: (
    <>
      <path d="M11 3l1.8 4.7 4.7 1.8-4.7 1.8L11 16l-1.8-4.7L4.5 9.5l4.7-1.8z" />
      <path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </>
  ),
  arrowLeft: <path d="M19 12H5M11 18l-6-6 6-6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  chevronDown: <path d="M5 9l7 7 7-7" />,
  refresh: (
    <>
      <path d="M20 11.5a8 8 0 1 0-2.3 5.9" />
      <path d="M20 4.5v7h-7" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9" />
    </>
  ),
  play: <path d="M8 5.5v13l10-6.5z" />,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />
    </>
  ),
  gamepad: (
    <>
      <path d="M6.5 8h11a4.5 4.5 0 0 1 4.5 4.5v1.5a3 3 0 0 1-5.4 1.8L15 14H9l-1.6 1.8A3 3 0 0 1 2 14v-1.5A4.5 4.5 0 0 1 6.5 8z" />
      <path d="M7 10.5v3M5.5 12h3M15.5 11.5h.01M18 12.5h.01" />
    </>
  ),
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  send: (
    <>
      <path d="M4 12 20 4l-6 16-2.5-6.5z" />
      <path d="M11.5 13.5 20 4" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  snowflake: (
    <>
      <path d="M12 2.5v19M4 7l16 10M20 7 4 17" />
      <path d="M9.5 4.5 12 6.5l2.5-2M9.5 19.5l2.5-2 2.5 2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4.5" height="6.5" rx="1.8" />
      <rect x="16.5" y="14" width="4.5" height="6.5" rx="1.8" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  languages: (
    <>
      <path d="M3.5 5h9M8 3v2c0 4-2 7-5 8.5M5.5 9c1 2 3 3.8 5.5 4.5" />
      <path d="M13 21l4-9 4 9M14.5 17.5h5" />
    </>
  ),
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  plus: <path d="M12 5v14M5 12h14" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  skip: (
    <>
      <path d="M5 5l9 7-9 7z" />
      <path d="M19 5v14" />
    </>
  ),
  shuffle: (
    <>
      <path d="M3 7h3.5c4.5 0 6.5 10 11 10H21M3 17h3.5c1.6 0 2.8-1.2 3.8-2.8M14 9.8C15 8.2 16.2 7 17.5 7H21" />
      <path d="M18 4l3 3-3 3M18 14l3 3-3 3" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </>
  ),
  scroll: (
    <>
      <path d="M7 4h11a2 2 0 0 1 2 2v1h-4" />
      <path d="M16 7v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h10" />
      <path d="M7 4a2 2 0 0 0-2 2v11M9 9h4M9 13h4" />
    </>
  ),
  pause: (
    <>
      <path d="M8.5 5.5v13M15.5 5.5v13" />
    </>
  ),
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4.5h4.5" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  filled?: boolean;
  label?: string;
}

export function Icon({ name, size = 24, filled = false, label, strokeWidth = 2, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
