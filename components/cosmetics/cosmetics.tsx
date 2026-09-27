'use client';

import type { CSSProperties, ReactNode } from 'react';
import { DEFAULT_EQUIPPED, type EquipSlot } from '@/data/shop';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

/**
 * How each cosmetic looks. Everything is CSS gradients and a few tiny inline
 * SVG motifs — no image downloads, so a new background is free on a phone.
 */

export function useEquipped(): Record<EquipSlot, string> {
  return useGameStore((s) => s.inventory?.equipped ?? DEFAULT_EQUIPPED);
}

// ─── Backgrounds ───────────────────────────────────────────────────────────

interface Scene {
  /** Full scene (Home stage, results). */
  backdrop: string;
  /** Soft version for the round avatar. */
  disc: string;
  /** Light or dark: decides text colour on top. */
  tone: 'light' | 'dark';
  motif?: 'rooftops' | 'waves' | 'rain' | 'lights' | 'arches' | 'stars' | 'papel';
}

export const SCENES: Record<string, Scene> = {
  'bg-cream': {
    backdrop: 'linear-gradient(135deg, #fcefc7 0%, #fbeede 45%, #f7e0d5 100%)',
    disc: 'linear-gradient(135deg, #fcefc7, #fbf3e8 55%, #f7e0d5)',
    tone: 'light',
  },
  'bg-madrid': {
    backdrop: 'linear-gradient(180deg, #f9c784 0%, #f2a65a 38%, #d9694a 72%, #8a2f22 100%)',
    disc: 'linear-gradient(160deg, #f9d6a0, #f2a65a 60%, #d9694a)',
    tone: 'light',
    motif: 'rooftops',
  },
  'bg-beach': {
    backdrop: 'linear-gradient(180deg, #bfe3f5 0%, #7cc4e4 45%, #4f9fc7 62%, #f5d9a6 63%, #f0c98a 100%)',
    disc: 'linear-gradient(180deg, #bfe3f5, #7cc4e4 60%, #f5d9a6 61%)',
    tone: 'light',
    motif: 'waves',
  },
  'bg-glasgow': {
    backdrop: 'linear-gradient(180deg, #c9d4dc 0%, #a9b8c4 50%, #8fa3b3 100%)',
    disc: 'linear-gradient(160deg, #dfe7ec, #a9b8c4)',
    tone: 'light',
    motif: 'rain',
  },
  'bg-tapas': {
    backdrop: 'radial-gradient(circle at 30% 20%, #b0602e 0%, transparent 55%), linear-gradient(180deg, #6b2d1f 0%, #4a1f16 100%)',
    disc: 'radial-gradient(circle at 35% 25%, #e9a94b, #6b2d1f 70%)',
    tone: 'dark',
    motif: 'lights',
  },
  'bg-alhambra': {
    backdrop: 'radial-gradient(circle at 75% 15%, #3d4a7a 0%, transparent 50%), linear-gradient(180deg, #1b2440 0%, #2c2f55 60%, #c98a4b 140%)',
    disc: 'linear-gradient(170deg, #2c2f55, #1b2440 60%, #c98a4b)',
    tone: 'dark',
    motif: 'arches',
  },
  'bg-starry': {
    backdrop: 'radial-gradient(ellipse at 50% 120%, #7b6cd9 0%, transparent 60%), linear-gradient(180deg, #0e1329 0%, #141a33 50%, #2a2466 100%)',
    disc: 'radial-gradient(circle at 50% 110%, #7b6cd9, #141a33 70%)',
    tone: 'dark',
    motif: 'stars',
  },
  'bg-fiesta': {
    backdrop: 'linear-gradient(160deg, #fbe29a 0%, #f2c14e 45%, #e98a4f 100%)',
    disc: 'linear-gradient(160deg, #fbe29a, #f2c14e 55%, #e98a4f)',
    tone: 'light',
    motif: 'papel',
  },
};

export const sceneFor = (id: string | undefined) => SCENES[id ?? ''] ?? SCENES['bg-cream'];

function Motif({ kind }: { kind: NonNullable<Scene['motif']> }) {
  const common = 'pointer-events-none absolute inset-0 h-full w-full';
  switch (kind) {
    case 'rooftops':
      return (
        <svg className={common} viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice" aria-hidden>
          <circle cx="300" cy="110" r="34" fill="#fff3d6" opacity="0.55" />
          <path d="M0 240V190h30v-20h18v20h22v-34l16-14 16 14v34h26v-26h40v26h14v-44h10v-10h10v10h10v44h30v-22l26-18 26 18v22h24v-30h40v30h28v50z" fill="#6b2219" opacity="0.55" />
        </svg>
      );
    case 'waves':
      return (
        <svg className={common} viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden>
          <circle cx="330" cy="46" r="22" fill="#fff6d8" opacity="0.8" />
          <path d="M0 150 Q25 142 50 150 T100 150 T150 150 T200 150 T250 150 T300 150 T350 150 T400 150" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" />
        </svg>
      );
    case 'rain':
      return (
        <svg className={common} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {Array.from({ length: 28 }, (_, i) => (
            <line key={i} x1={(i * 53) % 400} y1={(i * 37) % 240} x2={((i * 53) % 400) - 6} y2={((i * 37) % 240) + 18} stroke="#fff" strokeOpacity="0.45" strokeWidth="1.6" strokeLinecap="round" />
          ))}
        </svg>
      );
    case 'lights':
      return (
        <svg className={common} viewBox="0 0 400 240" preserveAspectRatio="xMidYMin slice" aria-hidden>
          <path d="M0 22 Q100 60 200 26 T400 30" fill="none" stroke="#2b120c" strokeWidth="1.5" />
          {Array.from({ length: 11 }, (_, i) => {
            const x = 18 + i * 36;
            const y = 30 + Math.sin(i * 1.3) * 10;
            return <circle key={i} cx={x} cy={y} r="5" fill="#ffd68a" opacity="0.9" />;
          })}
        </svg>
      );
    case 'arches':
      return (
        <svg className={common} viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice" aria-hidden>
          {Array.from({ length: 16 }, (_, i) => (
            <circle key={i} cx={(i * 71) % 400} cy={(i * 29) % 110} r={i % 3 === 0 ? 1.8 : 1.1} fill="#fff" opacity="0.7" />
          ))}
          <path d="M0 240V170h40v-20a22 22 0 0 1 44 0v20h36v-20a22 22 0 0 1 44 0v20h36v-20a22 22 0 0 1 44 0v20h36v-20a22 22 0 0 1 44 0v20h76v70z" fill="#0f1428" opacity="0.6" />
        </svg>
      );
    case 'stars':
      return (
        <svg className={common} viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={(i * 97) % 400} cy={(i * 61) % 240} r={i % 5 === 0 ? 1.9 : 1} fill="#fff" opacity={i % 4 === 0 ? 0.95 : 0.55} />
          ))}
        </svg>
      );
    case 'papel':
      return (
        <svg className={common} viewBox="0 0 400 240" preserveAspectRatio="xMidYMin slice" aria-hidden>
          <path d="M0 8 Q200 34 400 8" fill="none" stroke="#8a2f22" strokeOpacity="0.4" strokeWidth="1.2" />
          {Array.from({ length: 10 }, (_, i) => {
            const x = 10 + i * 40;
            const colours = ['#c65d3b', '#4f8a5b', '#6f9fc4', '#fffcf7', '#8a2f22'];
            return <path key={i} d={`M${x} ${14 + Math.sin(i) * 3}h26v22l-13 8-13-8z`} fill={colours[i % colours.length]} opacity="0.85" />;
          })}
        </svg>
      );
  }
}

/** A cosmetic background with its motif, filling its (relative) parent. */
export function SceneBackdrop({ id, className }: { id?: string; className?: string }) {
  const scene = sceneFor(id);
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} style={{ background: scene.backdrop }} aria-hidden>
      {scene.motif && <Motif kind={scene.motif} />}
    </div>
  );
}

// ─── Avatar frames ─────────────────────────────────────────────────────────

interface FrameStyle {
  ring: string;
  width: number;
  glow?: string;
  badge?: string;
}

export const FRAMES: Record<string, FrameStyle> = {
  'frame-none': { ring: 'var(--color-paper)', width: 2 },
  'frame-terracotta': { ring: 'linear-gradient(135deg, #e08a63, #c65d3b 50%, #8a2f22)', width: 4 },
  'frame-thistle': { ring: 'conic-gradient(from 20deg, #c9b4ea, #5b3a8c, #9d7bd1, #5b3a8c, #c9b4ea)', width: 4 },
  'frame-gold': { ring: 'conic-gradient(from 0deg, #fff1bf, #f2c14e, #b68520, #f2c14e, #fff1bf, #b68520, #fff1bf)', width: 5, glow: 'rgb(242 193 78 / 0.45)' },
  'frame-laurel': { ring: 'repeating-conic-gradient(from 0deg, #4f8a5b 0 12deg, #7fb487 12deg 22deg)', width: 5, badge: '🌿' },
  'frame-flame': { ring: 'conic-gradient(from 200deg, #f2c14e, #e98a4f, #c65d3b, #f2c14e)', width: 5, glow: 'rgb(233 138 79 / 0.55)', badge: '🔥' },
  'frame-explorer': { ring: 'conic-gradient(from 45deg, #2f8a6f, #f2c14e, #2f8a6f, #f2c14e, #2f8a6f)', width: 5, badge: '🧭' },
  'frame-diamond': { ring: 'conic-gradient(from 0deg, #e9f7ff, #9fd8f2, #ffffff, #7cc4e4, #e9f7ff, #b9e6fa, #e9f7ff)', width: 5, glow: 'rgb(159 216 242 / 0.7)', badge: '💎' },
  'frame-legend': { ring: 'conic-gradient(from 0deg, #fff1bf, #b68520, #f2c14e, #8a5d10, #fff1bf)', width: 6, glow: 'rgb(182 133 32 / 0.6)', badge: '👑' },
};

export const frameFor = (id: string | undefined) => FRAMES[id ?? ''] ?? FRAMES['frame-none'];

/** Wraps a round avatar in the equipped (or given) frame. */
export function FrameRing({ id, size, children, className }: { id?: string; size: number; children: ReactNode; className?: string }) {
  const frame = frameFor(id);
  const width = Math.max(2, Math.round(frame.width * (size / 96)));
  const style: CSSProperties = {
    width: size,
    height: size,
    padding: width,
    background: frame.ring,
    boxShadow: frame.glow ? `0 0 ${Math.round(size / 6)}px ${frame.glow}` : undefined,
  };
  return (
    <div className={cn('relative shrink-0 rounded-full', className)} style={style}>
      {children}
      {frame.badge && size >= 56 && (
        <span
          className="absolute -top-1 -left-1 grid place-items-center rounded-full bg-paper shadow-card"
          style={{ width: size * 0.3, height: size * 0.3, fontSize: size * 0.17 }}
          aria-hidden
        >
          {frame.badge}
        </span>
      )}
    </div>
  );
}

// ─── Speech bubbles ────────────────────────────────────────────────────────

interface BubbleStyle {
  className: string;
  style?: CSSProperties;
}

export const BUBBLES: Record<string, BubbleStyle> = {
  'bubble-classic': { className: 'bg-paper text-ink' },
  'bubble-sunset': { className: 'text-ink', style: { background: 'linear-gradient(135deg, #fcefc7, #f7e0d5)' } },
  'bubble-midnight': { className: 'bg-ink text-cream [&_.spanish]:text-sun' },
  'bubble-azulejo': {
    className: 'text-ink',
    style: {
      background: '#f4f9fd',
      boxShadow: 'inset 0 0 0 3px #fff, inset 0 0 0 5px #1d3f78, 0 10px 28px -14px rgb(29 63 120 / 0.35)',
    },
  },
  'bubble-confetti': {
    className: 'text-ink',
    style: {
      backgroundColor: '#fff8e4',
      backgroundImage:
        'radial-gradient(circle at 12% 20%, #c65d3b 0 2px, transparent 3px), radial-gradient(circle at 88% 30%, #4f8a5b 0 2px, transparent 3px), radial-gradient(circle at 70% 85%, #6f9fc4 0 2px, transparent 3px), radial-gradient(circle at 25% 80%, #f2c14e 0 2.5px, transparent 3.5px)',
    },
  },
  'bubble-gold': {
    className: 'text-ink',
    style: { background: 'linear-gradient(#fffaf0, #fffaf0) padding-box, linear-gradient(135deg, #fff1bf, #b68520, #f2c14e) border-box', border: '2px solid transparent' },
  },
};

export const bubbleFor = (id: string | undefined) => BUBBLES[id ?? ''] ?? BUBBLES['bubble-classic'];

/** Emma's speech bubble in the equipped style. */
export function EmmaBubble({
  children,
  className,
  tail = 'left',
  id,
}: {
  children: ReactNode;
  className?: string;
  tail?: 'left' | 'bottom' | 'none';
  id?: string;
}) {
  const equipped = useEquipped();
  const bubble = bubbleFor(id ?? equipped.bubble);
  return (
    <div
      className={cn(
        'rounded-3xl px-4 py-3 shadow-card',
        tail === 'left' && 'rounded-bl-md',
        tail === 'bottom' && 'rounded-b-md',
        bubble.className,
        className,
      )}
      style={bubble.style}
    >
      {children}
    </div>
  );
}
