// Builds the dot-matrix globe data from public-domain Natural Earth shapes
// (via the world-atlas package). Run with: node scripts/build-globe-dots.mjs
//
// Output: src/data/globe-dots.json
//   globe:    flat ints [lat*100, lon*100, tag, ...]  tag 0 = land,
//             1 = Mexico, 2 = Italy, 3 = Japan
//   glyph:    coarse [lat*100, lon*100, ...] land dots for the small logo globe
//   countries.{mexico,italy,japan}: { aspect, dots: [x, y, ...] } where x and y
//             are 0..1000 inside the country's own bounding box, for the
//             dotted maps printed on the can labels
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { feature } from 'topojson-client';
import { geoContains, geoBounds } from 'd3-geo';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const atlas = (name) =>
  JSON.parse(readFileSync(join(root, 'node_modules/world-atlas', name), 'utf8'));

const land110 = atlas('land-110m.json');
const c50 = atlas('countries-50m.json');
const land = feature(land110, land110.objects.land);
const all = feature(c50, c50.objects.countries).features;

const PICK = [
  { key: 'mexico', id: '484', tag: 1 },
  { key: 'italy', id: '380', tag: 2 },
  // labelBox keeps the label map to the main islands (remote islands would
  // otherwise stretch the bounding box and shrink the country to a sliver).
  { key: 'japan', id: '392', tag: 3, labelBox: [[128.5, 30.5], [146.2, 45.8]] },
];
for (const p of PICK) {
  p.feature = all.find((f) => f.id === p.id);
  if (!p.feature) throw new Error('Country not found: ' + p.key);
  p.bounds = geoBounds(p.feature); // [[west, south], [east, north]]
}

const inBounds = (b, lon, lat) =>
  lon >= b[0][0] && lon <= b[1][0] && lat >= b[0][1] && lat <= b[1][1];

// Rings of latitude, with the dot count on each ring scaled by cos(lat) so the
// spacing stays even over the whole sphere.
function sample(stepDeg, visit) {
  for (let lat = -90 + stepDeg / 2; lat < 90; lat += stepDeg) {
    const n = Math.max(1, Math.round((360 * Math.cos((lat * Math.PI) / 180)) / stepDeg));
    const offset = (Math.round(lat / stepDeg) % 2) * 0.5; // stagger alternate rings
    for (let i = 0; i < n; i++) {
      const lon = -180 + ((i + offset) * 360) / n;
      visit(lat, lon);
    }
  }
}

const globe = [];
const counts = { land: 0, mexico: 0, italy: 0, japan: 0 };
const whichCountry = (lat, lon) => {
  for (const p of PICK) {
    if (inBounds(p.bounds, lon, lat) && geoContains(p.feature, [lon, lat])) return p;
  }
  return null;
};
// The rest of the world at 1.2 degree spacing.
sample(1.2, (lat, lon) => {
  if (whichCountry(lat, lon)) return; // drawn finer below
  if (lat > -60 && geoContains(land, [lon, lat])) {
    counts.land++;
    globe.push(Math.round(lat * 100), Math.round(lon * 100), 0);
  }
});
// The three Ar0und countries at twice the density, so each one reads as a
// clear shape when the globe lands on it.
sample(0.6, (lat, lon) => {
  const p = whichCountry(lat, lon);
  if (!p) return;
  counts[p.key]++;
  globe.push(Math.round(lat * 100), Math.round(lon * 100), p.tag);
});

const glyph = [];
sample(5.5, (lat, lon) => {
  if (lat > -60 && geoContains(land, [lon, lat])) {
    glyph.push(Math.round(lat * 100), Math.round(lon * 100));
  }
});

// Dotted country maps for the labels: a square grid over the bounding box,
// corrected for latitude so the country is not stretched.
const countries = {};
for (const p of PICK) {
  const [[w, s], [e, n]] = p.labelBox || p.bounds;
  const midLat = ((s + n) / 2) * (Math.PI / 180);
  const widthDeg = (e - w) * Math.cos(midLat);
  const heightDeg = n - s;
  const aspect = widthDeg / heightDeg;
  const rows = 46;
  const cols = Math.round(rows * aspect);
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lon = w + ((c + 0.5) / cols) * (e - w);
      const lat = n - ((r + 0.5) / rows) * (n - s);
      if (geoContains(p.feature, [lon, lat])) {
        dots.push(Math.round(((c + 0.5) / cols) * 1000), Math.round(((r + 0.5) / rows) * 1000));
      }
    }
  }
  countries[p.key] = { aspect: Math.round(aspect * 1000) / 1000, cols, rows, dots };
}

// A still of the globe as plain SVG, shown before the 3D scene has loaded and
// whenever WebGL is unavailable. Orthographic view centred on the Atlantic, the
// same view the live globe opens on.
function globeSvg(centerLat, centerLon) {
  const rad = Math.PI / 180;
  const cl = Math.cos(centerLat * rad), sl = Math.sin(centerLat * rad);
  let circles = '';
  for (let i = 0; i < globe.length; i += 3) {
    const lat = (globe[i] / 100) * rad;
    const dLon = (globe[i + 1] / 100 - centerLon) * rad;
    const x = Math.cos(lat) * Math.sin(dLon);
    const y = cl * Math.sin(lat) - sl * Math.cos(lat) * Math.cos(dLon);
    const z = sl * Math.sin(lat) + cl * Math.cos(lat) * Math.cos(dLon);
    if (z <= 0.04) continue; // far side
    const r = (globe[i + 2] ? 1.7 : 2.6) * (0.55 + 0.45 * z);
    const o = Math.min(1, 0.25 + z * 0.75).toFixed(2);
    circles += `<circle cx="${(500 + x * 480).toFixed(1)}" cy="${(500 - y * 480).toFixed(1)}" r="${r.toFixed(2)}" opacity="${o}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">` +
    `<defs><radialGradient id="g" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#2A1A15"/><stop offset="1" stop-color="#150E0C"/></radialGradient></defs>` +
    `<circle cx="500" cy="500" r="486" fill="url(#g)"/>` +
    `<g fill="#F4EDE0">${circles}</g></svg>`;
}
mkdirSync(join(root, 'public/posters'), { recursive: true });
writeFileSync(join(root, 'public/posters/globe.svg'), globeSvg(15, -55));

mkdirSync(join(root, 'src/data'), { recursive: true });
writeFileSync(
  join(root, 'src/data/globe-dots.json'),
  JSON.stringify({ globe, glyph, countries })
);
console.log('globe dots:', globe.length / 3, counts);
console.log('glyph dots:', glyph.length / 2);
for (const k of Object.keys(countries)) {
  console.log(k, 'label dots:', countries[k].dots.length / 2, 'aspect', countries[k].aspect);
}
