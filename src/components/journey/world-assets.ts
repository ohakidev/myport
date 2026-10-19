import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Project } from "@/lib/github";
import { worldPalette } from "./palette";

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
) {
  const key = size.join("|");
  // Scope the cache to the current scene/root. world.tsx disposes every
  // geometry on unmount, so a module-global cache would retain disposed GPU
  // buffers on the next visit.
  let root = parent;
  while (root.parent) root = root.parent;
  const cache = (root.userData.boxGeometryCache ??= new Map<string, THREE.BoxGeometry>()) as Map<string, THREE.BoxGeometry>;
  let geometry = cache.get(key);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(...size);
    cache.set(key, geometry);
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sculpt(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function mergeStationBoxes(group: THREE.Group, projectIndex: number) {
  const boxes = group.children.filter(
    (child): child is THREE.Mesh => child instanceof THREE.Mesh && child.geometry.type === "BoxGeometry",
  );
  if (!boxes.length) return;

  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  boxes.forEach(box => {
    box.updateMatrix();
    const transformed = box.geometry.clone().applyMatrix4(box.matrix);
    const material = Array.isArray(box.material) ? box.material[0] : box.material;
    const geometries = byMaterial.get(material) ?? [];
    geometries.push(transformed);
    byMaterial.set(material, geometries);
    group.remove(box);
  });

  byMaterial.forEach((geometries, material) => {
    const merged = mergeGeometries(geometries, false);
    if (!merged) {
      // BoxGeometry attributes are compatible today; retain a safe fallback
      // if Three changes that helper's assumptions in a future upgrade.
      geometries.forEach(geometry => {
        const fallback = new THREE.Mesh(geometry, material);
        fallback.castShadow = true;
        fallback.receiveShadow = true;
        fallback.userData.projectIndex = projectIndex;
        group.add(fallback);
      });
      return;
    }
    geometries.forEach(geometry => geometry.dispose());
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.projectIndex = projectIndex;
    mesh.userData.staticBatch = true;
    group.add(mesh);
  });

  // addBox caches its source cubes on the station root. They are no longer
  // referenced after this pass, so dispose them before dropping the cache.
  const cache = group.userData.boxGeometryCache as Map<string, THREE.BoxGeometry> | undefined;
  cache?.forEach(geometry => geometry.dispose());
  delete group.userData.boxGeometryCache;
}

function makeLabel(title: string, subtitle: string, accent: string, width = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 320;
  const context = canvas.getContext("2d")!;
  context.fillStyle = worldPalette.slateDeep;
  context.fillRect(18, 18, width - 36, 284);
  context.strokeStyle = accent;
  context.lineWidth = 6;
  context.strokeRect(38, 38, width - 76, 226);
  context.fillStyle = accent;
  context.font = "700 38px monospace";
  context.textAlign = "left";
  context.fillText(subtitle.toUpperCase(), 66, 92);
  context.fillStyle = worldPalette.stoneLight;
  context.font = title.length > 19 ? "800 52px sans-serif" : "800 66px sans-serif";
  context.fillText(title, 66, 202, width - 132);
  context.fillStyle = "rgba(238,241,232,.68)";
  context.font = "600 24px monospace";
  context.fillText("WALK HERE / E TO PLAY", 66, 252);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(5.15, 1.62, 1);
  sprite.userData.texture = texture;
  return sprite;
}

function buildExplorer() {
  const root = new THREE.Group();
  root.name = "ohaki-explorer";
  const jacket = new THREE.MeshStandardMaterial({ color: worldPalette.slate, roughness: 0.94 });
  const jacketTrim = new THREE.MeshStandardMaterial({ color: worldPalette.slateLight, roughness: 0.9 });
  const trousers = new THREE.MeshStandardMaterial({ color: worldPalette.slateDeep, roughness: 0.96 });
  const coral = new THREE.MeshStandardMaterial({ color: worldPalette.cobalt, roughness: 0.88 });
  const ivory = new THREE.MeshStandardMaterial({ color: worldPalette.stoneLight, roughness: 0.88 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf0c3a3, roughness: 0.92 });
  const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x18222c, roughness: 0.98 });
  const greenGlow = new THREE.MeshStandardMaterial({ color: worldPalette.sageLight, emissive: worldPalette.sage, emissiveIntensity: 0.38, roughness: 0.5 });
  const amber = new THREE.MeshStandardMaterial({ color: worldPalette.warm, emissive: 0xc78343, emissiveIntensity: 0.9, roughness: 0.25 });
  const brass = new THREE.MeshStandardMaterial({ color: worldPalette.brass, metalness: 0.6, roughness: 0.36 });

  const body = new THREE.Group();
  body.position.y = 1.35;
  root.add(body);
  const coatProfile = [[0.27, -0.42], [0.35, -0.31], [0.38, 0.12], [0.46, 0.3], [0.36, 0.48], [0.2, 0.5]];
  sculpt(body, new THREE.LatheGeometry(coatProfile.map(([r, y]) => new THREE.Vector2(r, y)), 24), jacket, [0, 0, 0], [1, 1, 0.82]);
  addBox(body, [0.045, 0.76, 0.04], [0, 0.03, 0.38], brass);
  addBox(body, [0.18, 0.14, 0.03], [-0.2, 0.17, 0.36], ivory);
  addBox(body, [0.18, 0.14, 0.03], [0.2, 0.17, 0.36], ivory);
  addBox(body, [0.62, 0.68, 0.28], [0, 0.01, -0.4], trousers);
  addBox(body, [0.38, 0.08, 0.04], [0, 0.22, -0.23], amber);
  addBox(body, [0.3, 0.23, 0.04], [0, 0.1, 0.42], coral);
  const pack = new THREE.Group();
  pack.position.set(0, 0.12, -0.56);
  body.add(pack);
  addBox(pack, [0.56, 0.48, 0.16], [0, 0, 0], jacketTrim);
  addBox(pack, [0.16, 0.08, 0.03], [0, 0.08, 0.1], brass);
  const shoulderBand = addBox(body, [0.07, 0.76, 0.06], [0, 0.03, -0.4], coral);
  shoulderBand.rotation.z = 0.7;
  addBox(body, [0.07, 0.76, 0.06], [0, 0.03, -0.4], coral).rotation.z = -0.7;
  for (const side of [-1, 1]) {
    sculpt(body, new THREE.SphereGeometry(0.18, 12, 8), jacketTrim, [side * 0.44, 0.34, 0]);
    sculpt(body, new THREE.CylinderGeometry(0.11, 0.11, 0.5, 10), ivory, [side * 0.36, -0.01, -0.4]);
  }

  const scarf = new THREE.Group();
  scarf.position.set(0, 0.5, -0.18);
  const scarfGeometry = new THREE.PlaneGeometry(0.3, 1.08, 4, 18);
  scarfGeometry.translate(0, -0.54, 0);
  const scarfRest = Float32Array.from(scarfGeometry.attributes.position.array);
  sculpt(scarf, scarfGeometry, coral, [0, 0, 0]);
  body.add(scarf);

  const head = new THREE.Group();
  head.position.y = 0.84;
  body.add(head);
  sculpt(head, new THREE.SphereGeometry(0.49, 28, 20), skin, [0, 0, 0.06], [1, 0.98, 0.88]);
  const hair = new THREE.Group();
  head.add(hair);
  sculpt(hair, new THREE.SphereGeometry(0.51, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMaterial, [0, 0.11, 0], [1, 1, 0.96]);
  for (let i = 0; i < 7; i += 1) {
    const lock = sculpt(hair, new THREE.CapsuleGeometry(0.1, 0.22, 4, 8), hairMaterial, [(i - 3) * 0.13, 0.35 + Math.abs(i - 3) * 0.02, 0.3], [1, 0.8, 0.75]);
    lock.rotation.z = -0.26 + i * 0.085;
  }
  const eyes: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * 0.17, -0.02, 0.46);
    sculpt(eye, new THREE.SphereGeometry(0.085, 14, 10), hairMaterial, [0, 0, 0], [0.68, 1.15, 0.28]);
    sculpt(eye, new THREE.SphereGeometry(0.024, 10, 8), ivory, [-0.018, 0.03, 0.024]);
    head.add(eye);
    eyes.push(eye);
    addBox(head, [0.13, 0.035, 0.025], [side * 0.17, 0.1, 0.46], hairMaterial).rotation.z = side * -0.1;
    sculpt(hair, new THREE.SphereGeometry(0.14, 12, 10), hairMaterial, [side * 0.43, 0.15, 0.02], [0.65, 0.75, 1]);
  }
  sculpt(head, new THREE.SphereGeometry(0.035, 10, 8), skin, [0, -0.09, 0.49]);
  const smile = sculpt(head, new THREE.TorusGeometry(0.065, 0.012, 6, 16, Math.PI), hairMaterial, [0, -0.19, 0.45]);
  smile.rotation.z = Math.PI;
  const headphones = sculpt(head, new THREE.TorusGeometry(0.54, 0.045, 8, 32, Math.PI), ivory, [0, 0.03, -0.02]);
  headphones.rotation.x = Math.PI;
  for (const side of [-1, 1]) {
    const pod = sculpt(head, new THREE.CylinderGeometry(0.16, 0.16, 0.1, 16), ivory, [side * 0.51, 0, -0.02]);
    pod.rotation.z = Math.PI / 2;
    sculpt(head, new THREE.CircleGeometry(0.09, 16), coral, [side * 0.57, 0, -0.02]).rotation.y = side * Math.PI / 2;
  }

  const armL = new THREE.Group();
  const armR = new THREE.Group();
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  const elbows: THREE.Group[] = [];
  const knees: THREE.Group[] = [];
  [armL, armR].forEach((arm, index) => {
    arm.position.set(index ? 0.46 : -0.46, 0.34, 0);
    sculpt(arm, new THREE.CapsuleGeometry(0.105, 0.22, 5, 10), jacket, [0, -0.2, 0]);
    const elbow = new THREE.Group();
    elbow.position.y = -0.38;
    arm.add(elbow);
    sculpt(elbow, new THREE.CapsuleGeometry(0.09, 0.18, 5, 10), ivory, [0, -0.16, 0]);
    sculpt(elbow, new THREE.SphereGeometry(0.13, 12, 9), skin, [0, -0.35, 0]);
    elbows.push(elbow);
    body.add(arm);
  });
  [legL, legR].forEach((leg, index) => {
    leg.position.set(index ? 0.2 : -0.2, 0.98, 0);
    sculpt(leg, new THREE.CapsuleGeometry(0.15, 0.23, 5, 10), trousers, [0, -0.22, 0]);
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    leg.add(knee);
    sculpt(knee, new THREE.CapsuleGeometry(0.13, 0.23, 5, 10), trousers, [0, -0.2, 0]);
    addBox(knee, [0.3, 0.2, 0.43], [0, -0.43, 0.1], trousers);
    knees.push(knee);
    root.add(leg);
  });

  const lantern = new THREE.Group();
  lantern.position.set(0, -0.47, 0);
  sculpt(lantern, new THREE.CylinderGeometry(0.12, 0.1, 0.22, 16), ivory, [0, 0, 0]);
  sculpt(lantern, new THREE.SphereGeometry(0.07, 10, 8), amber, [0, 0, 0.08]);
  const lanternRing = sculpt(lantern, new THREE.TorusGeometry(0.085, 0.025, 6, 16), ivory, [0.13, 0, 0]);
  lanternRing.rotation.y = Math.PI / 2;
  elbows[1].add(lantern);

  const drone = new THREE.Group();
  drone.position.set(0.95, 2.1, 0);
  sculpt(drone, new THREE.OctahedronGeometry(0.16, 0), greenGlow, [0, 0, 0]);
  const droneRing = sculpt(drone, new THREE.TorusGeometry(0.28, 0.018, 6, 30), greenGlow, [0, 0, 0]);
  droneRing.rotation.x = Math.PI / 2;
  root.add(drone);

  root.traverse(object => {
    if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
  });
  root.userData.source = "original procedural cozy anime developer";
  root.userData.identity = "male cozy anime developer; original character, not a facial likeness";
  return { root, body, head, hair, eyes, scarf, scarfGeometry, scarfRest, armL, armR, legL, legR, elbows, knees, lantern, drone, droneRing };
}

function createStationMaterials() {
  // Materials are scoped per world build because world.tsx disposes the full
  // scene on unmount. Geometry is cached above; materials stay disposable.
  return {
    slateDeep: new THREE.MeshStandardMaterial({ color: worldPalette.slateDeep, roughness: 0.92 }),
    // Exhibits are architectural miniatures: light stone bodies with a dark
    // seam/plinth for contrast, not a row of dark buildings.
    slate: new THREE.MeshStandardMaterial({ color: worldPalette.stone, roughness: 0.92 }),
    slateLight: new THREE.MeshStandardMaterial({ color: worldPalette.stoneLight, roughness: 0.84 }),
    stone: new THREE.MeshStandardMaterial({ color: worldPalette.stone, roughness: 0.9 }),
    stoneLight: new THREE.MeshStandardMaterial({ color: worldPalette.stoneLight, roughness: 0.82 }),
    sage: new THREE.MeshStandardMaterial({ color: worldPalette.sage, roughness: 0.94 }),
    cobalt: new THREE.MeshStandardMaterial({ color: worldPalette.cobalt, roughness: 0.72 }),
    cobaltLight: new THREE.MeshStandardMaterial({ color: worldPalette.cobaltLight, roughness: 0.66 }),
    brass: new THREE.MeshStandardMaterial({ color: worldPalette.brass, metalness: 0.58, roughness: 0.38 }),
    terracotta: new THREE.MeshStandardMaterial({ color: worldPalette.terracotta, roughness: 0.86 }),
    terracottaDark: new THREE.MeshStandardMaterial({ color: worldPalette.terracottaDark, roughness: 0.92 }),
    warm: new THREE.MeshStandardMaterial({ color: worldPalette.warm, emissive: 0xc78343, emissiveIntensity: 0.78, roughness: 0.3 }),
  };
}

function buildProjectStation(project: Project, index: number, x: number, top: number, accent: string) {
  const group = new THREE.Group();
  // Keep this transform contract: world.tsx replaces z with stationPosition.
  group.position.set(x, top, -1.6);
  group.name = `repo-${project.name}`;
  const m = createStationMaterials();
  const accentColor = new THREE.Color(accent);
  const glow = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 1.05, roughness: 0.32 });
  const glass = new THREE.MeshStandardMaterial({ color: accentColor, transparent: true, opacity: 0.25, roughness: 0.2, emissive: accentColor, emissiveIntensity: 0.08, depthWrite: false });
  const pulseMaterial = new THREE.MeshStandardMaterial({ color: m.brass.color, metalness: 0.58, roughness: 0.35 });
  const pulse = sculpt(group, new THREE.TorusGeometry(0.94, 0.045, 8, 48, Math.PI * 1.8), pulseMaterial, [0, 2.62, 0]);
  const core = sculpt(group, new THREE.IcosahedronGeometry(0.46, 1), glass, [0, 2.62, 0]);
  const signal = sculpt(group, new THREE.OctahedronGeometry(0.15, 0), glow, [0, 4.48, 0]);

  // Every exhibit gets the same quiet plinth language, then a different
  // silhouette above it so the route remains scannable from the overview.
  addBox(group, [4.8, 0.18, 3.85], [0, 0.1, 0], m.slateDeep);
  addBox(group, [4.42, 0.1, 3.46], [0, 0.24, 0], m.stone);
  addBox(group, [3.65, 0.055, 0.14], [0, 0.34, 1.62], m.cobalt);
  addBox(group, [0.12, 0.055, 2.9], [-2.08, 0.34, 0], m.cobalt);

  const addDoor = (doorX = 0, doorZ = 1.76, width = 0.78, height = 1.38) => {
    addBox(group, [width + 0.14, height + 0.14, 0.12], [doorX, height / 2 + 0.38, doorZ], m.stoneLight);
    addBox(group, [width, height, 0.13], [doorX, height / 2 + 0.38, doorZ + 0.07], m.slateDeep);
    addBox(group, [width * 0.58, height * 0.57, 0.045], [doorX, height * 0.67 + 0.38, doorZ + 0.15], m.warm);
    sculpt(group, new THREE.SphereGeometry(0.055, 8, 6), m.brass, [doorX + width * 0.27, height * 0.48 + 0.38, doorZ + 0.15]);
  };
  const addWindow = (windowX: number, windowY: number, windowZ: number, width = 0.42, height = 0.58) => {
    addBox(group, [width + 0.1, height + 0.1, 0.08], [windowX, windowY, windowZ], m.stoneLight);
    addBox(group, [width, height, 0.09], [windowX, windowY, windowZ + 0.05], m.warm);
    addBox(group, [0.045, height + 0.1, 0.1], [windowX, windowY, windowZ + 0.08], m.brass);
    addBox(group, [width + 0.1, 0.045, 0.1], [windowX, windowY, windowZ + 0.08], m.brass);
  };
  const addCobaltRail = (width: number, y: number, z = 0) => {
    addBox(group, [width, 0.075, 0.08], [0, y, z], m.cobalt);
  };

  switch (index % 6) {
    case 0: { // Observatory: a round stone drum under an armillary dome.
      sculpt(group, new THREE.CylinderGeometry(1.18, 1.3, 1.72, 12), m.slate, [0, 1.18, 0]);
      addBox(group, [2.2, 0.12, 0.12], [0, 1.92, 1.13], m.cobalt);
      addDoor(0, 1.32, 0.74, 1.3);
      for (const windowX of [-0.72, 0.72]) addWindow(windowX, 1.2, 1.02, 0.3, 0.4);
      const dome = sculpt(group, new THREE.SphereGeometry(1.28, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), glass, [0, 2.03, 0]);
      dome.add(new THREE.LineSegments(new THREE.EdgesGeometry(dome.geometry), new THREE.LineBasicMaterial({ color: m.cobalt.color })));
      for (let ring = 0; ring < 3; ring += 1) {
        const orbit = sculpt(group, new THREE.TorusGeometry(0.78 + ring * 0.17, 0.045, 8, 36), ring === 1 ? m.stoneLight : m.brass, [0, 2.7, 0]);
        orbit.rotation.set(ring * 0.64, ring * 0.78, 0.2);
      }
      const telescope = sculpt(group, new THREE.CylinderGeometry(0.18, 0.25, 1.8, 12), m.stoneLight, [0, 2.72, -0.14]);
      telescope.rotation.z = -0.72;
      break;
    }
    case 1: { // Archive: a compact reading room with a strong pitched roof.
      addBox(group, [3.28, 1.72, 2.62], [0, 1.2, 0], m.slate);
      addDoor(0, 1.36, 0.76, 1.32);
      for (const windowX of [-1.05, 1.05]) addWindow(windowX, 1.2, 1.36, 0.46, 0.54);
      for (const side of [-1, 1]) {
        const roof = addBox(group, [2.25, 0.16, 2.95], [side * 0.88, 2.3, 0], side < 0 ? m.slateDeep : m.slateLight);
        roof.rotation.z = side * 0.54;
      }
      addCobaltRail(3.45, 3.08);
      for (const xPos of [-1.3, -0.43, 0.43, 1.3]) sculpt(group, new THREE.CylinderGeometry(0.08, 0.12, 2.1, 8), m.brass, [xPos, 1.25, -1.03]);
      break;
    }
    case 2: { // Connected systems: three linked towers and a legible bridge.
      for (let tower = 0; tower < 3; tower += 1) {
        const towerX = (tower - 1) * 1.25;
        const height = 1.68 + (tower % 2) * 0.82;
        addBox(group, [0.82, height, 0.88], [towerX, height / 2 + 0.35, 0], tower === 1 ? m.stoneLight : m.slate);
        addBox(group, [0.98, 0.1, 0.98], [towerX, height + 0.42, 0], m.cobalt);
        addWindow(towerX, height * 0.6 + 0.38, 0.47, 0.28, 0.34);
      }
      addBox(group, [3.45, 0.16, 0.42], [0, 2.15, 0.34], m.brass);
      addBox(group, [2.7, 0.08, 0.06], [0, 2.29, 0.58], m.cobalt);
      addDoor(-1.25, 0.52, 0.55, 0.88);
      break;
    }
    case 3: { // Studio dome: a broad maker's room with a radial frame.
      addBox(group, [3.55, 0.32, 2.92], [0, 0.48, 0], m.slateDeep);
      const dome = sculpt(group, new THREE.SphereGeometry(1.72, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass, [0, 0.62, 0]);
      dome.add(new THREE.LineSegments(new THREE.EdgesGeometry(dome.geometry), new THREE.LineBasicMaterial({ color: m.cobalt.color })));
      addDoor(0, 1.42, 0.8, 1.22);
      for (const xPos of [-1.44, 1.44]) sculpt(group, new THREE.CylinderGeometry(0.08, 0.13, 2.0, 8), m.stoneLight, [xPos, 1.42, 0]);
      addCobaltRail(3.1, 2.42);
      break;
    }
    case 4: { // Signal exchange: stepped terraces with a calm antenna mast.
      for (let level = 0; level < 4; level += 1) {
        const width = 3.18 - level * 0.5;
        addBox(group, [width, 0.48, 1.92], [0, 0.52 + level * 0.48, 0], level % 2 ? m.stoneLight : m.slate);
        addWindow(-width * 0.28, 0.7 + level * 0.48, 1.02, 0.28, 0.28);
        addWindow(width * 0.28, 0.7 + level * 0.48, 1.02, 0.28, 0.28);
      }
      const antenna = sculpt(group, new THREE.CylinderGeometry(0.045, 0.075, 1.9, 8), m.brass, [0, 3.45, 0]);
      antenna.rotation.z = -0.14;
      sculpt(group, new THREE.TorusGeometry(0.34, 0.04, 6, 24), m.cobalt, [0, 4.14, 0]);
      addDoor(0, 1.02, 0.76, 1.12);
      break;
    }
    default: { // Portfolio atelier: an open arch around a warm maker's desk.
      addBox(group, [3.78, 0.28, 2.6], [0, 0.48, 0], m.slateDeep);
      for (const side of [-1, 1]) addBox(group, [0.28, 2.35, 0.28], [side * 1.75, 1.42, 0], m.cobalt);
      const arch = sculpt(group, new THREE.TorusGeometry(1.88, 0.13, 10, 36, Math.PI), m.cobalt, [0, 1.56, 0]);
      arch.rotation.z = Math.PI;
      addBox(group, [3.7, 0.16, 0.24], [0, 2.68, 0], m.stoneLight);
      addBox(group, [2.6, 0.12, 0.72], [0, 1.08, 0.34], m.stone);
      for (const xPos of [-0.9, 0, 0.9]) addWindow(xPos, 1.46, 1.16, 0.34, 0.4);
      addDoor(0, 1.22, 0.86, 1.3);
      break;
    }
  }

  mergeStationBoxes(group, index);
  const year = new Date(project.createdAt).getFullYear();
  const label = makeLabel(project.name, `${year} / ${project.language ?? "EXPERIMENT"}`, accent);
  label.position.set(0, 6.05, 0);
  group.add(label);
  group.traverse(item => { item.userData.projectIndex = index; });
  group.userData.runtime = { pulse, signal, core, label, baseY: label.position.y };
  return group;
}

export { buildExplorer, buildProjectStation, addBox, sculpt };
