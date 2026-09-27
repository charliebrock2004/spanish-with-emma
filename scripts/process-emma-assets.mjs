#!/usr/bin/env node
/**
 * Emma asset pipeline.
 *
 * Takes the four original Emma reference illustrations in `assets/emma/source/`
 * and produces every web asset the game uses:
 *
 *   public/emma/*.webp        transparent cut-outs (avatar + portrait per pose)
 *   public/emma/outfits/…     the same cut-outs in every shop outfit
 *   public/icons/*.png        PWA icons (regular + maskable)
 *   app/icon.png              favicon
 *   app/apple-icon.png        iOS home-screen icon
 *
 * The illustrations are clean line art on a flat background, so the background
 * is removed with a flood fill from the image border plus a soft alpha ramp and
 * colour decontamination on the anti-aliased edge. Nothing about Emma herself is
 * redrawn or distorted: every variant is a crop + resize of the supplied art.
 *
 * Run with: npm run assets:emma
 */
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(root, 'assets/emma/source');
const OUT_DIR = path.join(root, 'public/emma');
const ICON_DIR = path.join(root, 'public/icons');
const APP_DIR = path.join(root, 'app');

/**
 * Poses → which source illustration they come from.
 *
 * `keep` lists rectangles [x0, y0, x1, y1, maxArea?] (source pixels) holding
 * white or cream parts of the drawing itself — eye whites, polka dots, the
 * white bodice, the trainers — that must never be treated as background even
 * though their colour is close to it. With `maxArea`, only pockets up to that
 * size are kept (dots, not the gap beside an arm). Every other enclosed
 * background-coloured pocket (gaps between hair strands, between arm and
 * body) is removed.
 */
const SOURCES = {
  // smiling, facing the player — happy / speaking / encouraging
  front: { file: 'emma-front.jpg', keep: [[285, 280, 495, 345]] },
  // glancing aside — thinking / confused
  threeQuarter: { file: 'emma-three-quarter.jpg', keep: [[250, 205, 415, 260]] },
  // side profile — listening
  profile: { file: 'emma-profile.jpg', keep: [[245, 265, 305, 320], [180, 680, 420, 1010]] },
  // standing — welcome / celebrating
  fullBody: { file: 'emma-full-body.jpg', keep: [[320, 115, 410, 155], [250, 225, 475, 615, 400], [200, 950, 560, 1130]] },
};

/**
 * Crops are in source-pixel coordinates (all sources are 784×1168).
 * `widths` are the output widths generated for responsive srcsets.
 */
const VARIANTS = [
  { source: 'front', name: 'emma-front-avatar', crop: { left: 150, top: 95, width: 490, height: 490 }, widths: [96, 192, 320] },
  { source: 'front', name: 'emma-front-portrait', crop: { left: 72, top: 30, width: 640, height: 960 }, widths: [300, 600] },
  { source: 'threeQuarter', name: 'emma-aside-avatar', crop: { left: 130, top: 45, width: 480, height: 480 }, widths: [96, 192, 320] },
  { source: 'threeQuarter', name: 'emma-aside-portrait', crop: { left: 80, top: 20, width: 640, height: 960 }, widths: [300, 600] },
  { source: 'profile', name: 'emma-profile-avatar', crop: { left: 130, top: 40, width: 490, height: 490 }, widths: [96, 192, 320] },
  { source: 'profile', name: 'emma-profile-portrait', crop: { left: 90, top: 20, width: 640, height: 960 }, widths: [300, 600] },
  { source: 'fullBody', name: 'emma-full-body', crop: { left: 140, top: 15, width: 500, height: 1120 }, widths: [240, 480] },
];

// Background-removal tuning (RGB euclidean distance from the background colour).
const T_TRANSPARENT = 7; // at or below: fully transparent
const T_FLOOD = 30; // the flood fill never crosses pixels further than this from the background
const T_POCKET = 14; // enclosed regions this close to the background colour are background pockets
const MIN_POCKET_AREA = 12; // ignore specks smaller than this (px)

/**
 * Outfits. Emma's black polka-dot outfit is recoloured with a duotone map —
 * dark fabric → the outfit colour, light dots → its accent — so every outfit
 * keeps the original drawing's folds, dots and line work. Only pixels inside
 * the outfit zone (below the neckline, in source pixels) are ever touched, so
 * her face, hair and skin are exactly as drawn.
 */
const OUTFIT_ZONES = {
  front: [90, 590, 640, 1168],
  threeQuarter: [150, 455, 650, 1168],
  profile: [170, 655, 545, 1168],
  fullBody: [235, 222, 485, 618],
};
const DARK_FABRIC = 75; // luminance below this is fabric (or line art, removed by the opening)
const OPEN_RADIUS = 2; // morphological opening radius: strips thin line art, keeps fabric
const MIN_FABRIC_AREA = 20; // dark specks smaller than this are left alone
const EDGE_RADIUS = 2; // grey anti-aliasing this close to the fabric is recoloured too
const EDGE_MAX_CHROMA = 30;

const TERRACOTTA = { r: 198, g: 93, b: 59 };
const CREAM = { r: 251, g: 243, b: 232 };

async function loadRaw(file) {
  const { data, info } = await sharp(path.join(SOURCE_DIR, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Median colour of the outermost pixel ring — the flat background colour. */
function estimateBackground({ data, width, height }) {
  const rs = [];
  const gs = [];
  const bs = [];
  const push = (x, y) => {
    const i = (y * width + x) * 4;
    rs.push(data[i]);
    gs.push(data[i + 1]);
    bs.push(data[i + 2]);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  const median = (arr) => arr.sort((a, b) => a - b)[Math.floor(arr.length / 2)];
  return { r: median(rs), g: median(gs), b: median(bs) };
}

const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * Background-coloured regions that the border flood cannot reach (e.g. the gap
 * between an arm and the body). Returns their pixels, skipping `keep` areas.
 */
function findPockets(dist, width, height, keep) {
  const n = width * height;
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  const pockets = [];
  for (let s = 0; s < n; s++) {
    if (seen[s] || dist[s] > T_POCKET) continue;
    let top = 0;
    stack[top++] = s;
    seen[s] = 1;
    const pixels = [];
    let touchesBorder = false;
    let sx = 0;
    let sy = 0;
    while (top > 0) {
      const p = stack[--top];
      const x = p % width;
      const y = (p - x) / width;
      pixels.push(p);
      sx += x;
      sy += y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;
      const visit = (m) => {
        if (!seen[m] && dist[m] <= T_POCKET) {
          seen[m] = 1;
          stack[top++] = m;
        }
      };
      if (x > 0) visit(p - 1);
      if (x < width - 1) visit(p + 1);
      if (y > 0) visit(p - width);
      if (y < height - 1) visit(p + width);
    }
    if (touchesBorder || pixels.length < MIN_POCKET_AREA) continue;
    const cx = sx / pixels.length;
    const cy = sy / pixels.length;
    const kept = keep.some(
      ([x0, y0, x1, y1, maxArea = Infinity]) =>
        cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1 && pixels.length <= maxArea,
    );
    if (!kept) pockets.push(pixels);
  }
  return pockets;
}

/**
 * Flood-fills the background from the image border and from enclosed
 * background pockets, then converts it to a soft alpha matte.
 */
function removeBackground(img, keep) {
  const { data, width, height } = img;
  const bg = estimateBackground(img);
  const bgLum = luminance(bg.r, bg.g, bg.b);
  const n = width * height;
  const isBg = new Uint8Array(n);
  const dist = new Float32Array(n);

  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const dr = data[i] - bg.r;
    const dg = data[i + 1] - bg.g;
    const db = data[i + 2] - bg.b;
    dist[p] = Math.sqrt(dr * dr + dg * dg + db * db);
  }

  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const seedIndex = (p) => {
    if (!isBg[p] && dist[p] <= T_FLOOD) {
      isBg[p] = 1;
      queue[tail++] = p;
    }
  };
  const seed = (x, y) => seedIndex(y * width + x);
  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }
  const pockets = findPockets(dist, width, height, keep);
  for (const pocket of pockets) for (const p of pocket) seedIndex(p);

  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) seed(x - 1, y);
    if (x < width - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < height - 1) seed(x, y + 1);
  }

  const out = Buffer.from(data);
  for (let p = 0; p < n; p++) {
    if (!isBg[p]) continue;
    const i = p * 4;
    const d = dist[p];
    // The drawing is always darker than its background at the silhouette edge,
    // so anything lighter than the background is glow/vignette → transparent.
    const lighter = luminance(data[i], data[i + 1], data[i + 2]) >= bgLum - 1.5;
    const alpha = lighter ? 0 : Math.max(0, Math.min(1, (d - T_TRANSPARENT) / (T_FLOOD - T_TRANSPARENT)));
    if (alpha <= 0) {
      out[i + 3] = 0;
      continue;
    }
    // Colour decontamination: remove the background's contribution from edge pixels.
    const un = (c, b) => Math.max(0, Math.min(255, Math.round((c - (1 - alpha) * b) / alpha)));
    out[i] = un(data[i], bg.r);
    out[i + 1] = un(data[i + 1], bg.g);
    out[i + 2] = un(data[i + 2], bg.b);
    out[i + 3] = Math.round(alpha * 255);
  }
  return { data: out, width, height, bg, pockets: pockets.length };
}

// ─── Outfit recolouring ────────────────────────────────────────────────────

const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });

/** Square min/max filter (separable) — erosion when `fn` is Math.min, dilation with Math.max. */
function morph(mask, width, height, radius, fn) {
  const tmp = new Uint8Array(mask.length);
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = mask[y * width + x];
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k;
        v = fn(v, xx < 0 || xx >= width ? 0 : mask[y * width + xx]);
      }
      tmp[y * width + x] = v;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = tmp[y * width + x];
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k;
        v = fn(v, yy < 0 || yy >= height ? 0 : tmp[yy * width + x]);
      }
      out[y * width + x] = v;
    }
  }
  return out;
}

/** Pixels of Emma's outfit inside `zone`: the dark fabric, the dots it encloses and their soft edges. */
function outfitMask({ data, width, height }, zone) {
  const [zx0, zy0, zx1, zy1] = zone;
  const n = width * height;
  const inZone = (x, y) => x >= zx0 && x < zx1 && y >= zy0 && y < zy1;
  const dark = new Uint8Array(n);
  for (let y = zy0; y < zy1; y++) {
    for (let x = zx0; x < zx1; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 200 && luminance(data[i], data[i + 1], data[i + 2]) < DARK_FABRIC) dark[y * width + x] = 1;
    }
  }
  // Opening removes line art (thin) and keeps fabric (thick).
  const opened = morph(morph(dark, width, height, OPEN_RADIUS, Math.min), width, height, OPEN_RADIUS, Math.max);
  for (let p = 0; p < n; p++) opened[p] &= dark[p];

  // Drop tiny specks.
  const mask = new Uint8Array(n);
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (!opened[s] || seen[s]) continue;
    let top = 0;
    const pixels = [];
    stack[top++] = s;
    seen[s] = 1;
    while (top) {
      const p = stack[--top];
      pixels.push(p);
      const x = p % width;
      const y = (p - x) / width;
      for (const m of [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1]) {
        if (m >= 0 && opened[m] && !seen[m]) {
          seen[m] = 1;
          stack[top++] = m;
        }
      }
    }
    if (pixels.length >= MIN_FABRIC_AREA) for (const p of pixels) mask[p] = 1;
  }

  // Fill enclosed holes (the dots): flood the non-fabric pixels from the zone border.
  const outside = new Uint8Array(n);
  let top = 0;
  const seed = (x, y) => {
    const p = y * width + x;
    if (!mask[p] && !outside[p]) {
      outside[p] = 1;
      stack[top++] = p;
    }
  };
  for (let x = zx0; x < zx1; x++) {
    seed(x, zy0);
    seed(x, zy1 - 1);
  }
  for (let y = zy0; y < zy1; y++) {
    seed(zx0, y);
    seed(zx1 - 1, y);
  }
  while (top) {
    const p = stack[--top];
    const x = p % width;
    const y = (p - x) / width;
    if (x > zx0) seed(x - 1, y);
    if (x < zx1 - 1) seed(x + 1, y);
    if (y > zy0) seed(x, y - 1);
    if (y < zy1 - 1) seed(x, y + 1);
  }
  for (let y = zy0; y < zy1; y++) for (let x = zx0; x < zx1; x++) if (!outside[y * width + x]) mask[y * width + x] = 1;

  // Grey anti-aliasing next to the fabric (never skin or hair, which have colour).
  const near = morph(mask, width, height, EDGE_RADIUS, Math.max);
  for (let y = zy0; y < zy1; y++) {
    for (let x = zx0; x < zx1; x++) {
      const p = y * width + x;
      if (mask[p] || !near[p] || !inZone(x, y)) continue;
      const i = p * 4;
      const chroma = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
      if (data[i + 3] > 0 && chroma <= EDGE_MAX_CHROMA) mask[p] = 2;
    }
  }
  return mask;
}

/** Recolours the outfit: dark → fabric colour (line art a touch darker), light → dot colour. */
function recolour(cutout, zone, { fabric, dots }) {
  const { data, width, height } = cutout;
  const mask = outfitMask(cutout, zone);
  const f = hex(fabric);
  const d = hex(dots);
  const core = [];
  for (let p = 0; p < mask.length; p++) if (mask[p] === 1) core.push(luminance(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]));
  core.sort((a, b) => a - b);
  const fabricLum = Math.max(8, core[Math.floor(core.length * 0.35)] ?? 30);
  const dotLum = 232;
  const out = Buffer.from(data);
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    const i = p * 4;
    const L = luminance(data[i], data[i + 1], data[i + 2]);
    let r;
    let g;
    let b;
    if (L <= fabricLum) {
      const k = 0.6 + 0.4 * (L / fabricLum);
      r = f.r * k;
      g = f.g * k;
      b = f.b * k;
    } else {
      const t0 = Math.min(1, (L - fabricLum) / (dotLum - fabricLum));
      const t = t0 * t0 * (3 - 2 * t0);
      r = f.r + (d.r - f.r) * t;
      g = f.g + (d.g - f.g) * t;
      b = f.b + (d.b - f.b) * t;
    }
    out[i] = Math.round(r);
    out[i + 1] = Math.round(g);
    out[i + 2] = Math.round(b);
  }
  return { ...cutout, data: out };
}

function toSharp({ data, width, height }) {
  return sharp(data, { raw: { width, height, channels: 4 } });
}

async function writeVariant(cutout, variant, dir = OUT_DIR) {
  const files = [];
  for (const w of variant.widths) {
    const h = Math.round((variant.crop.height / variant.crop.width) * w);
    const file = path.join(dir, `${variant.name}-${w}.webp`);
    await toSharp(cutout)
      .extract(variant.crop)
      .resize(w, h, { kernel: 'lanczos3' })
      .webp({ quality: 84, alphaQuality: 92, effort: 6, smartSubsample: true })
      .toFile(file);
    files.push(path.relative(root, file));
  }
  return files;
}

/** Emma's face on a cream disc over terracotta — used for every app icon. */
async function makeIcon(cutout, size, { maskable = false } = {}) {
  const avatarCrop = VARIANTS.find((v) => v.name === 'emma-front-avatar').crop;
  const disc = Math.round(size * (maskable ? 0.72 : 0.86));
  const face = await toSharp(cutout).extract(avatarCrop).resize(disc, disc).png().toBuffer();
  const mask = Buffer.from(
    `<svg width="${disc}" height="${disc}"><circle cx="${disc / 2}" cy="${disc / 2}" r="${disc / 2}" fill="#fff"/></svg>`,
  );
  const discBg = await sharp({ create: { width: disc, height: disc, channels: 4, background: { ...CREAM, alpha: 1 } } })
    .composite([{ input: face }, { input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const offset = Math.round((size - disc) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: { ...TERRACOTTA, alpha: 1 } } })
    .composite([{ input: discBg, left: offset, top: offset }])
    .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(ICON_DIR, { recursive: true });

  const cutouts = {};
  for (const [key, { file, keep }] of Object.entries(SOURCES)) {
    const cut = removeBackground(await loadRaw(file), keep);
    cutouts[key] = cut;
    console.log(`✓ ${file}: background rgb(${cut.bg.r}, ${cut.bg.g}, ${cut.bg.b}) removed (+${cut.pockets} enclosed pockets)`);
  }

  for (const variant of VARIANTS) {
    const files = await writeVariant(cutouts[variant.source], variant);
    console.log(`✓ ${variant.name}: ${files.join(', ')}`);
  }

  const outfits = JSON.parse(await readFile(path.join(root, 'data/outfits.json'), 'utf8'));
  for (const [id, colours] of Object.entries(outfits)) {
    const dir = path.join(OUT_DIR, 'outfits', id);
    await mkdir(dir, { recursive: true });
    const recoloured = {};
    for (const [key, cutout] of Object.entries(cutouts)) recoloured[key] = recolour(cutout, OUTFIT_ZONES[key], colours);
    for (const variant of VARIANTS) await writeVariant(recoloured[variant.source], variant, dir);
    console.log(`✓ outfit ${id}`);
  }

  const front = cutouts.front;
  await (await makeIcon(front, 512)).toFile(path.join(APP_DIR, 'icon.png'));
  await (await makeIcon(front, 180)).toFile(path.join(APP_DIR, 'apple-icon.png'));
  await (await makeIcon(front, 192)).toFile(path.join(ICON_DIR, 'icon-192.png'));
  await (await makeIcon(front, 512)).toFile(path.join(ICON_DIR, 'icon-512.png'));
  await (await makeIcon(front, 512, { maskable: true })).toFile(path.join(ICON_DIR, 'icon-maskable-512.png'));
  console.log('✓ app icons');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
