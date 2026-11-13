// The one fixed 3D stage behind the home page. It never scrolls. Every frame it
// reads where the page is (from the Scrollcraft acts) and poses the globe and
// the cans to match. The Scrollcraft engine itself is not touched.
//
// Acts it knows about:
//   arrive   globe sits beside the headline, drifting slowly
//   tension  globe dims and waits behind the lines
//   trip     the peak: globe turns, lands on each country, the can rises
//   close    globe shrinks into the "O" of the AROUND wordmark
import * as THREE from 'three';
import { lightScene } from './studio.js';
import { createGlobe } from './globe.js';
import { createCan, CAN_HEIGHT } from './can.js';
import { makeLabelCanvas } from './labels.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const mix = (a, b, t) => a + (b - a) * t;
const ramp = (x, a, b) => smooth((x - a) / (b - a));

// Each landing owns a slice of the trip act's pinned progress.
export const LANDINGS = [
  [0.04, 0.34],
  [0.35, 0.65],
  [0.66, 0.96],
];
const HERO_LON = -55; // the Atlantic view the logo shows
const FULL_CIRCLE_LON = 305; // same view, one lap later

export async function createWorld({ host, canvas, engine, els, drinks, data, base = '' }) {
  const html = document.documentElement;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const isStill = () => reduceMQ.matches || html.dataset.motion === 'off';

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null; // no WebGL: the page keeps its still posters
  }
  const scene = new THREE.Scene();
  lightScene(renderer, scene);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0.9, 9.5);
  camera.lookAt(0, 0.15, 0);

  const globe = createGlobe(data.globe);
  scene.add(globe.group);

  const cans = [];
  for (const drink of drinks) {
    const label = await makeLabelCanvas(drink, data, base);
    const can = createCan(new THREE.CanvasTexture(label));
    can.visible = false;
    scene.add(can);
    cans.push(can);
  }

  // ---- sizing ---------------------------------------------------------------
  let vw = 1, vh = 1, mobile = false;
  function resize() {
    vw = host.clientWidth || innerWidth;
    vh = host.clientHeight || innerHeight;
    mobile = vw < 860 || vw / vh < 0.9;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.75 : 2));
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    const pxPerUnit = (vh * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    globe.dotMaterial.uniforms.uProj.value = pxPerUnit;
  }

  // ---- poses ----------------------------------------------------------------
  // A pose is where the globe sits (x, y), how big it is (s), which point of the
  // Earth faces the camera (lat, lon) and how high on the globe that point rides
  // (e, in degrees above the line of sight).
  const poses = {
    hero: () => (mobile
      ? { x: 0, y: -1.55, s: 1.45, lat: 14, lon: HERO_LON, e: 12 }
      : { x: 2.15, y: 0.05, s: 1.95, lat: 14, lon: HERO_LON, e: 6 }),
    tension: () => (mobile
      ? { x: 0, y: -0.2, s: 1.75, lat: 18, lon: HERO_LON - 14, e: 8 }
      : { x: 0, y: -0.15, s: 2.7, lat: 18, lon: HERO_LON - 14, e: 8 }),
    trip: () => (mobile
      ? { x: 0, y: -2.95, s: 2.2, e: 62 }
      : { x: 0, y: -4.3, s: 3.3, e: 63 }),
  };
  const canScale = () => (mobile ? 1.3 : 1.9);

  // Place the globe exactly over a DOM element (the gap in the wordmark).
  const ndc = new THREE.Vector3();
  const dir = new THREE.Vector3();
  function worldAt(px, py) {
    ndc.set((px / vw) * 2 - 1, -(py / vh) * 2 + 1, 0.5).unproject(camera);
    dir.copy(ndc).sub(camera.position).normalize();
    const t = -camera.position.z / dir.z; // hit the z = 0 plane
    return new THREE.Vector3().copy(camera.position).addScaledVector(dir, t);
  }
  function poseOver(el) {
    const r = el.getBoundingClientRect();
    const c = worldAt(r.left + r.width / 2, r.top + r.height / 2);
    const edge = worldAt(r.left + r.width / 2 + r.height / 2, r.top + r.height / 2);
    return { x: c.x, y: c.y, s: c.distanceTo(edge), lat: 12, lon: FULL_CIRCLE_LON, e: 4 };
  }

  // ---- reading the page -----------------------------------------------------
  const actOf = (el) => engine.acts.find((a) => a.el === el);
  const A = { arrive: actOf(els.arrive), tension: actOf(els.tension), trip: actOf(els.trip), close: actOf(els.close) };

  function progress(a, y) {
    const travel = Math.max(a.height - innerHeight, 1);
    return {
      p: clamp01((y - a.top) / travel), // while pinned
      h: clamp01((y - (a.top + travel)) / innerHeight), // handing off to the next act
      pre: clamp01((a.top - y) / innerHeight), // 1 = a full screen before it pins
    };
  }

  // Globe longitude through the trip: turn, hold on the country, turn on.
  function tripLon(p) {
    const stops = [[0, HERO_LON - 14]];
    LANDINGS.forEach(([a, b], i) => {
      const len = b - a;
      stops.push([a + len * 0.3, drinks[i].lon], [a + len * 0.84, drinks[i].lon]);
    });
    stops.push([1, 190]);
    for (let i = 1; i < stops.length; i++) {
      if (p <= stops[i][0]) {
        return mix(stops[i - 1][1], stops[i][1], ramp(p, stops[i - 1][0], stops[i][0]));
      }
    }
    return stops[stops.length - 1][1];
  }
  function tripLat(p) {
    const stops = [[0, 18]];
    LANDINGS.forEach(([a, b], i) => {
      const len = b - a;
      stops.push([a + len * 0.3, drinks[i].lat], [a + len * 0.84, drinks[i].lat]);
    });
    stops.push([1, 20]);
    for (let i = 1; i < stops.length; i++) {
      if (p <= stops[i][0]) {
        return mix(stops[i - 1][1], stops[i][1], ramp(p, stops[i - 1][0], stops[i][0]));
      }
    }
    return 20;
  }

  // With motion off, the trip shows one settled still per landing.
  function settle(p) {
    for (const [a, b] of LANDINGS) {
      if (p >= a && p <= b) return a + (b - a) * 0.6;
    }
    return p < LANDINGS[0][0] ? 0 : p;
  }

  // ---- state ----------------------------------------------------------------
  // `cur` chases `target` a little each frame so a jumpy wheel still glides.
  const target = { x: 0, y: 0, s: 1, lat: 0, lon: 0, e: 0, dim: 1, rim: 0.55, lift: [0, 0, 0], spin: [0, 0, 0], hi: [0, 0, 0], opacity: 1, shift: 0 };
  const cur = JSON.parse(JSON.stringify(target));
  let snap = true; // first frame, and whenever the globe is glued to the DOM
  let visible = true;
  let t0 = performance.now();

  function setPose(p, into) { Object.assign(into, p); }
  function blend(a, b, t) {
    const out = {};
    for (const k of ['x', 'y', 's', 'lat', 'lon', 'e']) out[k] = mix(a[k], b[k], t);
    return out;
  }

  function read(now) {
    const y = scrollY;
    const still = isStill();
    const idle = still ? 0 : Math.sin((now - t0) / 5200) * 7; // slow sway, degrees
    target.lift = [0, 0, 0];
    target.hi = [0, 0, 0];
    target.shift = 0;
    target.rim = 0.55;
    snap = false;

    const arrive = progress(A.arrive, y);
    const tension = progress(A.tension, y);
    const trip = progress(A.trip, y);
    const close = progress(A.close, y);
    const tripStart = { ...poses.trip(), lat: 18, lon: HERO_LON - 14 };

    if (y < A.tension.top) {
      const hero = poses.hero();
      hero.lon += idle - arrive.p * 10;
      setPose(blend(hero, poses.tension(), smooth(arrive.h)), target);
      target.dim = mix(1, 0.3, smooth(arrive.h));
      target.opacity = 1;
    } else if (y < A.trip.top) {
      setPose(blend(poses.tension(), tripStart, smooth(tension.h)), target);
      target.dim = mix(0.3, 1, smooth(tension.h));
      target.opacity = 1;
    } else if (y < A.trip.top + A.trip.height) {
      const p = still ? settle(trip.p) : trip.p;
      setPose({ ...poses.trip(), lat: tripLat(p), lon: tripLon(p) }, target);
      target.dim = 1;
      LANDINGS.forEach(([a, b], i) => {
        const len = b - a;
        const local = (p - a) / len;
        target.lift[i] = ramp(local, 0.2, 0.46) * (1 - ramp(local, 0.82, 1.0));
        target.spin[i] = (clamp01(local) - 0.6) * Math.PI * 1.7; // front faces us at 60%
        target.hi[i] = ramp(local, 0.12, 0.3) * (1 - ramp(local, 0.84, 1.02));
      });
      // The stage scrolls away at the end of the act; the world goes with it.
      target.shift = trip.h;
      target.opacity = 1 - ramp(trip.h, 0.55, 1);
    } else if (close.pre < 1) {
      setPose(poseOver(els.gap), target);
      target.dim = 1;
      target.rim = 1.25; // a bright limb reads as the ring of the logo's O
      target.opacity = 1 - smooth(close.pre * 1.15);
      snap = true;
    } else {
      target.opacity = 0;
    }
    return still;
  }

  function step(still) {
    const k = still || snap ? 1 : 0.14;
    for (const key of ['x', 'y', 's', 'lat', 'lon', 'e', 'dim', 'rim']) cur[key] += (target[key] - cur[key]) * k;
    for (let i = 0; i < 3; i++) {
      cur.lift[i] += (target.lift[i] - cur.lift[i]) * k;
      cur.spin[i] += (target.spin[i] - cur.spin[i]) * k;
      cur.hi[i] += (target.hi[i] - cur.hi[i]) * k;
    }
    cur.opacity = target.opacity;
    cur.shift = target.shift;
  }

  const canvasColor = new THREE.Color();
  function apply() {
    globe.group.position.set(cur.x, cur.y, 0);
    globe.group.scale.setScalar(cur.s);
    globe.face(cur.lat, cur.lon, cur.e);
    globe.dotMaterial.uniforms.uScale.value = cur.s;
    globe.dotMaterial.uniforms.uOpacity.value = cur.dim;
    globe.dotMaterial.uniforms.uHi.value.set(cur.hi[0], cur.hi[1], cur.hi[2]);
    globe.bodyMaterial.uniforms.uRimStrength.value = cur.rim * mix(0.45, 1, cur.dim);

    // The planet's body follows the page ground as it drifts, a shade lighter.
    const ground = getComputedStyle(html).getPropertyValue('--sc-canvas').trim();
    if (ground) {
      try { canvasColor.set(ground); globe.bodyMaterial.uniforms.uBase.value.copy(canvasColor).offsetHSL(0, 0.02, 0.022); } catch (e) {}
    }

    const apex = cur.y + cur.s; // top of the globe
    const cs = canScale();
    const half = (CAN_HEIGHT * cs) / 2;
    cans.forEach((can, i) => {
      const lift = cur.lift[i];
      can.visible = lift > 0.002;
      if (!can.visible) return;
      can.scale.setScalar(cs);
      // hidden: wholly inside the globe, just under the top. shown: standing clear of it.
      can.position.set(0, mix(apex - half - 0.2, apex + half + 0.1, lift), 0);
      can.userData.spin.rotation.y = cur.spin[i];
      can.rotation.z = (1 - lift) * 0.05;
    });

    host.style.opacity = cur.opacity.toFixed(3);
    host.style.transform = cur.shift > 0.0005 ? `translate3d(0,${(-cur.shift * innerHeight).toFixed(1)}px,0)` : 'none';

    // A signature of what is on screen, so Scrollcraft's screenshot harness can
    // tell the stage is alive (it cannot see inside a canvas).
    host.dataset.scVerifyState = [
      cur.x.toFixed(2), cur.y.toFixed(2), cur.s.toFixed(2), cur.lon.toFixed(0), cur.dim.toFixed(1),
      cur.lift.map((v) => v.toFixed(1)).join(''), cur.spin.map((v) => v.toFixed(1)).join(','), cur.opacity.toFixed(1),
    ].join('|');
  }

  // ---- loop -----------------------------------------------------------------
  let raf = 0, dead = false;
  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const still = read(now);
    step(still);
    const show = cur.opacity > 0.004;
    if (!show && !visible) return; // off screen: cost nothing
    visible = show;
    apply();
    if (show) renderer.render(scene, camera);
  }

  // ---- stills of each can, for the range rail and for fallbacks ---------------
  function canStill(i, w = 560, h = 880) {
    const keepSize = renderer.getSize(new THREE.Vector2());
    const keepRatio = renderer.getPixelRatio();
    const keepCam = { aspect: camera.aspect, pos: camera.position.clone() };
    globe.group.visible = false;
    cans.forEach((c, j) => { c.visible = j === i; });
    const can = cans[i];
    can.scale.setScalar(1);
    can.position.set(0, 0, 0);
    can.rotation.z = 0;
    can.userData.spin.rotation.y = -0.38;
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 0.3, 3.75);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const url = canvas.toDataURL('image/png');
    renderer.setPixelRatio(keepRatio);
    renderer.setSize(keepSize.x, keepSize.y, false);
    camera.aspect = keepCam.aspect;
    camera.position.copy(keepCam.pos);
    camera.lookAt(0, 0.15, 0);
    camera.updateProjectionMatrix();
    globe.group.visible = true;
    return url;
  }

  resize();
  const stills = drinks.map((_, i) => canStill(i));
  cans.forEach((c) => { c.visible = false; });
  addEventListener('resize', resize, { passive: true });
  raf = requestAnimationFrame(frame);

  return {
    stills,
    canStill,
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      renderer.dispose();
    },
  };
}
