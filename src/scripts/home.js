// Home page wiring. The words and layout work without any of this; it adds the
// scroll choreography (Scrollcraft) and then the live 3D stage on top.
import { drinks } from '../data/drinks.js';

const html = document.documentElement;
const base = (html.dataset.base || '').replace(/\/$/, '');

// 1. Scroll choreography first: it is small and the copy depends on it.
const engine = window.ScrollCraft ? window.ScrollCraft.mount(document) : null;

// 2. The 3D stage. Loaded after first paint so the headline never waits on it.
async function startWorld() {
  const host = document.querySelector('[data-world]');
  if (!host || !engine) return;
  const els = {
    arrive: document.getElementById('arrive'),
    tension: document.getElementById('tension'),
    trip: document.getElementById('trip'),
    close: document.getElementById('close'),
    gap: document.querySelector('[data-globe-gap]'),
  };
  try {
    const [{ createWorld }, data] = await Promise.all([
      import('./scene/stage.js'),
      import('../data/globe-dots.json').then((m) => m.default),
    ]);
    const world = await createWorld({ host, canvas: host.querySelector('canvas'), engine, els, drinks, data, base });
    if (!world) throw new Error('WebGL unavailable');
    world.stills.forEach((url, i) => {
      document.querySelectorAll(`[data-can-still="${drinks[i].key}"]`).forEach((img) => { img.src = url; });
    });
    html.classList.add('world-ready');
    window.__around = { world, engine };
  } catch (err) {
    html.classList.add('no-world');
    console.warn('[around] 3D stage did not start; showing stills instead.', err);
  }
}

if (document.readyState === 'complete') startWorld();
else addEventListener('load', startWorld, { once: true });
