// Runs inside a browser page (see build.mjs). Flattens the printed design off a
// photo of a can.
//   1. turn the photo into an "ink coverage" map (0 = bare can, 1 = ink), which
//      removes the photo's lighting and lets the art be re-inked in any colour
//   2. unroll the visible half of the cylinder onto a flat strip
window.LabelTool = (() => {
  const TW = 2046, TH = 1436;                 // the whole label; 2046 divides into three equal faces
  const Y_WALL = 0.11, Y_SH = 1.36, Y_NECK = 1.5, R = 0.34, R_NECK = 0.283;
  // radius of the 3D can (as a share of the wall radius) at label row t (0 top, 1 bottom)
  const radiusAt = (t) => { const Y = Y_NECK - t * (Y_NECK - Y_WALL); if (Y <= Y_SH) return 1; const s = (Y - Y_SH) / (Y_NECK - Y_SH); return (R - (R - R_NECK) * (1 - Math.cos((s * Math.PI) / 2))) / R; };

  async function load(parts, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    for (const p of parts) { const im = new Image(); im.src = p.data; await im.decode(); g.drawImage(im, p.x, p.y); }
    const d = g.getImageData(0, 0, w, h).data; const L = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
    return { L, w, h };
  }
  function boxFilter(src, w, h, r, op) {      // separable max / min / mean
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    const run = (a, b2, horiz) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = op === 'max' ? -1e9 : op === 'min' ? 1e9 : 0, n = 0; for (let k = -r; k <= r; k++) { const xx = horiz ? Math.min(w - 1, Math.max(0, x + k)) : x, yy = horiz ? y : Math.min(h - 1, Math.max(0, y + k)); const s = a[yy * w + xx]; if (op === 'max') { if (s > v) v = s; } else if (op === 'min') { if (s < v) v = s; } else { v += s; n++; } } b2[y * w + x] = op === 'mean' ? v / n : v; } };
    run(src, tmp, true); run(tmp, out, false); return out;
  }
  // ink coverage. lightInk: white print on a dark can.
  function inkMap(img, { lightInk, inkL, radius = 10 }) {
    const { L, w, h } = img;
    let ground = boxFilter(L, w, h, radius, lightInk ? 'min' : 'max'); ground = boxFilter(ground, w, h, radius, 'mean');
    const A = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) { const span = lightInk ? inkL - ground[i] : ground[i] - inkL; const v = lightInk ? L[i] - ground[i] : ground[i] - L[i]; A[i] = span > 12 ? Math.min(1, Math.max(0, v / span)) : 0; }
    return { A, w, h };
  }
  const cub = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  function sample(m, x, y) {                  // bicubic
    const { A, w, h } = m; const xi = Math.floor(x), yi = Math.floor(y), tx = x - xi, ty = y - yi; const rows = [];
    for (let j = -1; j <= 2; j++) { const yy = Math.min(h - 1, Math.max(0, yi + j)); const g = (k) => A[yy * w + Math.min(w - 1, Math.max(0, xi + k))]; rows.push(cub(g(-1), g(0), g(1), g(2), tx)); }
    return Math.min(1, Math.max(0, cub(rows[0], rows[1], rows[2], rows[3], ty)));
  }
  const DEG = Math.PI / 180;
  // Only the front third of the can (60 degrees either side of centre) is
  // photographed well enough to use. The label repeats that third around the
  // can, flipping it each time so neighbouring copies meet edge to edge.
  const KEEP = 60;
  const fold = (deg) => KEEP - Math.abs((((deg + KEEP) % (4 * KEEP)) + 4 * KEEP) % (4 * KEEP) - 2 * KEEP);
  // band: photo rows yA..yB (at the centre line) map to label rows tA..tB; `bow` is
  // how many pixels a level line on the can drops by the time it reaches the can's edge.
  function unwrapBand(m, band, { sharp = [0.16, 0.6] } = {}) {
    const n = TW; const r0 = Math.round(band.tA * TH), r1 = Math.round(band.tB * TH); const out = new Float32Array(n * (r1 - r0));
    for (let ty = r0; ty < r1; ty++) { const t = ty / TH; const f = (t - band.tA) / (band.tB - band.tA); const yc = band.yA + f * (band.yB - band.yA); const rad = band.R * radiusAt(t); const bow = band.bowA + f * (band.bowB - band.bowA);
      for (let i = 0; i < n; i++) { const th = fold(((i + 0.5) / n - 0.5) * 360) * DEG; const v = sample(m, band.cx + rad * Math.sin(th), yc + bow * (1 - Math.cos(th))); const s = Math.min(1, Math.max(0, (v - sharp[0]) / (sharp[1] - sharp[0]))); out[(ty - r0) * n + i] = s * s * (3 - 2 * s); } }
    return { data: out, w: n, h: r1 - r0, row0: r0 };
  }
  // Keep only the printed decoration: the tile band (minus the window the map
  // sits in), the landmark band, and the globe from the logo on the front face.
  // Everything else on the label is lettering, which the site draws itself.
  function art(strip, cfg) {
    const { w, h, data } = strip; const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { const t = y / h;
      for (let x = 0; x < w; x++) { const phi = ((x + 0.5) / w - 0.5) * 360, th = fold(phi); let keep = false;
        if (t > cfg.bottomStart) keep = true;
        else if (t < cfg.topEnd) keep = !cfg.window.some((r) => t > r.t && th > r.a0 && th < r.a1);
        else { const dx = (phi - cfg.globe.a) * (w / 360), dy = (t - cfg.globe.t) * h; keep = dx * dx + dy * dy < cfg.globe.r * cfg.globe.r; }
        if (keep) out[y * w + x] = data[y * w + x]; } }
    return { data: out, w, h };
  }
  // The front face only (black = bare can, white = ink). The site lays it
  // round the can three times, which is all a full-width file would hold anyway.
  function maskCanvas(strip) {
    const full = toCanvas(strip, [255, 255, 255], [0, 0, 0]); const third = strip.w / 3;
    const c = document.createElement('canvas'); c.width = third; c.height = strip.h; c.getContext('2d').drawImage(full, third, 0, third, strip.h, 0, 0, third, strip.h); return c;
  }
  function toCanvas(strip, ink = [20, 20, 20], ground = [245, 242, 235]) {
    const c = document.createElement('canvas'); c.width = strip.w; c.height = strip.h; const g = c.getContext('2d'); const id = g.createImageData(strip.w, strip.h);
    for (let i = 0; i < strip.w * strip.h; i++) { const a = strip.data[i]; for (let k = 0; k < 3; k++) id.data[i * 4 + k] = ground[k] + (ink[k] - ground[k]) * a; id.data[i * 4 + 3] = 255; }
    g.putImageData(id, 0, 0); return c;
  }
  return { TW, TH, load, inkMap, unwrapBand, art, maskCanvas, toCanvas, radiusAt };
})();
