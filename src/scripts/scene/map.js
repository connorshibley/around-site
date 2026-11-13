// The region map: the dot globe on its own, turned by hand, with a pin on each
// country that has a drink. Picking a stop swings that country to the front.
import * as THREE from 'three';
import { createGlobe, latLonToVec3 } from './globe.js';

const FILL = 0.94; // how much of the box the globe fills (matches the still image)
const MAX_LAT = 55;
const START = { lat: 15, lon: -55 }; // the view the still image shows

export function mountMap({ host, canvas, stops, dots, onPick }) {
  const html = document.documentElement;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const isStill = () => reduceMQ.matches || html.dataset.motion === 'off';

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    return null; // the still globe underneath stays, and the list still works
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
  const globe = createGlobe(dots);
  scene.add(globe.group);

  // Each stop: where it is on the globe, its pin, and which highlight slot
  // (tag 1, 2, 3 in the dot data) lights its country.
  const pins = stops.map((s) => ({
    ...s,
    local: latLonToVec3(s.lat, s.lon, 1.0),
    // The country rides a little above centre so the globe stays upright.
    view: { lat: s.lat * 0.6, lon: s.lon },
    el: host.querySelector(`[data-pin="${s.key}"]`),
  }));

  const view = { ...START };
  let goal = null; // where the view is heading after a pick
  let selected = null;
  const hi = [0, 0, 0];
  let w = 1, h = 1, degPerPx = 0.2;
  let dirty = true;

  function resize() {
    w = host.clientWidth;
    h = host.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    // Sit the camera back far enough that the globe's outline fills the box.
    const limit = Math.min(1, camera.aspect) * t * FILL;
    camera.position.set(0, 0, 1 / Math.sin(Math.atan(limit)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    globe.dotMaterial.uniforms.uProj.value = (h * renderer.getPixelRatio()) / (2 * t);
    // Dragging by one globe radius turns it about one radian.
    degPerPx = 114.6 / (FILL * Math.min(w, h));
    dirty = true;
  }

  // ---- picking a stop ---------------------------------------------------------
  function select(key, { instant = false } = {}) {
    const pin = pins.find((p) => p.key === key);
    if (!pin) return;
    selected = pin;
    velLon = velLat = 0;
    if (instant || isStill()) {
      view.lat = pin.view.lat;
      view.lon = pin.view.lon;
      goal = null;
    } else {
      goal = pin.view;
    }
    for (const p of pins) if (p.el) p.el.classList.toggle('is-on', p === pin);
    dirty = true;
  }

  // ---- turning by hand --------------------------------------------------------
  let dragging = false, moved = 0, lastX = 0, lastY = 0, velLon = 0, velLat = 0;
  const clampLat = (v) => Math.max(-MAX_LAT, Math.min(MAX_LAT, v));
  function turn(dLon, dLat) {
    view.lon -= dLon;
    view.lat = clampLat(view.lat + dLat);
    dirty = true;
  }
  host.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    velLon = velLat = 0;
    goal = null;
    host.classList.add('is-dragging');
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    velLon = dx * degPerPx;
    velLat = dy * degPerPx;
    turn(velLon, velLat);
  }, { passive: true });
  const release = () => {
    dragging = false;
    host.classList.remove('is-dragging');
  };
  addEventListener('pointerup', release, { passive: true });
  addEventListener('pointercancel', release, { passive: true });

  host.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] }[e.key];
    if (!step || e.target !== host) return;
    e.preventDefault();
    goal = null;
    turn(step[0], step[1]);
  });

  // A pin is a real button, but a drag that happens to end on one is not a pick.
  for (const p of pins) {
    if (!p.el) continue;
    p.el.addEventListener('click', () => {
      if (moved > 6) return;
      select(p.key);
      if (onPick) onPick(p.key);
    });
  }

  // ---- the frame --------------------------------------------------------------
  const world = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  function placePins() {
    for (const p of pins) {
      if (!p.el) continue;
      world.copy(p.local).applyEuler(globe.group.rotation);
      const facing = toCam.copy(camera.position).sub(world).normalize().dot(world);
      world.project(camera);
      const x = (world.x * 0.5 + 0.5) * w, y = (-world.y * 0.5 + 0.5) * h;
      p.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      p.el.classList.toggle('is-behind', facing < 0.1);
    }
  }

  let onScreen = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { onScreen = entries[0].isIntersecting; }).observe(host);
  }

  // Easing is measured in time, not frames, so a slow device takes the same
  // second or so to swing round as a fast one. `ease(k)` is the share of the
  // remaining distance to cover this frame, where k is the share at 60fps.
  let last = performance.now();
  let dt60 = 1;
  const ease = (k) => 1 - Math.pow(1 - k, dt60);

  function frame(now) {
    requestAnimationFrame(frame);
    dt60 = Math.min(6, Math.max(0.1, (now - last) / 16.667));
    last = now;
    if (document.hidden || !onScreen) return;
    if (!dragging) {
      if (goal) {
        // Go the short way round.
        const dLon = ((goal.lon - view.lon + 540) % 360) - 180;
        const dLat = goal.lat - view.lat;
        if (Math.abs(dLon) < 0.05 && Math.abs(dLat) < 0.05) {
          view.lon = goal.lon;
          view.lat = goal.lat;
          goal = null;
        } else {
          view.lon += dLon * ease(0.085);
          view.lat += dLat * ease(0.085);
        }
        dirty = true;
      } else if (Math.abs(velLon) > 0.02 || Math.abs(velLat) > 0.02) {
        if (isStill()) velLon = velLat = 0;
        turn(velLon * dt60, velLat * dt60);
        velLon *= Math.pow(0.93, dt60);
        velLat *= Math.pow(0.93, dt60);
      }
    }
    // The picked country lights up; the others sit back.
    pins.forEach((p) => {
      const to = p === selected ? 1 : 0;
      const slot = p.tag - 1;
      if (Math.abs(hi[slot] - to) > 0.004) {
        hi[slot] = isStill() ? to : hi[slot] + (to - hi[slot]) * ease(0.12);
        dirty = true;
      } else {
        hi[slot] = to;
      }
    });
    if (!dirty) return;
    dirty = false;
    globe.face(view.lat, view.lon, 0);
    globe.dotMaterial.uniforms.uHi.value.set(hi[0], hi[1], hi[2]);
    renderer.render(scene, camera);
    placePins();
  }

  resize();
  // The box can change size without the window doing so (fonts landing, the
  // layout switching to one column), so watch the box itself.
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(host);
  else addEventListener('resize', resize, { passive: true });
  globe.face(view.lat, view.lon, 0);
  renderer.render(scene, camera);
  placePins();
  host.classList.add('is-live');
  requestAnimationFrame(frame);

  return { select };
}
