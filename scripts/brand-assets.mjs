// Generates the Portal Meta News brand images in apps/frontend/public from SVG shapes: every letter is drawn with
// strokes and paths, so no system font is involved and the result is identical on every machine.
// Run: node scripts/brand-assets.mjs   (uses sharp from apps/backend/node_modules)
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sharp = createRequire(join(root, "apps/backend/package.json"))("sharp");
const out = join(root, "apps/frontend/public");

/** The "Meta News" theme's colours: cobalt and signal red over ink and paper, for each colour scheme. */
export const palettes = {
  light: { tile: "#0F3D91", mark: "#FFFFFF", signal: "#E63946", ring: "#F7F8FA", ink: "#0B1324", accent: "#0F3D91", kicker: "#E63946" },
  dark: { tile: "#7EA6FF", mark: "#0A0F1A", signal: "#FF6B76", ring: "#0A0F1A", ink: "#F2F5FA", accent: "#7EA6FF", kicker: "#FF6B76" },
};

/**
 * The symbol in a 240 x 240 box: a cobalt tile holding an "M" drawn as a signal line (the pulse of the news), with
 * the red dot of breaking news on its upper corner, ringed in the background colour so it reads on any surface.
 */
export function symbol(c, { round = 56, ring = true } = {}) {
  return `
  <rect x="0" y="16" width="224" height="224" rx="${round}" fill="${c.tile}"/>
  <path d="M50 186 V84 L112 150 L174 84 V186" fill="none" stroke="${c.mark}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
  ${ring ? `<circle cx="204" cy="36" r="36" fill="${c.ring}"/>` : ""}
  <circle cx="204" cy="36" r="24" fill="${c.signal}"/>`;
}

/**
 * Stroke letters on a 100-unit cap height (baseline 100, top 0), drawn around their centre lines; `w` is the advance
 * of each glyph before the tracking. Every glyph is clipped to the cap height, so diagonals that run past it (the apex
 * of the A, the tips of the W, the joins of the M and N) end flat on the baseline and the cap line, as a type designer
 * would cut them. Geometric and bold, in the spirit of the headings' sans companion.
 */
const S = 9; // half the stroke, so straight strokes stay inside the cap height with their square caps
const GLYPHS = {
  M: { w: 94, d: "M9 112 V-12 M9 -6 L47 66 L85 -6 M85 -12 V112" },
  E: { w: 62, d: `M${62 - S} ${S} H${S} V${100 - S} H${62 - S} M${S} 50 H${54 - S}` },
  T: { w: 66, d: `M0 ${S} H66 M33 ${S} V112` },
  A: { w: 84, d: "M-2 118 L42 -14 L86 118 M18 70 H66" },
  N: { w: 80, d: "M9 112 V-12 M9 -8 L71 108 M71 112 V-12" },
  W: { w: 118, d: "M-2 -14 L30 114 L59 22 L88 114 L120 -14" },
  S: { w: 66, d: `M${66 - S - 2} 22 C${66 - S - 8} 12 50 ${S} 34 ${S} C18 ${S} ${S + 1} 18 ${S + 1} 30 C${S + 1} 44 22 49 34 51 C48 54 ${66 - S} 59 ${66 - S} 72 C${66 - S} 85 51 ${100 - S} 33 ${100 - S} C19 ${100 - S} ${S + 1} 92 ${S - 2} 82` },
  P: { w: 66, d: `M${S} 112 V${S} H38 C55 ${S} ${66 - S} 20 ${66 - S} 33 C${66 - S} 46 55 57 38 57 H${S}` },
  O: { w: 86, d: `M43 ${S} C65 ${S} ${86 - S} 28 ${86 - S} 50 C${86 - S} 72 65 ${100 - S} 43 ${100 - S} C21 ${100 - S} ${S} 72 ${S} 50 C${S} 28 21 ${S} 43 ${S} Z` },
  R: { w: 70, d: `M${S} 112 V${S} H38 C55 ${S} ${66 - S} 20 ${66 - S} 33 C${66 - S} 46 55 57 38 57 H${S} M36 57 L74 116` },
  L: { w: 58, d: `M${S} -12 V${100 - S} H${58 - S}` },
  " ": { w: 34, d: "" },
};

let clips = 0;

/** A word as strokes, its width and its markup, at `size` (the cap height in the drawing's units). */
function word(text, { x, y, size, color, tracking = 10, weight = 2 * S }) {
  const scale = size / 100;
  let cursor = 0;
  const parts = [];
  for (const letter of text) {
    const glyph = GLYPHS[letter];
    if (!glyph) throw new Error(`No glyph for ${letter}`);
    if (glyph.d) parts.push(`<path transform="translate(${cursor} 0)" d="${glyph.d}"/>`);
    cursor += glyph.w + tracking;
  }
  const width = (cursor - tracking) * scale;
  const clip = `cap-${(clips += 1)}`;
  const markup = `<clipPath id="${clip}"><rect x="-20" y="0" width="${cursor + 40}" height="100"/></clipPath>`
    + `<g transform="translate(${x} ${y}) scale(${scale})"><g clip-path="url(#${clip})" fill="none" stroke="${color}" stroke-width="${weight}" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="4">${parts.join("")}</g></g>`;
  return { width, markup };
}

/** The horizontal lockup: the symbol, the small red "PORTAL" kicker and "META NEWS" set in ink and cobalt. */
function lockup(c) {
  const meta = word("META", { x: 0, y: 0, size: 96, color: c.ink });
  const news = word("NEWS", { x: 0, y: 0, size: 96, color: c.accent });
  const gap = 30;
  const textX = 268;
  const kicker = word("PORTAL", { x: textX + 4, y: 66, size: 30, color: c.kicker, tracking: 34, weight: 22 });
  const metaPlaced = word("META", { x: textX, y: 124, size: 96, color: c.ink });
  const newsPlaced = word("NEWS", { x: textX + meta.width + gap, y: 124, size: 96, color: c.accent });
  const width = Math.ceil(textX + meta.width + gap + news.width + 8);
  return {
    width, height: 256,
    svg: `<g transform="translate(0 0)">${symbol(c)}</g>${kicker.markup}${metaPlaced.markup}${newsPlaced.markup}`,
  };
}

function logo(c, outputWidth = 1200) {
  const { width, height, svg } = lockup(c);
  const outputHeight = Math.round(outputWidth * height / width);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${width} ${height}">${svg}</svg>`;
}

/** The symbol alone, square: favicons keep the tile's corners (`full` fills the square for the apple icon). */
function icon(c, size, { full = false, ring = true } = {}) {
  const body = full
    ? `<rect width="256" height="256" fill="${c.tile}"/><g transform="translate(16 0)">${symbol(c, { round: 0, ring: false })}</g>`
    : `<g transform="translate(8 0)">${symbol(c, { ring })}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256">${body}</svg>`;
}

/** The default image of a shared link (1200 x 630): the lockup over paper, a cobalt band and the signal dot. */
function social() {
  const c = palettes.light;
  const { width, height, svg } = lockup(c);
  const scale = 760 / width;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${c.ring}"/>
    <rect x="0" y="560" width="1200" height="70" fill="${c.tile}"/>
    <rect x="0" y="560" width="300" height="70" fill="${c.signal}"/>
    <g transform="translate(${(1200 - width * scale) / 2} ${(560 - height * scale) / 2 - 10}) scale(${scale})">${svg}</g>
  </svg>`;
}

const png = (svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
const write = (file, buffer) => { writeFileSync(join(out, file), buffer); console.log(`${file} (${buffer.length} bytes)`); };

if (import.meta.main) {
  mkdirSync(join(out, "brand"), { recursive: true });
  // The previous identity's files (and anything else) go, so only this identity is served.
  for (const file of readdirSync(join(out, "brand"))) rmSync(join(out, "brand", file));
  write("brand/logo-light.png", await png(logo(palettes.light)));
  write("brand/logo-dark.png", await png(logo(palettes.dark)));
  const small = (c, size, options) => sharp(Buffer.from(icon(c, size, options))).png().toBuffer();
  // At 16-32 px the ring would be a hairline: the dot sits straight on the tile's corner.
  write("brand/favicon.png", await small(palettes.light, 32, { ring: false }));
  write("brand/favicon-dark.png", await small(palettes.dark, 32, { ring: false }));
  write("brand/apple-icon.png", await small(palettes.light, 180, { full: true }));
  write("brand/symbol.png", await small(palettes.light, 512));
  write("brand/social.jpg", await sharp(Buffer.from(social())).flatten({ background: palettes.light.ring }).jpeg({ quality: 88, mozjpeg: true }).toBuffer());

  // favicon.ico: PNG-compressed images of 16, 32 and 48 px.
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map((size) => small(palettes.light, size, { ring: false })));
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((size, index) => {
    head.writeUInt8(size, 6 + index * 16); head.writeUInt8(size, 7 + index * 16);
    head.writeUInt16LE(1, 10 + index * 16); head.writeUInt16LE(32, 12 + index * 16);
    head.writeUInt32LE(images[index].length, 14 + index * 16); head.writeUInt32LE(offset, 18 + index * 16);
    offset += images[index].length;
  });
  write("favicon.ico", Buffer.concat([head, ...images]));
}
