// A single can you can turn by hand, for the drink pages. Drag it, or focus it
// and use the arrow keys. It drifts slowly on its own unless motion is off.
import * as THREE from 'three';
import { lightScene } from './studio.js';
import { createCan } from './can.js';
import { makeLabelCanvas } from './labels.js';

export async function mountViewer({ host, canvas, drink, data, base = '' }) {
  const html = document.documentElement;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const isStill = () => reduceMQ.matches || html.dataset.motion === 'off';

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    return null; // the still image underneath stays
  }
  const scene = new THREE.Scene();
  lightScene(renderer, scene);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
  camera.position.set(0, 0.28, 4.35);
  camera.lookAt(0, 0, 0);

  const can = createCan(new THREE.CanvasTexture(await makeLabelCanvas(drink, data, base)));
  scene.add(can);
  const spin = can.userData.spin;
  spin.rotation.y = -0.38;

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  }

  let dirty = true;
  let dragging = false;
  let lastX = 0;
  let velocity = 0; // radians per frame, decays after a throw
  let touched = false; // once the visitor has turned it, stop drifting

  host.addEventListener('pointerdown', (e) => {
    dragging = true;
    touched = true;
    lastX = e.clientX;
    velocity = 0;
    host.classList.add('is-dragging');
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    velocity = dx * 0.011;
    spin.rotation.y += velocity;
    dirty = true;
  }, { passive: true });
  const release = () => { dragging = false; host.classList.remove('is-dragging'); };
  addEventListener('pointerup', release, { passive: true });
  addEventListener('pointercancel', release, { passive: true });

  host.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    touched = true;
    spin.rotation.y += e.key === 'ArrowLeft' ? -0.3 : 0.3;
    dirty = true;
  });

  let onScreen = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { onScreen = entries[0].isIntersecting; }).observe(host);
  }

  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden || !onScreen) return;
    if (!dragging) {
      if (Math.abs(velocity) > 0.0004) {
        spin.rotation.y += velocity;
        velocity *= 0.94;
        dirty = true;
      } else if (!touched && !isStill()) {
        spin.rotation.y += 0.0032;
        dirty = true;
      }
    }
    if (!dirty) return;
    dirty = false;
    renderer.render(scene, camera);
  }

  resize();
  addEventListener('resize', resize, { passive: true });
  renderer.render(scene, camera);
  host.classList.add('is-live');
  requestAnimationFrame(frame);
  return { renderer };
}
