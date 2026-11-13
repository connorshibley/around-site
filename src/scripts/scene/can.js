// A drinks can, modelled rather than faked with a cylinder: domed base, stand
// ring, straight wall, tapered shoulder, rolled rim, recessed lid and pull-tab.
// Proportions follow the tall cans in Connor's posters (height about 2.35x the
// diameter). The can is 1.6 units tall and centred on its own origin.
import * as THREE from 'three';

export const CAN_HEIGHT = 1.6;
const R = 0.34; // wall radius
const Y_WALL = 0.11; // where the printed wall starts
const Y_SHOULDER = 1.36;
const Y_NECK = 1.5;
const SEG = 96;

const v2 = (x, y) => new THREE.Vector2(x, y);

function lathe(points, material) {
  const geo = new THREE.LatheGeometry(points, SEG);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

export function createCan(labelTexture) {
  const group = new THREE.Group();

  const aluminium = new THREE.MeshStandardMaterial({
    color: 0xd8d6d2,
    metalness: 1,
    roughness: 0.27,
  });

  labelTexture.colorSpace = THREE.SRGBColorSpace;
  labelTexture.wrapS = THREE.RepeatWrapping;
  labelTexture.anisotropy = 8;
  const printed = new THREE.MeshPhysicalMaterial({
    map: labelTexture,
    metalness: 0.08,
    roughness: 0.5,
    clearcoat: 0.35,
    clearcoatRoughness: 0.42,
  });

  // Printed wall and shoulder. The profile is sampled finely along the shoulder
  // curve so the taper is smooth, then v is rewritten from height so the label
  // is not stretched by the uneven point spacing.
  const wall = [v2(R, Y_WALL), v2(R, 0.5), v2(R, 0.9), v2(R, Y_SHOULDER)];
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ease = 1 - Math.cos((t * Math.PI) / 2); // slow start, the way a real shoulder turns in
    wall.push(v2(R - (R - 0.283) * ease, Y_SHOULDER + (Y_NECK - Y_SHOULDER) * t));
  }
  const body = lathe(wall, printed);
  const pos = body.geometry.attributes.position;
  const uv = body.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setY(i, (pos.getY(i) - Y_WALL) / (Y_NECK - Y_WALL));
  }
  uv.needsUpdate = true;
  body.rotation.y = Math.PI; // put u = 0.5 (the front panel) toward +z
  group.add(body);

  // Base: concave dome, stand ring, chamfer up to the wall.
  group.add(
    lathe(
      [
        v2(0, 0.052), v2(0.1, 0.048), v2(0.19, 0.03), v2(0.235, 0.008),
        v2(0.252, 0), v2(0.268, 0.004), v2(0.3, 0.035), v2(0.328, 0.075), v2(R, Y_WALL),
      ],
      aluminium
    )
  );

  // Neck, rolled rim, and the recessed lid.
  group.add(
    lathe(
      [
        v2(0.283, Y_NECK), v2(0.285, 1.515), v2(0.292, 1.53), v2(0.294, 1.545),
        v2(0.289, 1.557), v2(0.279, 1.56), v2(0.27, 1.553), v2(0.266, 1.538),
        v2(0.262, 1.522), v2(0.2, 1.519), v2(0, 1.519),
      ],
      aluminium
    )
  );

  // Pull-tab: a rounded plate with a finger hole, plus the rivet.
  const tab = new THREE.Shape();
  const tw = 0.1, tl = 0.2, tr = 0.045;
  tab.moveTo(-tw / 2 + tr, 0);
  tab.lineTo(tw / 2 - tr, 0);
  tab.quadraticCurveTo(tw / 2, 0, tw / 2, tr);
  tab.lineTo(tw / 2, tl - tr);
  tab.quadraticCurveTo(tw / 2, tl, tw / 2 - tr, tl);
  tab.lineTo(-tw / 2 + tr, tl);
  tab.quadraticCurveTo(-tw / 2, tl, -tw / 2, tl - tr);
  tab.lineTo(-tw / 2, tr);
  tab.quadraticCurveTo(-tw / 2, 0, -tw / 2 + tr, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, tl * 0.68, tw * 0.27, tl * 0.19, 0, Math.PI * 2, true);
  tab.holes.push(hole);
  const tabMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(tab, { depth: 0.008, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2 }),
    aluminium
  );
  tabMesh.rotation.x = -Math.PI / 2;
  tabMesh.position.set(0, 1.53, 0.03);
  group.add(tabMesh);
  const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.014, 24), aluminium);
  rivet.position.set(0, 1.535, 0.0);
  group.add(rivet);

  // Centre the can on its origin so it spins and scales about its middle.
  group.children.forEach((m) => { m.position.y -= CAN_HEIGHT / 2; });

  const root = new THREE.Group();
  root.add(group);
  root.userData.spin = group; // rotate this for the label spin
  return root;
}
