import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { addBox, sculpt } from "./world-assets";
import { worldPalette } from "./palette";

type Vec3 = [number, number, number];

function mergeStaticBoxes(
  parent: THREE.Object3D,
  size: [number, number, number],
  positions: Vec3[],
  material: THREE.Material,
) {
  if (positions.length < 2) return addBox(parent, size, positions[0] ?? [0, 0, 0], material);
  const geometries = positions.map(([x, y, z]) => {
    const geometry = new THREE.BoxGeometry(...size);
    geometry.translate(x, y, z);
    return geometry;
  });
  const merged = mergeGeometries(geometries, false);
  geometries.forEach(geometry => geometry.dispose());
  if (!merged) return addBox(parent, size, positions[0], material);
  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Low, sparse garden pieces keep the six project exhibits in clear view. */
export function buildLandscape(scene: THREE.Scene) {
  const ink = new THREE.MeshStandardMaterial({ color: worldPalette.slateDeep, roughness: 0.92 });
  const stone = new THREE.MeshStandardMaterial({ color: worldPalette.stone, roughness: 0.94 });
  const chalk = new THREE.MeshStandardMaterial({ color: worldPalette.stoneLight, roughness: 0.88 });
  const cobalt = new THREE.MeshStandardMaterial({ color: worldPalette.cobalt, roughness: 0.78 });
  const cobaltLight = new THREE.MeshStandardMaterial({ color: worldPalette.cobaltLight, roughness: 0.76 });
  const sage = new THREE.MeshStandardMaterial({ color: worldPalette.sageLight, roughness: 0.96 });
  const brass = new THREE.MeshStandardMaterial({ color: worldPalette.brass, metalness: 0.42, roughness: 0.46 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: worldPalette.stoneLight,
    transparent: true,
    opacity: 0.18,
    roughness: 0.2,
    transmission: 0.16,
    side: THREE.DoubleSide,
  });
  const water = new THREE.MeshStandardMaterial({ color: "#8eaeb7", metalness: 0.08, roughness: 0.34 });

  const plants: THREE.Group[] = [];
  const chimes: THREE.Group[] = [];
  const ripples: THREE.Mesh[] = [];
  const interactables: THREE.Object3D[] = [];
  const beaconPetals: THREE.Group[] = [];
  const beaconRings: THREE.Mesh[] = [];
  const plantWorldPosition = new THREE.Vector3();

  const courtyard = new THREE.Group();
  courtyard.name = "atelier-courtyard";
  scene.add(courtyard);
  addBox(courtyard, [7.8, 0.12, 9.2], [0, 0.03, 4.2], stone);
  addBox(courtyard, [7.25, 0.055, 8.65], [0, 0.115, 4.2], chalk);
  mergeStaticBoxes(courtyard, [0.045, 0.025, 6.9], [-2.8, 2.8].map(x => [x, 0.158, 4.2] as Vec3), cobaltLight);
  addBox(courtyard, [0.58, 0.035, 0.09], [0, 0.16, 0.1], cobalt);

  const addSpecimenCase = (x: number, z: number, mirror = false) => {
    const display = new THREE.Group();
    display.position.set(x, 0, z);
    display.name = `greenhouse-shell-${x}-${z}`;
    scene.add(display);
    addBox(display, [2.8, 0.18, 1.55], [0, 0.18, 0], stone);
    addBox(display, [2.45, 0.07, 1.2], [0, 0.305, 0], chalk);
    for (const [px, pz] of [[-1.05, -0.5], [1.05, -0.5], [-1.05, 0.5], [1.05, 0.5]] as const) {
      sculpt(display, new THREE.BoxGeometry(0.045, 1.05, 0.045), cobaltLight, [px, 0.86, pz]);
    }
    addBox(display, [2.14, 0.045, 0.045], [0, 1.39, -0.5], cobaltLight);
    addBox(display, [2.14, 0.045, 0.045], [0, 1.39, 0.5], cobaltLight);
    addBox(display, [0.045, 1.0, 1.0], [-1.05, 0.86, 0], glass);
    addBox(display, [0.045, 1.0, 1.0], [1.05, 0.86, 0], glass);
    const specimen = new THREE.Group();
    specimen.position.set(mirror ? -0.12 : 0.12, 0.36, 0);
    display.add(specimen);
    sculpt(specimen, new THREE.CylinderGeometry(0.035, 0.05, 0.65, 7), sage, [0, 0.34, 0]);
    const leaf = sculpt(specimen, new THREE.SphereGeometry(0.22, 10, 7), sage, [mirror ? 0.12 : -0.12, 0.62, 0], [1.4, 0.45, 0.7]);
    leaf.rotation.z = mirror ? -0.36 : 0.36;
    plants.push(specimen);
    display.userData.gardenAction = "greenhouse";
    interactables.push(display);
  };
  addSpecimenCase(-17.7, -1.2);
  addSpecimenCase(17.7, 12.5, true);

  const basin = new THREE.Group();
  basin.position.set(-6.7, 0, 1.8);
  basin.name = "rooftop-cistern";
  scene.add(basin);
  sculpt(basin, new THREE.BoxGeometry(3.25, 0.2, 1.35), stone, [0, 0.12, 0]);
  sculpt(basin, new THREE.BoxGeometry(2.82, 0.07, 0.96), water, [0, 0.245, 0]);
  for (let i = 0; i < 2; i += 1) {
    const ripple = sculpt(
      basin,
      new THREE.RingGeometry(0.28 + i * 0.2, 0.32 + i * 0.2, 24),
      new THREE.MeshBasicMaterial({ color: worldPalette.stoneLight, transparent: true, opacity: 0.26, side: THREE.DoubleSide }),
      [-0.42 + i * 0.7, 0.29, 0.04],
    );
    ripple.rotation.x = -Math.PI / 2;
    ripples.push(ripple);
  }
  basin.userData.gardenAction = "water";
  interactables.push(basin);

  const addChime = (x: number, z: number, mirror = false) => {
    const chime = new THREE.Group();
    chime.position.set(x, 0, z);
    chime.name = "courtyard-chime";
    scene.add(chime);
    sculpt(chime, new THREE.CylinderGeometry(0.58, 0.68, 0.18, 12), stone, [0, 0.12, 0]);
    const bell = sculpt(chime, new THREE.CylinderGeometry(0.15, 0.42, 0.72, 10), mirror ? cobalt : ink, [0, 0.63, 0]);
    bell.rotation.x = Math.PI;
    sculpt(chime, new THREE.SphereGeometry(0.12, 10, 8), brass, [0, 0.98, 0]);
    sculpt(chime, new THREE.TorusGeometry(0.24, 0.035, 7, 20), cobaltLight, [0, 0.61, 0]).rotation.x = Math.PI / 2;
    chimes.push(chime);
    chime.userData.gardenAction = "chime";
    interactables.push(chime);
  };
  addChime(-9.8, -2.4);
  addChime(9.8, 11.8, true);

  const beacon = new THREE.Group();
  beacon.name = "botanical-invention-beacon";
  beacon.position.set(0, 0, 2.35);
  scene.add(beacon);
  sculpt(beacon, new THREE.CylinderGeometry(0.9, 1.02, 0.18, 12), stone, [0, 0.12, 0]);
  sculpt(beacon, new THREE.CylinderGeometry(0.68, 0.76, 0.09, 12), chalk, [0, 0.255, 0]);
  const baseRing = sculpt(beacon, new THREE.TorusGeometry(0.62, 0.03, 7, 32), cobalt, [0, 0.32, 0]);
  baseRing.rotation.x = Math.PI / 2;
  const beaconGlass = new THREE.MeshStandardMaterial({ color: worldPalette.cobaltLight, emissive: worldPalette.cobalt, emissiveIntensity: 0.32, roughness: 0.3 });
  const beaconGlow = new THREE.MeshStandardMaterial({ color: worldPalette.cobaltLight, emissive: worldPalette.cobaltLight, emissiveIntensity: 0.48, roughness: 0.34 });
  const core = sculpt(beacon, new THREE.IcosahedronGeometry(0.3, 1), beaconGlass, [0, 1.25, 0], [1, 1.12, 1]);
  const coreHalo = sculpt(beacon, new THREE.TorusGeometry(0.5, 0.025, 7, 32), beaconGlow, [0, 1.25, 0]);
  coreHalo.rotation.x = Math.PI / 2;
  const orbit = sculpt(beacon, new THREE.TorusGeometry(0.72, 0.025, 7, 36), cobalt, [0, 1.25, 0]);
  orbit.rotation.set(0.72, 0.2, 0.18);
  beaconRings.push(coreHalo, orbit);
  for (let i = 0; i < 4; i += 1) {
    const petal = new THREE.Group();
    petal.position.y = 1.23;
    petal.rotation.y = i * Math.PI / 2;
    beacon.add(petal);
    sculpt(petal, new THREE.SphereGeometry(0.18, 9, 7), i % 2 ? cobaltLight : chalk, [0.55, 0, 0], [1.45, 0.3, 0.55]);
    beaconPetals.push(petal);
  }
  beacon.userData.gardenAction = "beacon";
  interactables.push(beacon);

  const bench = new THREE.Group();
  bench.position.set(17.3, 0, -3.2);
  bench.name = "maker-workbench";
  scene.add(bench);
  addBox(bench, [1.9, 0.16, 0.72], [0, 0.76, 0], stone);
  mergeStaticBoxes(bench, [0.11, 0.68, 0.11], [[-0.68, 0.34, 0], [0.68, 0.34, 0]], ink);
  addBox(bench, [1.36, 0.05, 0.08], [0, 0.87, 0.25], cobalt);
  sculpt(bench, new THREE.OctahedronGeometry(0.2, 0), cobaltLight, [0.44, 1.05, -0.08]);
  bench.userData.gardenAction = "workbench";
  interactables.push(bench);

  let energy = 0;
  let completion = 0;
  return {
    interactables,
    wake: () => { energy = 1; },
    update(dt: number, time: number, reduced: boolean, playerX: number, playerZ: number, completed = 0) {
      energy = Math.max(0, energy - dt * 0.23);
      const targetCompletion = THREE.MathUtils.clamp(completed, 0, 6) / 6;
      completion = THREE.MathUtils.damp(completion, targetCompletion, reduced ? 100 : 2.2, dt);
      const activation = completion + energy * 0.85;
      beacon.rotation.y = reduced ? 0 : time * 0.12;
      beaconRings[0].rotation.z = reduced ? 0 : time * (0.55 + activation * 0.9);
      beaconRings[1].rotation.x = 0.72 + (reduced ? 0 : Math.sin(time * 0.8) * 0.12);
      beaconRings[1].rotation.y = 0.2 + (reduced ? 0 : time * 0.32);
      beaconPetals.forEach((petal, i) => {
        const open = 0.12 + activation * 0.2;
        petal.rotation.z = reduced ? open : open + Math.sin(time * 0.9 + i * 0.7) * 0.035;
      });
      core.position.y = 1.25 + (reduced ? 0 : Math.sin(time * 1.2) * 0.035 + activation * 0.04);
      core.scale.setScalar(0.92 + activation * 0.12);
      beaconGlass.emissiveIntensity = 0.26 + activation * 0.52;
      beaconGlow.emissiveIntensity = 0.38 + activation * 0.6;
      chimes.forEach((chime, i) => {
        chime.rotation.z = reduced ? 0 : Math.sin(time * (0.9 + energy * 2.2) + i) * (0.02 + energy * 0.16);
      });
      plants.forEach((plant, i) => {
        plant.getWorldPosition(plantWorldPosition);
        const near = Math.max(0, 1 - Math.hypot(playerX - plantWorldPosition.x, playerZ - plantWorldPosition.z) / 4);
        plant.scale.setScalar(1 + (reduced ? 0 : energy * 0.04 + near * 0.025));
        plant.rotation.z = reduced ? 0 : Math.sin(time * 0.65 + i) * (0.012 + near * 0.018);
      });
      ripples.forEach((ripple, i) => {
        ripple.scale.setScalar(reduced ? 1 : 0.72 + ((time * 0.2 + i / 2) % 1) * 1.25);
      });
    },
  };
}
