import type { ReactNode } from 'react';
import { REGIONS } from '@/data/regions';
import type { LevelId } from '@/types/curriculum';
import { cn } from '@/lib/utils';

/**
 * Each stop on the journey drawn as a little skyline: the landmarks you'd
 * recognise from a postcard, in the region's colour. Simple shapes on purpose —
 * they sit behind text and should read at a glance, not compete with it.
 * viewBox is 360 × 120; the ground is at y = 104.
 */

const WINDOW = '#fbf3e8';

function Clouds({ tint }: { tint: string }) {
  return (
    <g className="drift" fill={tint} opacity={0.55}>
      <ellipse cx="70" cy="22" rx="20" ry="6" />
      <ellipse cx="84" cy="18" rx="12" ry="6" />
      <ellipse cx="262" cy="30" rx="16" ry="5" />
      <ellipse cx="274" cy="26" rx="10" ry="5" />
    </g>
  );
}

function Tree({ x, y = 104, r = 9, colour }: { x: number; y?: number; r?: number; colour: string }) {
  return (
    <g>
      <rect x={x - 1.5} y={y - r} width={3} height={r} fill={colour} opacity={0.7} />
      <circle cx={x} cy={y - r - r * 0.55} r={r} fill={colour} opacity={0.55} />
    </g>
  );
}

function Madrid({ c }: { c: string }) {
  return (
    <>
      <path d="M0 98 Q70 86 140 95 T280 90 T360 96 V120 H0Z" fill={c} opacity={0.14} />
      {/* The Metrópolis building: a round corner tower, a dome and its winged statue. */}
      <rect x="28" y="56" width="36" height="48" fill={c} opacity={0.8} />
      <path d="M28 57 Q46 34 64 57Z" fill={c} opacity={0.9} />
      <rect x="44" y="37" width="4" height="7" fill={c} />
      <path d="M46 26 L40 33 L46 31 L52 33Z" fill={c} />
      {[64, 76, 88].map((y) => [34, 46, 56].map((x) => <rect key={`${x}${y}`} x={x} y={y} width="4" height="6" rx="1" fill={WINDOW} opacity={0.8} />))}
      <rect x="70" y="72" width="24" height="32" fill={c} opacity={0.55} />
      <rect x="98" y="64" width="18" height="40" fill={c} opacity={0.45} />
      {/* The Puerta de Alcalá: five openings, a cornice and a pediment. */}
      <rect x="150" y="68" width="124" height="36" fill={c} opacity={0.85} />
      <rect x="146" y="64" width="132" height="6" fill={c} />
      <path d="M190 64 L212 50 L234 64Z" fill={c} />
      <path d="M204 104 V86 A8 8 0 0 1 220 86 V104Z" fill={WINDOW} opacity={0.85} />
      <path d="M178 104 V90 A6 6 0 0 1 190 90 V104Z" fill={WINDOW} opacity={0.85} />
      <path d="M234 104 V90 A6 6 0 0 1 246 90 V104Z" fill={WINDOW} opacity={0.85} />
      <rect x="158" y="84" width="10" height="20" fill={WINDOW} opacity={0.85} />
      <rect x="256" y="84" width="10" height="20" fill={WINDOW} opacity={0.85} />
      {[160, 188, 232, 260].map((x) => (
        <rect key={x} x={x} y="56" width="4" height="8" fill={c} />
      ))}
      <Tree x={128} colour={c} />
      <Tree x={296} r={11} colour={c} />
      <Tree x={326} r={8} colour={c} />
    </>
  );
}

function Salamanca({ c }: { c: string }) {
  return (
    <>
      <path d="M0 104 H360 V120 H0Z" fill="#9cc4d8" opacity={0.45} />
      <path d="M0 110 Q20 107 40 110 T80 110 T120 110 T160 110" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity={0.6} />
      {/* The Roman bridge over the Tormes. */}
      <rect x="0" y="94" width="176" height="8" fill={c} opacity={0.75} />
      {[14, 44, 74, 104, 134, 164].map((x) => (
        <path key={x} d={`M${x - 11} 102 A11 9 0 0 1 ${x + 11} 102 V104 H${x - 11}Z`} fill={c} opacity={0.75} />
      ))}
      {/* The university's carved façade. */}
      <rect x="108" y="58" width="58" height="36" fill={c} opacity={0.55} />
      {[66, 74, 82].map((y) => (
        <rect key={y} x="114" y={y} width="46" height="2" fill={WINDOW} opacity={0.6} />
      ))}
      {/* The New Cathedral: its domed bell tower and nave. */}
      <rect x="206" y="34" width="28" height="70" fill={c} opacity={0.9} />
      <path d="M203 36 Q220 8 237 36Z" fill={c} />
      <rect x="218" y="6" width="4" height="9" fill={c} />
      <rect x="213" y="46" width="14" height="18" rx="7" fill={WINDOW} opacity={0.75} />
      <rect x="234" y="62" width="76" height="42" fill={c} opacity={0.7} />
      <path d="M252 62 Q270 42 288 62Z" fill={c} opacity={0.85} />
      {[242, 256, 270, 284, 298].map((x) => (
        <path key={x} d={`M${x} 62 L${x + 3} 54 L${x + 6} 62Z`} fill={c} opacity={0.85} />
      ))}
      <Tree x={330} r={9} y={102} colour={c} />
    </>
  );
}

function Barcelona({ c }: { c: string }) {
  const spires = [
    { x: 176, top: 40 },
    { x: 192, top: 26 },
    { x: 212, top: 14 },
    { x: 232, top: 26 },
    { x: 248, top: 40 },
  ];
  return (
    <>
      <path d="M0 92 Q60 70 120 84 L140 104 H0Z" fill={c} opacity={0.18} />
      <path d="M0 104 H150 V120 H0Z" fill="#8fc3d6" opacity={0.5} />
      <path d="M8 110 Q18 107 28 110 T48 110 M70 113 Q80 110 90 113 T110 113" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity={0.7} />
      {/* A palm by the beach. */}
      <path d="M58 104 Q54 84 62 66" stroke={c} strokeWidth="3" fill="none" opacity={0.8} />
      <path d="M62 66 Q48 62 42 70 M62 66 Q74 58 82 64 M62 66 Q56 54 48 54 M62 66 Q70 52 78 52" stroke={c} strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.8} />
      {/* The Sagrada Família's spires. */}
      <rect x="168" y="72" width="92" height="32" fill={c} opacity={0.7} />
      {spires.map(({ x, top }) => (
        <g key={x}>
          <path d={`M${x - 7} 104 L${x - 3} ${top + 8} Q${x} ${top} ${x + 3} ${top + 8} L${x + 7} 104Z`} fill={c} opacity={0.9} />
          <circle cx={x} cy={top - 1} r="2.6" fill={c} />
          {[top + 22, top + 34].map((y) => (
            <rect key={y} x={x - 1.2} y={y} width="2.4" height="6" rx="1.2" fill={WINDOW} opacity={0.75} />
          ))}
        </g>
      ))}
      <path d="M200 104 V88 A12 12 0 0 1 224 88 V104Z" fill={WINDOW} opacity={0.7} />
      <rect x="270" y="80" width="30" height="24" fill={c} opacity={0.45} />
      <path d="M270 80 Q278 74 285 80 Q292 74 300 80Z" fill={c} opacity={0.45} />
      <rect x="306" y="70" width="22" height="34" fill={c} opacity={0.35} />
    </>
  );
}

function Sevilla({ c }: { c: string }) {
  return (
    <>
      <path d="M0 104 H360 V120 H0Z" fill="#9cc4d8" opacity={0.4} />
      {/* The Torre del Oro by the river. */}
      <rect x="72" y="72" width="34" height="32" fill={c} opacity={0.8} />
      <rect x="78" y="58" width="22" height="14" fill={c} opacity={0.85} />
      <path d="M78 58 Q89 44 100 58Z" fill={c} />
      {[72, 78].map((y) => [80, 88, 96].map((x) => <rect key={`${x}${y}`} x={x} y={y + 8} width="3" height="5" fill={WINDOW} opacity={0.7} />))}
      {/* La Giralda: the tower, its belfry and the weathervane on top. */}
      <rect x="170" y="36" width="30" height="68" fill={c} opacity={0.9} />
      <rect x="175" y="20" width="20" height="16" fill={c} />
      <rect x="179" y="12" width="12" height="8" fill={c} />
      <path d="M179 12 Q185 2 191 12Z" fill={c} />
      <path d="M185 2 V-4 M182 -2 H188" stroke={c} strokeWidth="1.6" />
      <path d="M180 26 V32 H190 V26 A5 5 0 0 0 180 26Z" fill={WINDOW} opacity={0.8} />
      {[48, 62, 76, 90].map((y) => (
        <rect key={y} x="182" y={y} width="6" height="8" rx="3" fill={WINDOW} opacity={0.7} />
      ))}
      <rect x="200" y="74" width="60" height="30" fill={c} opacity={0.5} />
      {/* Orange trees. */}
      {[282, 314, 342].map((x, i) => (
        <g key={x}>
          <rect x={x - 1.5} y={88 - i} width="3" height={16 + i} fill={c} opacity={0.7} />
          <circle cx={x} cy={80 - i} r="11" fill="#5f8f4e" opacity={0.75} />
          {[
            [-4, -3],
            [4, 1],
            [0, 5],
            [5, -6],
          ].map(([dx, dy]) => (
            <circle key={`${dx}${dy}`} cx={x + dx} cy={80 - i + dy} r="1.8" fill="#f29a2e" />
          ))}
        </g>
      ))}
      <path d="M130 30 l4 3 l4 -3 M146 22 l3 2 l3 -2" stroke={c} strokeWidth="1.3" fill="none" opacity={0.6} />
    </>
  );
}

function Valencia({ c }: { c: string }) {
  return (
    <>
      <circle cx="300" cy="34" r="16" fill="#f7c95b" opacity={0.75} />
      <path d="M0 102 H360 V120 H0Z" fill="#8fc3d6" opacity={0.5} />
      <path d="M20 112 Q34 108 48 112 T76 112 M200 114 Q214 110 228 114 T256 114" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity={0.7} />
      {/* The Hemisfèric — the big "eye" — and the Palau de les Arts' shell and crest. */}
      <path d="M40 100 Q100 64 160 100 Q100 110 40 100Z" fill={c} opacity={0.8} />
      <circle cx="100" cy="94" r="8" fill={WINDOW} opacity={0.8} />
      <circle cx="100" cy="94" r="3.5" fill={c} opacity={0.8} />
      <path d="M190 102 Q204 52 262 56 Q312 60 326 102Z" fill={c} opacity={0.85} />
      <path d="M198 62 Q250 14 332 40" stroke={c} strokeWidth="5" fill="none" strokeLinecap="round" opacity={0.85} />
      {[210, 230, 250, 270, 290, 306].map((x) => (
        <rect key={x} x={x} y="84" width="3" height="14" fill={WINDOW} opacity={0.55} />
      ))}
      <path d="M150 36 l4 3 l4 -3 M168 28 l3 2 l3 -2" stroke={c} strokeWidth="1.3" fill="none" opacity={0.6} />
    </>
  );
}

function Santiago({ c }: { c: string }) {
  return (
    <>
      <path d="M0 92 Q60 72 130 90 T250 84 T360 90 V120 H0Z" fill="#6f9e62" opacity={0.3} />
      <path d="M0 104 Q90 96 180 104 T360 102 V120 H0Z" fill="#6f9e62" opacity={0.35} />
      {/* The Obradoiro façade: two tall towers and the gable between them. */}
      {[150, 232].map((x) => (
        <g key={x}>
          <rect x={x} y="34" width="26" height="70" fill={c} opacity={0.9} />
          <rect x={x + 3} y="22" width="20" height="12" fill={c} />
          <path d={`M${x + 3} 22 L${x + 13} 4 L${x + 23} 22Z`} fill={c} />
          <circle cx={x + 13} cy="3" r="2" fill={c} />
          {[42, 58, 74].map((y) => (
            <rect key={y} x={x + 9} y={y} width="8" height="10" rx="4" fill={WINDOW} opacity={0.75} />
          ))}
        </g>
      ))}
      <rect x="176" y="54" width="56" height="50" fill={c} opacity={0.8} />
      <path d="M176 54 L204 34 L232 54Z" fill={c} opacity={0.9} />
      <path d="M194 104 V82 A10 10 0 0 1 214 82 V104Z" fill={WINDOW} opacity={0.75} />
      <circle cx="204" cy="64" r="5" fill={WINDOW} opacity={0.75} />
      {/* A Camino marker with its scallop shell. */}
      <rect x="300" y="72" width="18" height="32" rx="3" fill="#b9b3a6" />
      <rect x="302" y="75" width="14" height="14" rx="2" fill="#3d6a8c" />
      <path d="M309 86 L303 78 M309 86 L306 77 M309 86 L309 76 M309 86 L312 77 M309 86 L315 78" stroke="#f2c14e" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M60 104 Q120 96 150 104" stroke="#e7dcc6" strokeWidth="4" fill="none" opacity={0.8} />
    </>
  );
}

const SCENES: Record<LevelId, (props: { c: string }) => ReactNode> = {
  1: Madrid,
  2: Salamanca,
  3: Barcelona,
  4: Sevilla,
  5: Valencia,
  6: Santiago,
};

/** A region's landmark skyline, anchored to the bottom of its box. */
export function Skyline({ level, className, clouds = true }: { level: LevelId; className?: string; clouds?: boolean }) {
  const region = REGIONS[level];
  const Scene = SCENES[level];
  return (
    <svg viewBox="0 -8 360 128" preserveAspectRatio="xMidYMax slice" className={cn('pointer-events-none select-none', className)} aria-hidden>
      {clouds && <Clouds tint="#ffffff" />}
      <Scene c={region.colour} />
    </svg>
  );
}
