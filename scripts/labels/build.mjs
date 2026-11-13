// Makes the label art for the 3D cans from the group's can mock-up photos.
//
//   node scripts/labels/build.mjs
//
// For each can it reads the photo(s) in scripts/labels/sources/, works out
// where there is ink, unrolls the front of the can flat, keeps the decoration
// (tiles, landmarks, the logo's globe) and writes it to public/labels/<can>.webp
// as a mask of the can's front face (white where there is ink), so the site can
// print it in each can's own colour and lay it round the can.
// Uses the Chrome already installed on this Mac. It also writes a flat preview
// of each label next to this script (preview-<can>.jpg, not committed).
//
// Only the front third of each can is clear enough in a photo to use, so the
// label repeats that third around the can, mirrored. The sides and back of the
// real cans are not in the photos; what is there is a repeat, not the original.
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cans } from './cans.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../public/labels');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.addScriptTag({ content: readFileSync(join(here, 'unwrap.js'), 'utf8') });
  for (const [name, cfg] of Object.entries(cans)) {
    const parts = cfg.parts.map((p) => ({ ...p, data: 'data:image/png;base64,' + readFileSync(join(here, 'sources', p.f)).toString('base64') }));
    const res = await page.evaluate(async ({ cfg }) => {
      const T = window.LabelTool;
      const ink = T.inkMap(await T.load(cfg.parts, cfg.w, cfg.h), cfg);
      const art = T.art(T.unwrapBand(ink, cfg.full), cfg);
      const flat = T.toCanvas(art);
      const small = document.createElement('canvas'); small.width = 1400; small.height = Math.round((1400 * flat.height) / flat.width);
      small.getContext('2d').drawImage(flat, 0, 0, small.width, small.height);
      return { art: T.maskCanvas(art).toDataURL('image/webp', 0.86), preview: small.toDataURL('image/jpeg', 0.85) };
    }, { cfg: { ...cfg, parts } });
    const file = join(out, name + '.webp');
    writeFileSync(file, Buffer.from(res.art.split(',')[1], 'base64'));
    writeFileSync(join(here, `preview-${name}.jpg`), Buffer.from(res.preview.split(',')[1], 'base64'));
    console.log('wrote', file, Math.round(readFileSync(file).length / 1024) + ' KB');
  }
} finally {
  await browser.close();
}
