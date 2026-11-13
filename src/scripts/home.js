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

// 3. Keyboard focus. Inside a pinned act the browser cannot scroll a link into
// view by itself: the stage is already on screen, but the words holding the
// link may be faded out, or parked off to the side on the rail. When focus
// lands on something like that, move the page to the point in the act where it
// shows.
function reveal(target) {
  const act = target.closest('[data-sc-act]');
  if (!act || getComputedStyle(act.querySelector('[data-sc-stage]') || act).position !== 'sticky') return;
  const top = act.getBoundingClientRect().top + scrollY;
  const travel = act.offsetHeight - innerHeight;
  if (travel <= 0) return;
  let at = null;
  const cue = target.closest('[data-sc-cue]');
  const rail = target.closest('[data-sc-pan]');
  if (cue && parseFloat(getComputedStyle(cue).opacity) < 0.9) {
    const [from, to = 1] = cue.dataset.scCue.trim().split(/\s+/).map(Number);
    at = (from + to) / 2;
  } else if (rail) {
    const box = target.getBoundingClientRect();
    if (box.left < 0 || box.right > innerWidth) {
      const item = target.closest('[data-sc-pan] > *') || target;
      const railBox = rail.getBoundingClientRect();
      const centre = item.getBoundingClientRect().left - railBox.left + item.offsetWidth / 2;
      at = Math.max(0, Math.min(1, (centre - innerWidth / 2) / Math.max(1, rail.scrollWidth - innerWidth)));
    }
  }
  if (at === null) return;
  // The browser may have nudged the clipped stage sideways trying to help.
  act.querySelectorAll('[data-sc-stage]').forEach((s) => { s.scrollLeft = 0; });
  scrollTo({ top: top + travel * at, behavior: 'instant' });
}
document.addEventListener('focusin', (e) => {
  if (e.target instanceof Element && e.target.matches(':focus-visible')) reveal(e.target);
});

if (document.readyState === 'complete') startWorld();
else addEventListener('load', startWorld, { once: true });
