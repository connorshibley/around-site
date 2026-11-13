// The can labels: one flat image per can, wrapped round the 3D can.
//
// The decoration (tile band, landmark skyline, the globe in the logo) is the
// group's own artwork, lifted from their can mock-up photos by
// scripts/labels/build.mjs and stored in public/labels/<can>.webp as a mask of
// the can's front face. This file prints that mask in the can's ink colour and
// sets the lettering and the dotted map over it, placed where they sit on the
// real cans.
//
// A photo only shows the front of a can, so the front face is repeated round
// the sides and back (flipped, so the copies join up). The two rear faces get a
// small logo of their own in place of the front's full lettering.

const W = 2046; // once round the can
const H = 1436; // top of the print to the bottom
const FACE = W / 3;
const SANS = '"Montserrat Variable", system-ui, sans-serif';
const X = (deg) => W / 2 + (deg * W) / 360; // degrees round from the front centre
const Y = (t) => t * H; // share of the way down the label

// Rows of the mask that are decoration on every face. Between them is the
// lettering zone, which only holds the globe (front face only).
const TOP_END = 0.26;
const BOTTOM_START = 0.66;

function tracked(ctx, text, x, y, tracking, align = 'center') {
  // Canvas letter-spacing is not dependable everywhere, so place glyphs by hand.
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1);
  let at = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, at, y);
    at += widths[i] + tracking;
  });
  return total;
}

function globeGlyph(ctx, cx, cy, r, glyph, ink) {
  // A dotted stand-in for the logo's globe, used on the rear faces and if the
  // artwork cannot be loaded.
  const rad = Math.PI / 180;
  const cLat = 12, cLon = -55;
  const cl = Math.cos(cLat * rad), sl = Math.sin(cLat * rad);
  ctx.strokeStyle = ink;
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = ink;
  for (let i = 0; i < glyph.length; i += 2) {
    const lat = (glyph[i] / 100) * rad;
    const dLon = (glyph[i + 1] / 100 - cLon) * rad;
    const x = Math.cos(lat) * Math.sin(dLon);
    const y = cl * Math.sin(lat) - sl * Math.cos(lat) * Math.cos(dLon);
    const z = sl * Math.sin(lat) + cl * Math.cos(lat) * Math.cos(dLon);
    if (z <= 0.12) continue;
    ctx.beginPath();
    ctx.arc(cx + x * r * 0.8, cy - y * r * 0.8, r * 0.058, 0, Math.PI * 2);
    ctx.fill();
  }
}

function dottedMap(ctx, country, cx, cy, maxW, maxH, ink) {
  const scale = Math.min(maxW / country.aspect, maxH);
  const w = scale * country.aspect;
  const h = scale;
  const r = (h / country.rows) * 0.36;
  ctx.fillStyle = ink;
  const d = country.dots;
  for (let i = 0; i < d.length; i += 2) {
    ctx.beginPath();
    ctx.arc(cx - w / 2 + (d[i] / 1000) * w, cy - h / 2 + (d[i + 1] / 1000) * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// The front of the can, measured off the mock-ups: the logo's letters either
// side of the globe, "Sip the World", the country and the drink.
function frontFace(ctx, drink, data, hasArt) {
  const { ink } = drink.label;
  const m = drink.label.map;
  dottedMap(ctx, data.countries[drink.key], X(0), Y(m.t), m.w, m.h, drink.label.mapInk || ink);

  ctx.fillStyle = ink;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 166px ${SANS}`;
  tracked(ctx, 'AR', X(-29.7), Y(0.4045), 3, 'right');
  tracked(ctx, 'UND', X(2.7), Y(0.4045), 4, 'left');
  if (!hasArt) globeGlyph(ctx, X(-13.3), Y(0.3657), 70, data.glyph, ink);

  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.font = `500 50px ${SANS}`;
  ctx.fillText('Sip the World', X(0), Y(0.461));
  ctx.font = `800 95px ${SANS}`;
  tracked(ctx, drink.country.toUpperCase(), X(0), Y(0.584), 4);
  // The drink's name runs most of the way across the face; shrink it if a
  // longer name would not fit.
  let size = 58;
  ctx.font = `500 ${size}px ${SANS}`;
  const room = (136 * W) / 360;
  const wide = ctx.measureText(drink.name).width;
  if (wide > room) { size = Math.floor((size * room) / wide); ctx.font = `500 ${size}px ${SANS}`; }
  ctx.textAlign = 'center';
  ctx.fillText(drink.name, X(0), Y(0.647));
}

// The two rear faces: the map in its window again, and a small logo.
function rearFace(ctx, deg, drink, data) {
  const { ink } = drink.label;
  const m = drink.label.map;
  dottedMap(ctx, data.countries[drink.key], X(deg), Y(m.t), m.w, m.h, drink.label.mapInk || ink);
  const size = 88, r = size * 0.4, gap = size * 0.06, y = Y(0.41);
  ctx.font = `900 ${size}px ${SANS}`;
  ctx.fillStyle = ink;
  ctx.textBaseline = 'alphabetic';
  const wAR = ctx.measureText('AR').width + 2, wUND = ctx.measureText('UND').width + 4;
  let x = X(deg) - (wAR + gap + r * 2 + gap + wUND) / 2;
  tracked(ctx, 'AR', x, y, 2, 'left');
  x += wAR + gap;
  globeGlyph(ctx, x + r, y - size * 0.35, r, data.glyph, ink);
  ctx.fillStyle = ink;
  tracked(ctx, 'UND', x + r * 2 + gap, y, 2, 'left');
  ctx.textAlign = 'center';
  ctx.font = `500 30px ${SANS}`;
  ctx.fillText('Sip the World', X(deg), Y(0.452));
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Turn the mask (white = ink) into the ink colour with see-through gaps.
function inked(mask, ink) {
  const c = document.createElement('canvas');
  c.width = mask.naturalWidth;
  c.height = mask.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(mask, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height);
  const px = id.data;
  const n = parseInt(ink.slice(1), 16);
  const r = n >> 16, gr = (n >> 8) & 255, b = n & 255;
  for (let i = 0; i < px.length; i += 4) {
    const cover = px[i]; // the mask is grey, so any channel will do
    px[i] = r; px[i + 1] = gr; px[i + 2] = b;
    px[i + 3] = cover < 10 ? 0 : cover; // drop compression speckle on bare can
  }
  g.putImageData(id, 0, 0);
  return c;
}

export async function makeLabelCanvas(drink, data, base = '') {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const { ground, ink } = drink.label;
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, W, H);

  const [mask] = await Promise.all([
    loadImage(`${base}/labels/${drink.key}.webp`),
    Promise.all([
      document.fonts.load(`900 100px ${SANS}`),
      document.fonts.load(`500 40px ${SANS}`),
      document.fonts.load(`800 80px ${SANS}`),
    ]).catch(() => {}),
  ]);

  if (mask) {
    const art = inked(mask, ink);
    // Front face as it is, in the middle third.
    ctx.drawImage(art, 0, 0, art.width, art.height, FACE, 0, FACE, H);
    // The faces either side: flipped, and only the decoration rows.
    const sy = art.height / H;
    for (const x0 of [0, 2 * FACE]) {
      ctx.save();
      ctx.translate(x0 + FACE, 0);
      ctx.scale(-1, 1);
      for (const [a, b] of [[0, TOP_END], [BOTTOM_START, 1]]) {
        ctx.drawImage(art, 0, a * H * sy, art.width, (b - a) * H * sy, 0, a * H, FACE, (b - a) * H);
      }
      ctx.restore();
    }
  } else {
    // No artwork: a plain can with a rule top and bottom, and the lettering.
    ctx.fillStyle = ink;
    ctx.fillRect(0, Y(0.05), W, 4);
    ctx.fillRect(0, Y(0.95), W, 4);
  }

  frontFace(ctx, drink, data, !!mask);
  rearFace(ctx, -120, drink, data);
  rearFace(ctx, 120, drink, data);
  return canvas;
}
