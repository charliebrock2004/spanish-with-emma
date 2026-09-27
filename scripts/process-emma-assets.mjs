#!/usr/bin/env node
/**
 * Emma asset pipeline.
 *
 * Takes the four original Emma reference illustrations in `assets/emma/source/`
 * and produces every web asset the game uses:
 *
 *   public/emma/*.webp        transparent cut-outs (avatar + portrait per pose)
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
import { mkdir } from 'node:fs/promises';
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

function toSharp({ data, width, height }) {
  return sharp(data, { raw: { width, height, channels: 4 } });
}

async function writeVariant(cutout, variant) {
  const files = [];
  for (const w of variant.widths) {
    const h = Math.round((variant.crop.height / variant.crop.width) * w);
    const file = path.join(OUT_DIR, `${variant.name}-${w}.webp`);
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
