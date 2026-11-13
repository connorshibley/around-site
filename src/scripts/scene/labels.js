// Stand-in can labels, drawn flat on a 2D canvas and wrapped around the can.
//
// These exist only until Connor's flat label artwork arrives. They carry the
// parts of his design that can be reproduced exactly (wordmark, "Sip the
// World", country, drink name, the dotted country map) and a simple tile band
// in place of his hand-drawn tiles and landmark line-art.
//
// If a file exists at /labels/<key>.png it is used instead of the drawing.

const W = 2048;
const H = 1332; // matches the can's circumference : label height
const SANS = '"Montserrat Variable", system-ui, sans-serif';

function spaced(ctx, text, cx, y, tracking) {
  // Canvas has no reliable letter-spacing everywhere, so place glyphs by hand.
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1);
  let x = cx - total / 2;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + tracking;
  });
  ctx.textAlign = 'center';
  return total;
}

function globeGlyph(ctx, cx, cy, r, glyph, ink) {
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

function wordmark(ctx, cx, y, size, glyph, ink) {
  ctx.font = `900 ${size}px ${SANS}`;
  ctx.fillStyle = ink;
  ctx.textBaseline = 'alphabetic';
  const track = size * 0.02;
  const wAR = ctx.measureText('A').width + ctx.measureText('R').width + track;
  const wUND = ['U', 'N', 'D'].reduce((a, ch) => a + ctx.measureText(ch).width, 0) + track * 2;
  const r = size * 0.36;
  const gap = size * 0.05;
  const total = wAR + gap + r * 2 + gap + wUND;
  let x = cx - total / 2;
  ctx.textAlign = 'left';
  for (const ch of 'AR') { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + track; }
  x += gap - track;
  globeGlyph(ctx, x + r, y - size * 0.355, r, glyph, ink);
  x += r * 2 + gap;
  for (const ch of 'UND') { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + track; }
  ctx.textAlign = 'center';
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

function tileBand(ctx, y, size, rows, ink, ground) {
  const cols = Math.round(W / size);
  const s = W / cols;
  ctx.lineWidth = 3;
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols; c++) {
      const x = c * s, yy = y + row * s;
      const cx = x + s / 2, cy = yy + s / 2;
      ctx.strokeStyle = ink;
      ctx.strokeRect(x + 5, yy + 5, s - 10, s - 10);
      // an eight-petal rosette, alternating filled and outlined
      const filled = (c + row) % 2 === 0;
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * s * 0.2, cy + Math.sin(a) * s * 0.2, s * 0.12, s * 0.055, a, 0, Math.PI * 2);
        if (filled) { ctx.fillStyle = ink; ctx.fill(); } else { ctx.stroke(); }
      }
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = filled ? ground : ink;
      ctx.fill();
      ctx.stroke();
    }
  }
}

function arcBand(ctx, y, h, ink) {
  // Overlapping arcs around the base, standing in for the landmark line-art.
  const n = 32;
  const s = W / n;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  for (let row = 0; row < 3; row++) {
    for (let i = -1; i <= n; i++) {
      const cx = i * s + (row % 2 ? s / 2 : 0);
      const cy = y + h - row * (h / 3.4);
      for (const k of [1, 0.66, 0.33]) {
        ctx.beginPath();
        ctx.arc(cx, cy, (s / 2) * k, Math.PI, 0);
        ctx.stroke();
      }
    }
  }
}

function drawPanel(ctx, cx, drink, data, big) {
  const { ink, soft } = drink.label;
  const country = data.countries[drink.key];
  dottedMap(ctx, country, cx, big ? 520 : 560, big ? 400 : 300, big ? 300 : 230, soft);
  wordmark(ctx, cx, big ? 835 : 815, big ? 150 : 104, data.glyph, ink);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.font = `500 ${big ? 44 : 34}px ${SANS}`;
  ctx.fillText('Sip the World', cx, big ? 900 : 868);
  if (big) {
    ctx.font = `800 84px ${SANS}`;
    spaced(ctx, drink.country.toUpperCase(), cx, 1030, 5);
    ctx.font = `500 42px ${SANS}`;
    ctx.fillText(drink.name, cx, 1092);
  }
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function makeLabelCanvas(drink, data, base = '') {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Real artwork wins if it has been dropped into public/labels/.
  if (drink.labelFile) {
    const img = await loadImage(`${base}/labels/${drink.labelFile}`);
    if (img) {
      ctx.drawImage(img, 0, 0, W, H);
      return canvas;
    }
  }

  try {
    await Promise.all([
      document.fonts.load(`900 100px ${SANS}`),
      document.fonts.load(`500 40px ${SANS}`),
      document.fonts.load(`800 80px ${SANS}`),
    ]);
  } catch (e) {}

  const { ground, ink } = drink.label;
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, W, H);

  tileBand(ctx, 34, W / 16, 2, ink, ground);
  ctx.fillStyle = ink;
  ctx.fillRect(0, 34 + (W / 16) * 2 + 14, W, 4);
  arcBand(ctx, 1150, 150, ink);
  ctx.fillRect(0, 1132, W, 4);

  // Front panel faces the camera at u = 0.5. The back panel straddles the seam.
  drawPanel(ctx, W / 2, drink, data, true);
  drawPanel(ctx, 0, drink, data, false);
  drawPanel(ctx, W, drink, data, false);
  return canvas;
}
