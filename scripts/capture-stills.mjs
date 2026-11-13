// Captures still images from the live site so pages that have no 3D (the shop,
// the cart, and any browser without WebGL) can still show the real cans.
//
//   1. npm run dev            (in another terminal)
//   2. node scripts/capture-stills.mjs
//
// Writes public/cans/<drink>.png and public/brand/logo-*.png. Uses the Chrome
// already installed on this Mac; nothing is downloaded.
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.SITE_URL || 'http://localhost:4321';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  page.on('console', (m) => { if (m.type() === 'error') console.log('[page error]', m.text()); });

  await page.goto(url + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__around && window.__around.world, null, { timeout: 30000 });
  const stills = await page.evaluate(() => {
    const keys = ['mexico', 'italy', 'japan'];
    return keys.map((key, i) => ({ key, url: window.__around.world.canStill(i, 720, 1130) }));
  });
  mkdirSync(join(root, 'public/cans'), { recursive: true });
  for (const s of stills) {
    const file = join(root, 'public/cans', s.key + '.png');
    writeFileSync(file, Buffer.from(s.url.split(',')[1], 'base64'));
    console.log('wrote', file);
  }

  await page.goto(url + '/brand', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  mkdirSync(join(root, 'public/brand'), { recursive: true });
  for (const name of ['logo-on-brick', 'logo-on-dark', 'logo-on-cream']) {
    const file = join(root, 'public/brand', name + '.png');
    await page.locator(`[data-logo="${name}"]`).screenshot({ path: file });
    console.log('wrote', file);
  }
} finally {
  await browser.close();
}
