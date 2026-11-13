// The lighting every Ar0und 3D view shares, so a can looks the same on the
// home page as it does on its own page: a soft studio reflection for the
// aluminium, one warm key light and a warmer rim.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function lightScene(renderer, scene) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral keeps the label colours true; filmic curves wash the brick out to pink.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffe9d6, 1.7);
  key.position.set(3.5, 4.5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb48a, 1.3);
  rim.position.set(-5, 2.5, -3);
  scene.add(rim);
}
