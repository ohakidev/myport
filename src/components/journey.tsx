"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { GitHubPortfolio, Project } from "@/lib/github";

const chapters = [
  { id: "origin", label: "Start", color: "#62e3ff" },
  { id: "practice", label: "Lab", color: "#f3d768" },
  { id: "work", label: "Projects", color: "#ff806f" },
  { id: "contact", label: "Signal", color: "#b9f46d" },
];

const languageColors: Record<string, string> = {
  TypeScript: "#62e3ff",
  JavaScript: "#f3d768",
  Python: "#83f1a5",
  HTML: "#ff806f",
  CSS: "#cb8eff",
};

const zoneEnds = [0, 31, 74, 108];
const pathX = (z: number) => Math.sin(z * 0.075) * 3.4 + Math.sin(z * 0.021) * 1.4;

const WORLD_TILE = 72;
const WORLD_TILES = 7;
const WORLD_SIZE = WORLD_TILE * WORLD_TILES;

type WorldProp = {
  x: number;
  z: number;
  kind: "pine" | "crystal" | "rock" | "ruin" | "beacon";
  scale: number;
  hue: number;
  rotation: number;
};

function worldHash(x: number, z: number) {
  let value = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(z ^ 0xc2b2ae35, 0x27d4eb2d);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967295;
}

function makeWorldProps(tileX: number, tileZ: number): WorldProp[] {
  const props: WorldProp[] = [];
  for (let index = 0; index < 26; index += 1) {
    const a = worldHash(tileX * 97 + index * 13, tileZ * 67 - index * 19);
    const b = worldHash(tileX * 53 - index * 23, tileZ * 113 + index * 11);
    const c = worldHash(tileX * 31 + index * 7, tileZ * 43 + index * 29);
    const roll = worldHash(tileX * 17 + index, tileZ * 37 - index);
    const kind: WorldProp["kind"] =
      roll < 0.48 ? "pine" : roll < 0.68 ? "rock" : roll < 0.84 ? "crystal" : roll < 0.95 ? "ruin" : "beacon";
    props.push({
      x: (a - 0.5) * WORLD_TILE,
      z: (b - 0.5) * WORLD_TILE,
      kind,
      scale: 0.65 + c * 1.45,
      hue: worldHash(tileX * 71 - index, tileZ * 89 + index),
      rotation: roll * Math.PI * 2,
    });
  }
  return props;
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.69c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.55 9.55 0 0 1 12 7.68a9.5 9.5 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v1.9c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = value + Math.imul(value ^ (value >>> 7), 61 | value) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function addBox(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  color: number,
  rotationY = 0,
) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.06 }),
  );
  mesh.position.set(...position);
  mesh.rotation.y = rotationY;
  group.add(mesh);
  return mesh;
}

function addTree(group: THREE.Group, x: number, z: number, scale = 1) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13 * scale, 0.18 * scale, 1.2 * scale, 7),
    new THREE.MeshStandardMaterial({ color: 0x4a3427, roughness: 0.95 }),
  );
  trunk.position.set(x, 0.6 * scale, z);
  group.add(trunk);
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(0.72 * scale, 1.65 * scale, 7),
    new THREE.MeshStandardMaterial({ color: 0x193f35, roughness: 0.84 }),
  );
  crown.position.set(x, 1.72 * scale, z);
  group.add(crown);
}

function addTextSprite(text: string, color = "#ffffff", font = "700 44px sans-serif") {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(7, 1.75, 1);
  sprite.userData.texture = texture;
  return sprite;
}

function createWorldProp(prop: WorldProp) {
  const group = new THREE.Group();
  group.rotation.y = prop.rotation;
  group.scale.setScalar(prop.scale);

  if (prop.kind === "pine") {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 1.35, 7),
      new THREE.MeshStandardMaterial({ color: 0x4b3128, roughness: 0.95 }),
    );
    trunk.position.y = 0.67;
    const foliage = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.43 + prop.hue * 0.045, 0.46, 0.18 + prop.hue * 0.055),
      roughness: 0.86,
    });
    const lower = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.8, 7), foliage);
    lower.position.y = 1.75;
    const upper = new THREE.Mesh(new THREE.ConeGeometry(0.68, 1.55, 7), foliage);
    upper.position.y = 2.75;
    group.add(trunk, lower, upper);
  } else if (prop.kind === "crystal") {
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().setHSL(0.5 + prop.hue * 0.28, 0.78, 0.58),
      emissive: new THREE.Color().setHSL(0.5 + prop.hue * 0.28, 0.75, 0.34),
      emissiveIntensity: 0.75,
      roughness: 0.18,
      metalness: 0.2,
      clearcoat: 0.8,
    });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), material);
    core.scale.y = 2.4;
    core.position.y = 1.25;
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.27, 0), material.clone());
    shard.scale.y = 1.9;
    shard.position.set(0.55, 0.75, 0.12);
    shard.rotation.z = -0.35;
    group.add(core, shard);
  } else if (prop.kind === "rock") {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.57, 0.13, 0.2 + prop.hue * 0.08),
      roughness: 0.94,
    });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), material);
    rock.scale.set(1.2, 0.72, 0.92);
    rock.position.y = 0.48;
    const moss = new THREE.Mesh(new THREE.IcosahedronGeometry(0.52, 1), new THREE.MeshStandardMaterial({
      color: 0x27483a,
      roughness: 1,
    }));
    moss.scale.set(1.1, 0.18, 0.75);
    moss.position.set(-0.08, 0.9, 0);
    group.add(rock, moss);
  } else if (prop.kind === "ruin") {
    const stone = new THREE.MeshStandardMaterial({ color: 0x344256, roughness: 0.83, metalness: 0.05 });
    const columnA = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.4, 0.42), stone);
    const columnB = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.65, 0.42), stone);
    columnA.position.set(-0.7, 1.2, 0);
    columnB.position.set(0.7, 0.825, 0);
    columnB.rotation.z = 0.08;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.35, 0.5), stone);
    lintel.position.set(-0.08, 2.28, 0);
    lintel.rotation.z = -0.08;
    const rune = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.035, 5, 24),
      new THREE.MeshStandardMaterial({ color: 0x62e3ff, emissive: 0x2bbbd1, emissiveIntensity: 1.2 }),
    );
    rune.position.set(-0.7, 1.35, -0.23);
    group.add(columnA, columnB, lintel, rune);
  } else {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 3.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x24354b, roughness: 0.58, metalness: 0.38 }),
    );
    pole.position.y = 1.55;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.06, 8, 40),
      new THREE.MeshStandardMaterial({ color: 0xb9f46d, emissive: 0x73b92f, emissiveIntensity: 1.4 }),
    );
    ring.position.y = 3.25;
    const light = new THREE.PointLight(0xb9f46d, 8, 9, 1.8);
    light.position.y = 3.25;
    group.add(pole, ring, light);
  }

  group.userData.worldProp = prop.kind;
  return group;
}

function createWorldTile(tileX: number, tileZ: number) {
  const group = new THREE.Group();
  group.name = `world-tile-${tileX}-${tileZ}`;
  const groundHue = worldHash(tileX, tileZ);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_TILE, WORLD_TILE, 1, 1),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.48 + groundHue * 0.05, 0.28, 0.075 + groundHue * 0.025),
      roughness: 0.98,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  makeWorldProps(tileX, tileZ).forEach((prop) => {
    const object = createWorldProp(prop);
    object.position.set(prop.x, 0, prop.z);
    group.add(object);
  });
  group.position.set(tileX * WORLD_TILE, 0, tileZ * WORLD_TILE);
  return group;
}

function buildWalker() {
  const root = new THREE.Group();
  root.name = "ohaki-player";

  // Procedural reconstruction of the generated Ohaki Explorer reference.
  // It represents the owner's builder/explorer identity; the helmet deliberately avoids fabricated facial likeness.
  const suit = new THREE.MeshPhysicalMaterial({ color: 0x203152, roughness: 0.68, clearcoat: 0.08 });
  const armor = new THREE.MeshPhysicalMaterial({ color: 0x30476e, roughness: 0.43, clearcoat: 0.22 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x080d18, roughness: 0.82 });
  const coral = new THREE.MeshPhysicalMaterial({ color: 0xff806f, roughness: 0.46, clearcoat: 0.18 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xffcf82, roughness: 0.38, metalness: 0.12 });
  const cyan = new THREE.MeshPhysicalMaterial({
    color: 0x62e3ff,
    emissive: 0x37bfd9,
    emissiveIntensity: 1.9,
    roughness: 0.18,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
  });

  const addRoundedBox = (
    parent: THREE.Object3D,
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
    bevel = 0.08,
  ) => {
    const shape = new THREE.Shape();
    const width = size[0];
    const height = size[1];
    const radius = Math.min(bevel, width / 2, height / 2);
    shape.moveTo(-width / 2 + radius, -height / 2);
    shape.lineTo(width / 2 - radius, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
    shape.lineTo(width / 2, height / 2 - radius);
    shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
    shape.lineTo(-width / 2 + radius, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
    shape.lineTo(-width / 2, -height / 2 + radius);
    shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: size[2],
      bevelEnabled: true,
      bevelSize: Math.min(radius * 0.28, size[2] * 0.18),
      bevelThickness: Math.min(radius * 0.28, size[2] * 0.18),
      bevelSegments: 2,
    });
    geometry.center();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  };

  const addRod = (
    parent: THREE.Object3D,
    from: THREE.Vector3,
    to: THREE.Vector3,
    radius: number,
    material: THREE.Material,
  ) => {
    const direction = to.clone().sub(from);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    parent.add(mesh);
    return mesh;
  };

  const body = new THREE.Group();
  body.name = "sculpt-body";
  root.add(body);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.5, 8, 16), suit);
  torso.scale.set(1, 1, 0.72);
  torso.position.y = 1.14;
  body.add(torso);
  addRoundedBox(body, [0.58, 0.48, 0.13], [0, 1.2, -0.31], armor, 0.14);

  const harness = new THREE.Group();
  harness.name = "coral-x-harness";
  const harnessFrontZ = -0.4;
  addRod(harness, new THREE.Vector3(-0.22, 1.42, harnessFrontZ), new THREE.Vector3(0.19, 1.02, harnessFrontZ), 0.035, coral);
  addRod(harness, new THREE.Vector3(0.22, 1.42, harnessFrontZ), new THREE.Vector3(-0.19, 1.02, harnessFrontZ), 0.035, coral);
  const chestNode = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.045, 18), cyan);
  chestNode.rotation.x = Math.PI / 2;
  chestNode.position.set(0, 1.22, harnessFrontZ + 0.03);
  harness.add(chestNode);
  body.add(harness);

  addRoundedBox(body, [0.66, 0.16, 0.4], [0, 0.84, 0], rubber, 0.07);
  addRoundedBox(body, [0.16, 0.13, 0.12], [0, 0.85, -0.27], amber, 0.04);

  const pack = addRoundedBox(body, [0.62, 0.64, 0.3], [0, 1.22, 0.34], rubber, 0.11);
  pack.name = "technical-backpack";
  addRoundedBox(body, [0.38, 0.13, 0.06], [0, 1.47, 0.51], cyan, 0.04);
  for (const side of [-1, 1]) {
    addRoundedBox(body, [0.15, 0.36, 0.25], [side * 0.38, 1.18, 0.31], rubber, 0.05);
  }

  const head = new THREE.Group();
  head.name = "helmet-head";
  head.position.y = 1.78;
  body.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 18), rubber);
  helmet.scale.z = 0.86;
  head.add(helmet);
  const helmetBand = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.018, 6, 38), armor);
  helmetBand.rotation.x = Math.PI / 2;
  head.add(helmetBand);
  addRoundedBox(head, [0.46, 0.15, 0.075], [0, 0, -0.27], cyan, 0.06);
  addRoundedBox(head, [0.18, 0.035, 0.015], [-0.08, 0.035, -0.315], new THREE.MeshBasicMaterial({ color: 0xd8fbff }), 0.014);
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), armor);
    pod.rotation.z = Math.PI / 2;
    pod.position.x = side * 0.31;
    head.add(pod);
    const podLight = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.055, 12), coral);
    podLight.rotation.z = Math.PI / 2;
    podLight.position.x = side * 0.318;
    head.add(podLight);
  }

  const makeArm = (side: number) => {
    const pivot = new THREE.Group();
    pivot.name = side < 0 ? "arm-left-pivot" : "arm-right-pivot";
    pivot.position.set(side * 0.45, 1.43, 0);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), armor);
    shoulder.scale.set(1.12, 0.82, 0.92);
    pivot.add(shoulder);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.026, 5, 20, Math.PI), coral);
    trim.rotation.set(Math.PI / 2, 0, side < 0 ? 0 : Math.PI);
    trim.position.y = 0.02;
    pivot.add(trim);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.31, 5, 10), suit);
    upper.position.y = -0.28;
    pivot.add(upper);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), rubber);
    glove.position.y = -0.58;
    pivot.add(glove);
    body.add(pivot);
    return pivot;
  };

  const makeLeg = (side: number) => {
    const pivot = new THREE.Group();
    pivot.name = side < 0 ? "leg-left-pivot" : "leg-right-pivot";
    pivot.position.set(side * 0.17, 0.77, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.42, 5, 12), suit);
    leg.position.y = -0.33;
    pivot.add(leg);
    addRoundedBox(pivot, [0.22, 0.16, 0.2], [0, -0.38, -0.11], rubber, 0.05);
    const boot = addRoundedBox(pivot, [0.27, 0.19, 0.39], [0, -0.72, -0.07], rubber, 0.06);
    boot.name = side < 0 ? "boot-left" : "boot-right";
    addRoundedBox(pivot, [0.23, 0.035, 0.04], [0, -0.66, -0.29], armor, 0.012);
    body.add(pivot);
    return pivot;
  };

  const armL = makeArm(-1);
  const armR = makeArm(1);
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  const lantern = new THREE.Group();
  lantern.name = "locator-lantern";
  lantern.position.set(0, -0.68, 0);
  const lanternCage = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 6, 24), amber);
  lanternCage.rotation.x = Math.PI / 2;
  lantern.add(lanternCage);
  const lanternOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffefbd, emissive: 0xffa746, emissiveIntensity: 3.4, roughness: 0.22 }),
  );
  lantern.add(lanternOrb);
  addRod(lantern, new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0, 0.25, 0), 0.015, amber);
  armR.add(lantern);
  const lanternLight = new THREE.PointLight(0xffbd6d, 17, 9, 1.8);
  lantern.add(lanternLight);

  const drone = new THREE.Group();
  drone.name = "companion-drone";
  const droneCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), cyan);
  droneCore.scale.y = 1.25;
  drone.add(droneCore);
  const droneRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.013, 6, 40),
    new THREE.MeshBasicMaterial({ color: 0x62e3ff }),
  );
  droneRing.rotation.x = Math.PI / 2;
  drone.add(droneRing);
  const droneLight = new THREE.PointLight(0x62e3ff, 4.5, 4, 2);
  drone.add(droneLight);
  drone.position.set(0.82, 2.13, 0.05);
  root.add(drone);

  root.userData.sculptRuntime = {
    source: "img2threejs-stylized-reference",
    approximation: "stylized representation; not facial likeness",
    pivots: { head, armL, armR, legL, legR },
    sockets: { rightHand: armR, backpack: pack, drone },
    colliders: [torso, helmet],
  };

  return { root, body, head, armL, armR, legL, legR, drone, lanternLight };
}

function buildBasecamp() {
  const group = new THREE.Group();
  group.name = "basecamp";

  addBox(group, [7.6, 0.08, 5.6], [-3, 0.03, -3], 0x17233b);

  const tent = new THREE.Mesh(
    new THREE.ConeGeometry(1.25, 1.7, 4),
    new THREE.MeshStandardMaterial({ color: 0x26446c, roughness: 0.82 }),
  );
  tent.position.set(-3, 0.85, -4);
  tent.rotation.y = Math.PI / 4;
  group.add(tent);

  const fire = new THREE.Group();
  fire.position.set(1.5, 0, -2.8);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3c455b, roughness: 1 });
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), stoneMat);
    stone.position.set(Math.cos(angle) * 0.62, 0.1, Math.sin(angle) * 0.62);
    fire.add(stone);
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.76, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffc35c,
      emissive: 0xff7a30,
      emissiveIntensity: 2.5,
      transparent: true,
      opacity: 0.95,
    }),
  );
  flame.position.y = 0.46;
  fire.add(flame);
  const fireLight = new THREE.PointLight(0xff9b52, 24, 12, 1.9);
  fireLight.position.y = 0.8;
  fire.add(fireLight);
  group.add(fire);

  const title = addTextSprite("OHKI / START HERE", "#62e3ff", "800 52px monospace");
  title.position.set(-2.6, 3.2, -4.3);
  group.add(title);

  return { group, flame, fireLight };
}

function buildLab() {
  const group = new THREE.Group();
  group.name = "prototype-lab";
  group.position.z = -34;

  addBox(group, [11, 0.1, 7], [2.2, 0.04, 0], 0x1b2940);
  addBox(group, [4.8, 0.18, 1.4], [-1.2, 0.9, -0.4], 0x263957);

  const holo = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.62, 1),
    new THREE.MeshBasicMaterial({ color: 0xf3d768, wireframe: true, transparent: true, opacity: 0.9 }),
  );
  holo.position.set(-1.2, 2.05, -0.4);
  group.add(holo);

  const panels: THREE.Mesh[] = [];
  const specs = [
    [3.2, 2, -1.7, 1.8, 1.1],
    [4.8, 2.8, -2.8, 1.4, 1.8],
    [2.6, 3.4, -3.7, 2.4, 0.8],
  ];
  specs.forEach(([x, y, z, width, height], index) => {
    const panel = addBox(group, [width, height, 0.05], [x, y, z], 0x2b4960, -0.45 - index * 0.08);
    (panel.material as THREE.MeshStandardMaterial).emissive.set(0x1c8fa0);
    (panel.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.65;
    panels.push(panel);
  });

  const title = addTextSprite("THE PROTOTYPE LAB", "#f3d768", "800 52px monospace");
  title.position.set(-0.5, 4.25, -2.4);
  group.add(title);

  const light = new THREE.PointLight(0xf3d768, 18, 18, 1.8);
  light.position.set(0, 3, 0);
  group.add(light);

  return { group, holo, panels, light };
}

function buildProjects(projects: Project[]) {
  const group = new THREE.Group();
  group.name = "project-district";
  group.position.z = -72;
  const hitboxes: THREE.Mesh[] = [];
  const orbs: THREE.Mesh[] = [];

  projects.forEach((project, index) => {
    const row = Math.floor(index / 2);
    const side = index % 2 === 0 ? -1 : 1;
    const z = -row * 6;
    const x = side * 4.2;
    const color = new THREE.Color(languageColors[project.language ?? ""] ?? "#cb8eff");

    addBox(group, [5.8, 0.09, 4.3], [x, 0.035, z], 0x251b2a);
    addBox(group, [3.6, 1.2, 0.24], [x, 0.76, z - 1.4], 0x34223d);
    const panel = addBox(group, [3.1, 0.72, 0.08], [x, 0.8, z - 1.57], 0x12101c);
    const panelMat = panel.material as THREE.MeshStandardMaterial;
    panelMat.emissive.copy(color);
    panelMat.emissiveIntensity = 0.35;

    const orb = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.4, 1),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1,
        roughness: 0.25,
        metalness: 0.2,
      }),
    );
    orb.position.set(x + side * 1.25, 1.65, z - 0.2);
    orb.userData = { project, baseY: orb.position.y };
    group.add(orb);
    orbs.push(orb);

    const hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 2.4, 3.4),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hitbox.position.set(x, 1.1, z - 0.2);
    hitbox.userData = { project, orb };
    group.add(hitbox);
    hitboxes.push(hitbox);

    const label = addTextSprite(project.name, color.getStyle(), "800 46px monospace");
    label.position.set(x, 2.45, z - 1.45);
    label.scale.set(4.2, 1.05, 1);
    group.add(label);
  });

  const title = addTextSprite("PUBLIC PROJECT DISTRICT", "#ff806f", "800 52px monospace");
  title.position.set(0, 5.2, -4);
  group.add(title);

  const light = new THREE.PointLight(0xff806f, 22, 22, 1.8);
  light.position.set(0, 4, -4);
  group.add(light);

  return { group, hitboxes, orbs, light };
}

function buildSignal() {
  const group = new THREE.Group();
  group.name = "signal-summit";
  group.position.z = -108;

  addBox(group, [14, 0.12, 9], [0, 0.04, -1], 0x152c2b);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.5, 0.1, 10, 96),
    new THREE.MeshStandardMaterial({
      color: 0xb9f46d,
      emissive: 0x79be33,
      emissiveIntensity: 1.7,
      roughness: 0.28,
    }),
  );
  ring.position.set(0, 3, -3);
  group.add(ring);

  const light = new THREE.PointLight(0xb9f46d, 32, 24, 1.7);
  light.position.set(0, 3, -2);
  group.add(light);

  const title = addTextSprite("SEND THE NEXT SIGNAL", "#b9f46d", "800 52px monospace");
  title.position.set(0, 6.7, -3);
  group.add(title);

  const stones: THREE.Mesh[] = [];
  for (let index = 0; index < 7; index += 1) {
    const angle = index / 7 * Math.PI * 2;
    const stone = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.28 + index % 3 * 0.1, 0),
      new THREE.MeshStandardMaterial({ color: 0x2d4550, roughness: 0.78 }),
    );
    stone.position.set(Math.cos(angle) * 3.8, 1.3 + Math.sin(angle * 2) * 0.55, Math.sin(angle) * 2.6 - 3);
    group.add(stone);
    stones.push(stone);
  }

  return { group, ring, stones, light };
}

function buildPath() {
  const group = new THREE.Group();
  const segments = 180;
  const plankGeometry = new THREE.BoxGeometry(2.8, 0.04, 0.42);
  const plankMaterial = new THREE.MeshStandardMaterial({ color: 0x182135, roughness: 0.78 });
  const planks = new THREE.InstancedMesh(plankGeometry, plankMaterial, segments);
  const helper = new THREE.Object3D();

  for (let index = 0; index < segments; index += 1) {
    const t = index / (segments - 1);
    const z = 9 - t * 128;
    const x = pathX(-z);
    const nextX = pathX(-z + 0.5);
    helper.position.set(x, 0.025, z);
    helper.rotation.y = Math.atan2(nextX - x, -0.5);
    helper.updateMatrix();
    planks.setMatrixAt(index, helper.matrix);
  }
  planks.instanceMatrix.needsUpdate = true;
  group.add(planks);

  const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x62e3ff, transparent: true, opacity: 0.32 });
  const edgeGeometry = new THREE.BoxGeometry(0.035, 0.025, 0.5);
  const edges = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, segments * 2);
  for (let index = 0; index < segments; index += 1) {
    const t = index / (segments - 1);
    const z = 9 - t * 128;
    const x = pathX(-z);
    const nextX = pathX(-z + 0.5);
    const rotation = Math.atan2(nextX - x, -0.5);
    for (let side = 0; side < 2; side += 1) {
      helper.position.set(x + (side ? 1.5 : -1.5), 0.052, z);
      helper.rotation.y = rotation;
      helper.updateMatrix();
      edges.setMatrixAt(index * 2 + side, helper.matrix);
    }
  }
  edges.instanceMatrix.needsUpdate = true;
  group.add(edges);
  return { group, edgeMaterial };
}

function WorldTiles({
  scene,
  centerX,
  centerZ,
  tiles,
}: {
  scene: THREE.Scene;
  centerX: number;
  centerZ: number;
  tiles: Map<string, THREE.Group>;
}) {
  const baseX = Math.round(centerX / WORLD_TILE);
  const baseZ = Math.round(centerZ / WORLD_TILE);
  const wanted = new Set<string>();
  const radius = Math.floor(WORLD_TILES / 2);
  for (let x = baseX - radius; x <= baseX + radius; x += 1) {
    for (let z = baseZ - radius; z <= baseZ + radius; z += 1) {
      const key = `${x}:${z}`;
      wanted.add(key);
      if (!tiles.has(key)) {
        const tile = createWorldTile(x, z);
        tiles.set(key, tile);
        scene.add(tile);
      }
    }
  }
  tiles.forEach((tile, key) => {
    if (!wanted.has(key)) {
      scene.remove(tile);
      tile.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      tiles.delete(key);
    }
  });
}

function GameWorld({
  projects,
  onActiveZone,
  onProject,
}: {
  projects: Project[];
  onActiveZone: (zone: number) => void;
  onProject: (project: Project) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef(onActiveZone);
  const projectRef = useRef(onProject);

  useEffect(() => { zoneRef.current = onActiveZone; }, [onActiveZone]);
  useEffect(() => { projectRef.current = onProject; }, [onProject]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071018);
    scene.fog = new THREE.FogExp2(0x071018, 0.019);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 170);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0x8ca3c8, 0x071018, 2.15);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xe8f2ff, 1.15);
    sun.position.set(-7, 12, 5);
    scene.add(sun);

    const worldTiles = new Map<string, THREE.Group>();
    WorldTiles({ scene, centerX: 0, centerZ: 0, tiles: worldTiles });

    const path = buildPath();
    scene.add(path.group);

    const rand = mulberry(837);

    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(620 * 3);
    for (let index = 0; index < 620; index += 1) {
      dustPositions[index * 3] = (rand() - 0.5) * 70;
      dustPositions[index * 3 + 1] = 0.35 + rand() * 12;
      dustPositions[index * 3 + 2] = 16 - rand() * 146;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({ color: 0x8fb1c4, size: 0.055, transparent: true, opacity: 0.48 }),
    );
    scene.add(dust);

    const basecamp = buildBasecamp();
    const lab = buildLab();
    const district = buildProjects(projects);
    const signal = buildSignal();
    scene.add(basecamp.group, lab.group, district.group, signal.group);

    const walker = buildWalker();
    walker.root.position.set(pathX(0), 0, 6);
    scene.add(walker.root);

    const keys = new Set<string>();
    let touchVector = new THREE.Vector2();
    let stickPointer: number | null = null;
    let moving = false;
    let hovered: THREE.Mesh | null = null;
    let frame = 0;
    let zone = 0;
    let transition = 0;
    let travelZ = 0;
    let freeZ = 6;
    let requestedTravelZ: number | null = null;
    let walkPhase = 0;
    let pointerX = 0;
    const target = new THREE.Vector3();
    const desiredCamera = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(4, 4);

    const updateKey = (event: KeyboardEvent, down: boolean) => {
      const code = event.code;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "Space"].includes(code)) {
        event.preventDefault();
      }
      if (down) keys.add(code);
      else keys.delete(code);
    };

    const keyDown = (event: KeyboardEvent) => updateKey(event, true);
    const keyUp = (event: KeyboardEvent) => updateKey(event, false);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    const moveToChapter = (event: Event) => {
      const chapter = THREE.MathUtils.clamp(
        (event as CustomEvent<number>).detail,
        0,
        chapters.length - 1,
      );
      requestedTravelZ = [0, 32, 70, 105][chapter];
    };
    window.addEventListener("ohaki:travel", moveToChapter);

    const pointerMove = (event: PointerEvent) => {
      pointerX = event.clientX / Math.max(innerWidth, 1) * 2 - 1;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        (event.clientX - rect.left) / rect.width * 2 - 1,
        -(event.clientY - rect.top) / rect.height * 2 + 1,
      );
    };
    const pointerClick = () => {
      if (hovered) projectRef.current(hovered.userData.project as Project);
    };
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("click", pointerClick);

    const joystick = document.querySelector<HTMLElement>(".joystick");
    const joystickStart = (event: PointerEvent) => {
      stickPointer = event.pointerId;
      joystick?.setPointerCapture(event.pointerId);
    };
    const joystickMove = (event: PointerEvent) => {
      if (event.pointerId !== stickPointer || !joystick) return;
      const rect = joystick.getBoundingClientRect();
      touchVector.set(
        THREE.MathUtils.clamp((event.clientX - rect.left - rect.width / 2) / (rect.width / 2), -1, 1),
        THREE.MathUtils.clamp(-(event.clientY - rect.top - rect.height / 2) / (rect.height / 2), -1, 1),
      );
      joystick.style.setProperty("--stick-x", `${touchVector.x * 28}px`);
      joystick.style.setProperty("--stick-y", `${-touchVector.y * 28}px`);
    };
    const joystickEnd = (event: PointerEvent) => {
      if (event.pointerId !== stickPointer) return;
      stickPointer = null;
      touchVector.set(0, 0);
      joystick?.style.setProperty("--stick-x", "0px");
      joystick?.style.setProperty("--stick-y", "0px");
    };
    joystick?.addEventListener("pointerdown", joystickStart);
    joystick?.addEventListener("pointermove", joystickMove);
    joystick?.addEventListener("pointerup", joystickEnd);
    joystick?.addEventListener("pointercancel", joystickEnd);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const palette = [
      [0x071018, 0x62e3ff],
      [0x11151a, 0xf3d768],
      [0x180d18, 0xff806f],
      [0x081411, 0xb9f46d],
    ];
    const clock = new THREE.Clock();

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.getElapsedTime();

      let forward = 0;
      let sideways = 0;
      if (keys.has("KeyW") || keys.has("ArrowUp")) forward += 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) forward -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) sideways += 1;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) sideways -= 1;
      forward += touchVector.y;
      sideways += touchVector.x;
      moving = Math.abs(forward) + Math.abs(sideways) > 0.05;

      if (requestedTravelZ !== null) {
        const difference = requestedTravelZ - travelZ;
        if (Math.abs(difference) < 0.35) {
          travelZ = requestedTravelZ;
          freeZ = 6 - requestedTravelZ;
          requestedTravelZ = null;
        } else {
          const step = Math.sign(difference) * Math.min(Math.abs(difference), 18 * delta);
          travelZ += step;
          freeZ -= step;
          forward = Math.sign(difference);
          moving = true;
        }
      }

      if (requestedTravelZ === null && Math.abs(forward) + Math.abs(sideways) > 0.05) {
        const speed = keys.has("Space") ? 10.5 : 6.4;
        travelZ += forward * speed * delta;
        freeZ -= forward * speed * delta;
        const center = pathX(travelZ);
        const nearStoryRoad = travelZ >= -6 && travelZ <= zoneEnds[3] + 10;
        walker.root.position.x += sideways * 4.2 * delta;
        if (nearStoryRoad && Math.abs(walker.root.position.x - center) < 7) {
          walker.root.position.x = THREE.MathUtils.clamp(walker.root.position.x, center - 5.4, center + 5.4);
        }
        walker.root.position.z = freeZ;
        const targetYaw = forward < -0.05 ? Math.PI : 0;
        walker.root.rotation.y += (targetYaw - walker.root.rotation.y) * 0.16;
        walkPhase += delta * (keys.has("Space") ? 14 : 9.5);
      }

      const pathCenter = pathX(travelZ);
      const closeToRoad = travelZ >= -4 && travelZ <= zoneEnds[3] + 8 && Math.abs(pathCenter - walker.root.position.x) < 7;
      if (closeToRoad) walker.root.position.x += (pathCenter - walker.root.position.x) * (moving ? 0.008 : 0.014);
      const energy = moving ? 1 : 0.16;
      const swing = reduced ? 0 : Math.sin(walkPhase) * 0.62 * energy;
      walker.legL.rotation.x = swing;
      walker.legR.rotation.x = -swing;
      walker.armL.rotation.x = -swing * 0.78;
      walker.armR.rotation.x = swing * 0.48;
      walker.root.position.y = reduced ? 0 : Math.abs(Math.cos(walkPhase)) * 0.055 * energy;
      walker.head.rotation.y = moving ? 0 : Math.sin(time * 0.7) * 0.34;
      walker.body.rotation.z = moving && !reduced ? 0.018 * Math.sin(walkPhase) : 0;
      walker.drone.position.y = 2.05 + (reduced ? 0 : Math.sin(time * 2) * 0.12);
      walker.drone.rotation.y = time * 0.9;

      const nextZone = travelZ < 23 ? 0 : travelZ < 59 ? 1 : travelZ < 96 ? 2 : 3;
      const forcedZone =
        requestedTravelZ !== null
          ? requestedTravelZ < 23
            ? 0
            : requestedTravelZ < 59
              ? 1
              : requestedTravelZ < 96
                ? 2
                : 3
          : nextZone;
      if (forcedZone !== zone) {
        zone = forcedZone;
        transition = 1;
        zoneRef.current(zone);
      }
      transition *= reduced ? 0 : 0.94;

      const baseColor = new THREE.Color(palette[zone][0]);
      const accentColor = new THREE.Color(palette[zone][1]);
      scene.background = baseColor;
      (scene.fog as THREE.FogExp2).color.lerp(baseColor, 0.08);
      path.edgeMaterial.color.lerp(accentColor, 0.05);
      hemi.color.lerp(accentColor, 0.015);
      walker.lanternLight.color.lerp(accentColor, 0.03);

      basecamp.fireLight.intensity = 22 + Math.sin(time * 11) * 4;
      basecamp.flame.scale.y = 1 + Math.sin(time * 13) * 0.16;
      lab.holo.rotation.y = time * 0.58;
      lab.holo.rotation.x = Math.sin(time * 0.8) * 0.28;
      lab.holo.position.y = 2.05 + Math.sin(time * 1.4) * 0.1;
      signal.ring.rotation.z = time * 0.22;
      signal.light.intensity = 27 + Math.sin(time * 2.1) * 6;
      signal.stones.forEach((stone, index) => {
        stone.rotation.y = time * (0.18 + index * 0.035);
      });
      district.orbs.forEach((orb, index) => {
        orb.rotation.y = time * (0.28 + index * 0.025);
        orb.position.y = (orb.userData.baseY as number) + Math.sin(time * 1.25 + index) * 0.08;
        const selected = orb === hovered;
        const scale = selected ? 1.32 : 1;
        orb.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.14);
      });

      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(district.hitboxes, false)[0]?.object as THREE.Mesh | undefined;
      hovered = hit ?? null;
      renderer.domElement.style.cursor = hovered ? "pointer" : "default";

      target.copy(walker.root.position).add(new THREE.Vector3(0, 1.05, -2.5));
      desiredCamera.set(
        walker.root.position.x + pointerX * (reduced ? 0 : 0.9),
        3.4 + transition * 0.45,
        walker.root.position.z + 7.9,
      );
      camera.position.lerp(desiredCamera, 0.075);
      camera.lookAt(target);
      camera.fov += (48 + transition * 4.5 - camera.fov) * 0.12;
      camera.updateProjectionMatrix();
      dust.position.z = -travelZ * 0.08;
      WorldTiles({
        scene,
        centerX: walker.root.position.x,
        centerZ: walker.root.position.z,
        tiles: worldTiles,
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("ohaki:travel", moveToChapter);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("click", pointerClick);
      joystick?.removeEventListener("pointerdown", joystickStart);
      joystick?.removeEventListener("pointermove", joystickMove);
      joystick?.removeEventListener("pointerup", joystickEnd);
      joystick?.removeEventListener("pointercancel", joystickEnd);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const material = object.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
          const texture = object.userData.texture as THREE.Texture | undefined;
          texture?.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [projects]);

  return <div className="game-world" ref={mountRef} />;
}

function Intro({ start }: { start: () => void }) {
  return (
    <div className="game-intro">
      <div className="intro-card">
        <span className="eyebrow">OHAKIDEV / INTERACTIVE PORTFOLIO</span>
        <h1>Drive the story yourself.</h1>
        <p>
          This is not a page to scroll. Walk through my work as a small explorable 3D world.
          Every place is a chapter. Every glowing object is real.
        </p>
        <button type="button" className="start-button" onClick={start}>
          Enter the world <ArrowIcon />
        </button>
        <small>WASD / arrow keys · mobile joystick · no portrait</small>
      </div>
    </div>
  );
}

function ProjectPanel({ project, close }: { project: Project; close: () => void }) {
  return (
    <aside className="project-panel" aria-live="polite">
      <button className="panel-close" type="button" onClick={close} aria-label="Close project detail">×</button>
      <p className="eyebrow">PROJECT OBJECT</p>
      <h2>{project.name}</h2>
      <p>{project.description}</p>
      <div className="project-meta">
        <span>{project.language ?? "Mixed stack"}</span>
        <span>★ {project.stars}</span>
        <span>{new Date(project.pushedAt).getFullYear()}</span>
      </div>
      <div className="panel-actions">
        <a href={project.url} target="_blank" rel="noreferrer">View source <ArrowIcon /></a>
        {project.homepage && <a href={project.homepage} target="_blank" rel="noreferrer">Open live project</a>}
      </div>
    </aside>
  );
}

function ZoneCard({
  zone,
  portfolio,
  projects,
}: {
  zone: number;
  portfolio: GitHubPortfolio;
  projects: Project[];
}) {
  const content = [
    {
      kicker: "00 / ARRIVAL",
      title: "Curious by default.",
      copy: `I am ${portfolio.name}. I research what can make life better, then turn the useful parts into working products.`,
    },
    {
      kicker: "01 / PROCESS",
      title: "Observe. Connect. Prototype. Refine.",
      copy: "The lab is how I work: start from friction, connect the systems, build a proof, and remove everything that does not help.",
    },
    {
      kicker: "02 / PUBLIC TRAIL",
      title: `${projects.length} experiments you can inspect.`,
      copy: "Walk between the project stations. Click a glowing object to open the real repository and live deployment.",
    },
    {
      kicker: "03 / NEXT SIGNAL",
      title: "What should we make less difficult?",
      copy: "The end of this road is an invitation. If the next useful experiment is yours, send the signal on GitHub.",
    },
  ][zone];

  return (
    <section className="zone-card" key={zone}>
      <span>{content.kicker}</span>
      <h2>{content.title}</h2>
      <p>{content.copy}</p>
      {zone === 3 && (
        <a className="signal-link" href={portfolio.profileUrl} target="_blank" rel="noreferrer">
          Open GitHub <ArrowIcon />
        </a>
      )}
    </section>
  );
}

export function Journey({ portfolio }: { portfolio: GitHubPortfolio }) {
  const [started, setStarted] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [zone, setZone] = useState(0);
  const [project, setProject] = useState<Project | null>(null);
  const projects = useMemo(
    () => [...portfolio.projects].sort((a, b) => Date.parse(a.pushedAt) - Date.parse(b.pushedAt)),
    [portfolio.projects],
  );

  return (
    <main className="game-shell">
      <GameWorld projects={projects} onActiveZone={setZone} onProject={setProject} />

      {!started && <Intro start={() => setStarted(true)} />}

      <header className="game-topbar">
        <a className="brand" href={portfolio.profileUrl} target="_blank" rel="noreferrer">
          <span>O</span>
          <strong>ohaki.world</strong>
        </a>
        <div className="zone-name">
          <i style={{ background: chapters[zone].color }} />
          {chapters[zone].label}
        </div>
        <a className="github-link" href={portfolio.profileUrl} target="_blank" rel="noreferrer" aria-label="GitHub profile">
          <GitHubIcon />
        </a>
      </header>

      <button
        type="button"
        className="avatar-badge"
        aria-expanded={avatarOpen}
        aria-controls="avatar-story"
        onClick={() => setAvatarOpen((open) => !open)}
      >
        <span aria-hidden="true">3D</span>
        <strong>OHKI EXPLORER</strong>
      </button>

      {avatarOpen && (
        <aside className="avatar-story" id="avatar-story">
          <button type="button" aria-label="Close avatar story" onClick={() => setAvatarOpen(false)}>×</button>
          <p>YOUR PLAYABLE IDENTITY</p>
          <h2>Builder. Researcher. Explorer.</h2>
          <span>
            A stylized avatar reconstructed with img2threejs: cyan visor, coral field harness,
            locator lantern and companion drone. It represents the journey—not a fabricated face.
          </span>
        </aside>
      )}

      {started && <ZoneCard zone={zone} portfolio={portfolio} projects={projects} />}

      <div className="controls-hint" aria-hidden="true">
        <span className="key">W</span>
        <span className="keyrow"><i>A</i><i>S</i><i>D</i></span>
        <b>move</b>
      </div>

      <div className="joystick" aria-label="Move through the world">
        <i />
      </div>

      <div className="world-progress" aria-label={`Chapter ${zone + 1} of ${chapters.length}`}>
        {chapters.map((chapter, index) => (
          <button
            key={chapter.id}
            type="button"
            className={zone === index ? "active" : ""}
            aria-label={chapter.label}
            onClick={() => {
              window.dispatchEvent(new CustomEvent("ohaki:travel", { detail: index }));
            }}
          >
            <i style={{ background: chapter.color }} />
            <span>{chapter.label}</span>
          </button>
        ))}
      </div>

      {project && <ProjectPanel project={project} close={() => setProject(null)} />}

      <div className="corner-credit">
        Three.js world · live GitHub data
      </div>
    </main>
  );
}
