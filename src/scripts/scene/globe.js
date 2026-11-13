// The dot-matrix globe: the "O" from the Ar0und logo, made of the same dots as
// the country maps printed on the cans. Radius 1; scale the group to size it.
import * as THREE from 'three';

const RAD = Math.PI / 180;

export function latLonToVec3(lat, lon, r = 1) {
  const la = lat * RAD, lo = lon * RAD;
  return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
}

export function createGlobe(dots) {
  const group = new THREE.Group();
  const n = dots.length / 3;
  const positions = new Float32Array(n * 3);
  const tags = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = latLonToVec3(dots[i * 3] / 100, dots[i * 3 + 1] / 100);
    positions.set([v.x, v.y, v.z], i * 3);
    tags[i] = dots[i * 3 + 2];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('tag', new THREE.BufferAttribute(tags, 1));

  const dotMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color('#f4ede0') },
      uHiColor: { value: new THREE.Color('#ff8a5c') },
      uHi: { value: new THREE.Vector3(0, 0, 0) }, // highlight for tags 1, 2, 3
      uOpacity: { value: 1 },
      uDot: { value: 0.0125 }, // dot diameter in globe radii
      uProj: { value: 1000 }, // pixels per world unit at distance 1
      uScale: { value: 1 }, // the group's world scale
    },
    vertexShader: /* glsl */ `
      attribute float tag;
      uniform vec3 uHi;
      uniform float uDot, uProj, uScale;
      varying float vFacing;
      varying float vHi;
      varying float vCountry;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normalize(position));
        vFacing = dot(n, normalize(-mv.xyz));
        vCountry = step(0.5, tag);
        vHi = tag < 0.5 ? 0.0 : (tag < 1.5 ? uHi.x : (tag < 2.5 ? uHi.y : uHi.z));
        // Country dots are packed twice as tightly, so they are drawn smaller.
        float size = mix(1.0, 0.56, vCountry) * (1.0 + vHi * 0.3);
        gl_PointSize = max(1.0, uDot * size * uScale * uProj / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor, uHiColor;
      uniform float uOpacity;
      varying float vFacing;
      varying float vHi;
      varying float vCountry;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float edge = smoothstep(0.5, 0.36, d);
        float limb = smoothstep(0.02, 0.42, vFacing); // fade toward the silhouette
        float rest = mix(0.82, 0.5, vCountry); // an unlit country sits back
        float a = edge * limb * mix(rest, 1.0, vHi) * uOpacity;
        gl_FragColor = vec4(mix(uColor, uHiColor, vHi), a);
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geo, dotMaterial);
  points.renderOrder = 2;
  group.add(points);

  // The body of the planet. Opaque so it hides the far side of the dots and
  // anything inside it (the cans wait in there), with a soft lit rim.
  const bodyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: new THREE.Color('#1b1210') },
      uRim: { value: new THREE.Color('#8a4a37') },
      uRimPower: { value: 2.6 },
      uRimStrength: { value: 0.55 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase, uRim;
      uniform float uRimPower, uRimStrength;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), uRimPower);
        // light the upper-left limb a little more, like one warm key light
        float key = 0.6 + 0.4 * max(dot(normalize(vN), normalize(vec3(-0.5, 0.7, 0.5))), 0.0);
        gl_FragColor = vec4(mix(uBase, uRim, f * uRimStrength * key), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.992, 96, 64), bodyMaterial);
  body.renderOrder = 1;
  group.add(body);

  return {
    group,
    dotMaterial,
    bodyMaterial,
    // Turn the globe so (lat, lon) faces the camera at elevation `e` degrees
    // above the globe's equator line of sight, keeping north upright.
    face(lat, lon, e) {
      group.rotation.set((lat - e) * RAD, -lon * RAD, 0, 'XYZ');
    },
  };
}
