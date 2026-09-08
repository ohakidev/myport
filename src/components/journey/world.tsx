"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Project } from "@/lib/github";
import { chapterColors, chapterNames } from "@/components/journey/palette";

type RuntimeState = {
  mode: "intro" | "playing";
  player: { x: number; y: number; vx: number; vy: number; grounded: boolean; facing: number };
  cameraX: number;
  chapter: number;
  loopCount: number;
  normalizedX: number;
  worldLength: number;
  seamTransition: boolean;
  nearbyProject: string | null;
  selectedProject: string | null;
  coordinateNote: string;
};

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

function addBox(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
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

function makeLabel(title: string, subtitle: string, accent: string, width = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 320;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "rgba(12, 34, 42, .88)";
  context.fillRect(18, 18, width - 36, 284);
  context.strokeStyle = accent;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(64, 302);
  context.lineTo(width - 64, 302);
  context.stroke();
  context.fillStyle = accent;
  context.font = "700 42px monospace";
  context.textAlign = "left";
  context.fillText(subtitle.toUpperCase(), 64, 92);
  context.fillStyle = "#f8f4e8";
  context.font = title.length > 19 ? "800 54px sans-serif" : "800 68px sans-serif";
  context.fillText(title, 64, 207, width - 128);
  context.fillStyle = "rgba(255,255,255,.5)";
  context.font = "600 26px monospace";
  context.fillText("PRESS E TO INSPECT", 64, 260);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(5.7, 1.78, 1);
  sprite.userData.texture = texture;
  return sprite;
}

function makeCloud(scale: number, color: number) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 });
  [
    [-0.9, 0, 0, 0.72],
    [0, 0.24, 0, 1],
    [1, 0, 0, 0.7],
    [0.2, -0.2, 0, 1.05],
  ].forEach(([x, y, z, s]) => {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), material);
    puff.position.set(x, y, z);
    puff.scale.setScalar(s);
    group.add(puff);
  });
  group.scale.setScalar(scale);
  return group;
}

function buildExplorer() {
  const root = new THREE.Group();
  root.name = "ohaki-explorer";
  const navy = new THREE.MeshStandardMaterial({ color: 0x235c62, roughness: 0.72, metalness: 0.08 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x08111f, roughness: 0.75 });
  const coral = new THREE.MeshStandardMaterial({ color: 0xff715f, roughness: 0.44 });
  const cyan = new THREE.MeshStandardMaterial({ color: 0x64e8ff, emissive: 0x2abbd2, emissiveIntensity: 2.1, roughness: 0.18 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xc57a18, emissiveIntensity: 1.5 });

  const body = new THREE.Group();
  body.position.y = 1.35;
  root.add(body);
  // Tailored silhouette rather than stacked capsules: flared expedition coat.
  const coatProfile = [[0.43, -0.55], [0.46, -0.48], [0.32, -0.12], [0.36, 0.27], [0.29, 0.43], [0.18, 0.47]];
  sculpt(body, new THREE.LatheGeometry(coatProfile.map(([r, y]) => new THREE.Vector2(r, y)), 24), navy, [0, 0, 0], [1, 1, 0.8]);
  const ivory = new THREE.MeshStandardMaterial({ color: 0xe8ddc5, roughness: 0.4, metalness: 0.22 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xcba66d, roughness: 0.3, metalness: 0.65 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0xc45239, roughness: 1, side: THREE.DoubleSide });
  const collar = sculpt(body, new THREE.TorusGeometry(0.24, 0.095, 8, 24), fabric, [0, 0.49, 0]);
  collar.rotation.x = Math.PI / 2;
  const scarf = new THREE.Group();
  scarf.position.set(0, 0.46, -0.2);
  const scarfGeometry = new THREE.PlaneGeometry(0.29, 1.12, 4, 18);
  scarfGeometry.translate(0, -0.56, 0);
  const scarfRest = Float32Array.from(scarfGeometry.attributes.position.array);
  sculpt(scarf, scarfGeometry, fabric, [0, 0, 0]);
  body.add(scarf);
  const breastplate = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 12), ivory);
  breastplate.scale.set(1, 0.8, 0.35);
  breastplate.position.set(0, 0.12, 0.29);
  body.add(breastplate);
  const backpack = addBox(body, [0.56, 0.66, 0.3], [0, 0.05, -0.38], dark);
  addBox(backpack, [0.36, 0.06, 0.035], [0, 0.18, -0.17], amber);
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), ivory);
    shoulder.position.set(side * 0.44, 0.36, 0);
    body.add(shoulder);
  }
  const clasp = sculpt(body, new THREE.CylinderGeometry(0.085, 0.085, 0.035, 16), brass, [0, 0.17, 0.4]);
  clasp.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    addBox(body, [0.055, 0.57, 0.03], [side * 0.23, -0.06, 0.31], brass);
    sculpt(backpack, new THREE.CylinderGeometry(0.11, 0.11, 0.57, 12), ivory, [side * 0.36, 0, 0]);
  }
  const harnessA = addBox(body, [0.08, 0.74, 0.07], [0, 0.02, -0.39], coral);
  harnessA.rotation.z = 0.72;
  const harnessB = addBox(body, [0.08, 0.74, 0.07], [0, 0.02, -0.4], coral);
  harnessB.rotation.z = -0.72;

  const head = new THREE.Group();
  head.position.y = 0.84;
  body.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.47, 32, 24), ivory);
  helmet.scale.set(1, 0.94, 0.92);
  head.add(helmet);
  const visorMaterial = new THREE.MeshPhysicalMaterial({color: 0x102c39, metalness: 0.5, roughness: 0.14, clearcoat: 1});
  sculpt(head, new THREE.SphereGeometry(0.4, 32, 16), visorMaterial, [0, -0.01, 0.23], [1, 0.62, 0.64]);
  for (const side of [-1, 1]) {
    sculpt(head, new THREE.SphereGeometry(0.055, 12, 8), cyan, [side * 0.14, -0.025, 0.478], [0.65, 1, 0.4]);
  }
  sculpt(head, new THREE.SphereGeometry(0.15, 16, 10), ivory, [-0.17, 0.17, 0.41], [1, 0.16, 0.15]);
  const helmetBand = sculpt(head, new THREE.TorusGeometry(0.445, 0.022, 8, 40), brass, [0, 0.1, 0]);
  helmetBand.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 12), coral);
    pod.rotation.z = Math.PI / 2;
    pod.position.x = side * 0.46;
    head.add(pod);
  }

  const armL = new THREE.Group();
  const armR = new THREE.Group();
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  const elbows: THREE.Group[] = [];
  const knees: THREE.Group[] = [];
  [armL, armR].forEach((arm, index) => {
    arm.position.set(index ? 0.46 : -0.46, 0.34, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.2, 5, 10), navy);
    upper.position.y = -0.2;
    arm.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.38;
    arm.add(elbow);
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.18, 5, 10), ivory);
    forearm.position.y = -0.16;
    elbow.add(forearm);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 9), dark);
    glove.position.y = -0.35;
    elbow.add(glove);
    elbows.push(elbow);
    body.add(arm);
  });
  [legL, legR].forEach((leg, index) => {
    leg.position.set(index ? 0.2 : -0.2, 0.98, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.23, 5, 10), navy);
    thigh.position.y = -0.22;
    leg.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    leg.add(knee);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.23, 5, 10), ivory);
    shin.position.y = -0.2;
    knee.add(shin);
    addBox(knee, [0.28, 0.2, 0.43], [0, -0.43, 0.1], dark);
    knees.push(knee);
    root.add(leg);
  });

  const lantern = new THREE.Group();
  lantern.position.set(0, -0.46, 0);
  lantern.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), amber));
  const lanternRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 20), amber);
  lanternRing.rotation.x = Math.PI / 2;
  lantern.add(lanternRing);
  elbows[1].add(lantern);

  const drone = new THREE.Group();
  drone.position.set(0.95, 2.1, 0);
  drone.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), cyan));
  const droneRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.018, 6, 30), cyan);
  droneRing.rotation.x = Math.PI / 2;
  drone.add(droneRing);
  root.add(drone);

  root.traverse((object) => {
    if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
  });
  root.userData.source = "procedural expedition explorer";
  root.userData.identity = "stylized builder/explorer; not a facial likeness";
  return { root, body, head, scarf, scarfGeometry, scarfRest, armL, armR, legL, legR, elbows, knees, lantern, drone, droneRing };
}

type Platform = { min: number; max: number; top: number };

function buildPlatform(scene: THREE.Scene, min: number, max: number, top: number, accent: string) {
  const width = max - min;
  const earth = new THREE.MeshStandardMaterial({ color: 0x3e4b50, roughness: 0.95 });
  const edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), emissive: new THREE.Color(accent), emissiveIntensity: 0.36, roughness: 0.5 });
  addBox(scene, [width, 1.2, 5.5], [(min + max) / 2, top - 0.6, 0], earth);
  const paving = new THREE.MeshStandardMaterial({ color: 0x9b9b83, roughness: 0.92 });
  addBox(scene, [width, 0.16, 5.7], [(min + max) / 2, top - 0.02, 0], paving);
  addBox(scene, [width, 0.045, 0.06], [(min + max) / 2, top - 0.28, 2.78], edge);
  const supports = Math.max(2, Math.floor(width / 5));
  for (let i = 0; i < supports; i += 1) {
    const x = min + 2 + (i / Math.max(1, supports - 1)) * Math.max(0, width - 4);
    const crag = sculpt(scene, new THREE.ConeGeometry(1.8, 3 + i % 2, 5), earth, [x, top - 2, 0], [1.5, 1, 1.5]);
    crag.rotation.z = Math.PI;
    crag.rotation.y = i * 0.7;
  }
  // Set dressing stays behind the playable lane; collision remains unchanged.
  const stone = new THREE.MeshStandardMaterial({ color: 0x697477, roughness: 1, flatShading: true });
  const foliage = new THREE.MeshStandardMaterial({ color: 0x548878, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 3; i += 1) {
    const x = min + 1.4 + i * (width - 2.8) / 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34 + i * 0.07, 0), stone);
    rock.position.set(x, top + 0.22, -2);
    rock.scale.set(1.5, 0.7, 1);
    rock.rotation.y = x * 0.7;
    rock.castShadow = true;
    scene.add(rock);
    const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), foliage);
    shrub.position.set(x + 0.65, top + 0.36, -2.1);
    shrub.scale.set(0.75, 1 + i * 0.2, 0.8);
    shrub.castShadow = true;
    scene.add(shrub);
  }
  if (width > 15) {
    const trunk = new THREE.MeshStandardMaterial({ color: 0x544d48, roughness: 1 });
    const leaves = new THREE.MeshStandardMaterial({ color: new THREE.Color(accent).lerp(new THREE.Color(0xd99475), 0.72), roughness: 1, flatShading: true });
    const tree = new THREE.Group();
    tree.position.set(min + 3, top, -2.1);
    sculpt(tree, new THREE.CylinderGeometry(0.1, 0.24, 2.6, 7), trunk, [0, 1.3, 0]);
    for (let branch = 0; branch < 4; branch += 1) {
      const angle = branch * 2.4;
      const limb = sculpt(tree, new THREE.CylinderGeometry(0.045, 0.1, 1.15, 6), trunk, [Math.cos(angle) * 0.35, 1.8 + branch * 0.18, Math.sin(angle) * 0.3]);
      limb.rotation.z = Math.cos(angle) * 0.6;
      sculpt(tree, new THREE.IcosahedronGeometry(0.9, 1), leaves, [Math.cos(angle) * 0.7, 2.55 + branch * 0.17, Math.sin(angle) * 0.55], [1.25, 0.64, 1]);
    }
    scene.add(tree);
  }
}

function buildProjectStation(project: Project, index: number, x: number, top: number, accent: string) {
  const group = new THREE.Group();
  group.position.set(x, top, -1.6);
  group.name = `repo-${project.name}`;
  const accentColor = new THREE.Color(accent);
  const metal = new THREE.MeshStandardMaterial({ color: 0x243750, metalness: 0.25, roughness: 0.52 });
  const glow = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 1.45, roughness: 0.26 });
  const glass = new THREE.MeshPhysicalMaterial({ color: accentColor, transparent: true, opacity: 0.27, roughness: 0.1, transmission: 0.18, emissive: accentColor, emissiveIntensity: 0.2 });

  const porcelain = new THREE.MeshStandardMaterial({ color: 0xd6cfb4, roughness: 0.65 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb88c4f, metalness: 0.55, roughness: 0.36 });
  sculpt(group, new THREE.CylinderGeometry(2.05, 2.35, 0.32, 12), metal, [0, 0.16, 0]);
  sculpt(group, new THREE.CylinderGeometry(1.8, 2.05, 0.18, 12), porcelain, [0, 0.4, 0]);
  const core = sculpt(group, new THREE.IcosahedronGeometry(0.55, 1), glass, [0, 2.7, 0]);
  const pulse = sculpt(group, new THREE.TorusGeometry(1, 0.035, 8, 56, Math.PI * 1.8), brass, [0, 2.7, 0]);
  const signal = sculpt(group, new THREE.OctahedronGeometry(0.13, 0), glow, [0, 4.85, 0]);
  // Six authored silhouettes, one interaction contract and palette.
  switch (index % 6) {
    case 0: { // Observatory: nested armillary rings and telescope.
      for (let ring = 0; ring < 3; ring += 1) {
        const orbit = sculpt(group, new THREE.TorusGeometry(1.5 + ring * 0.12, 0.075, 8, 48), ring === 1 ? porcelain : brass, [0, 2.5, 0]);
        orbit.rotation.set(ring * 0.7, ring * 0.9, 0.3);
      }
      const telescope = sculpt(group, new THREE.CylinderGeometry(0.32, 0.46, 2.7, 24), porcelain, [0, 2.5, 0]);
      telescope.rotation.z = -0.8;
      break;
    }
    case 1: { // Campus archive: a small colonnade with a pitched roof.
      for (const x of [-1.5, -0.5, 0.5, 1.5]) sculpt(group, new THREE.CylinderGeometry(0.14, 0.2, 2.8, 12), porcelain, [x, 1.9, -0.35]);
      const roof = sculpt(group, new THREE.ConeGeometry(2.45, 1.1, 4), metal, [0, 3.85, 0], [1, 1, 0.72]);
      roof.rotation.y = Math.PI / 4;
      addBox(group, [3.8, 0.25, 1.8], [0, 3.25, 0], brass);
      break;
    }
    case 2: { // Connected systems: suspended terraces and bridges.
      for (let tower = 0; tower < 3; tower += 1) {
        const x = (tower - 1) * 1.3;
        const height = 2.1 + (tower % 2) * 1.2;
        sculpt(group, new THREE.CylinderGeometry(0.4, 0.62, height, 6), porcelain, [x, height / 2 + 0.5, 0]);
        sculpt(group, new THREE.CylinderGeometry(0.65, 0.65, 0.13, 6), brass, [x, height + 0.5, 0]);
      }
      addBox(group, [3.4, 0.16, 0.5], [0, 2.2, 0.4], metal);
      break;
    }
    case 3: { // Observatory network: a faceted geodesic dome.
      const dome = sculpt(group, new THREE.IcosahedronGeometry(1.8, 1), glass, [0, 2.2, 0]);
      const frame = new THREE.LineSegments(new THREE.EdgesGeometry(dome.geometry), new THREE.LineBasicMaterial({color: 0xcba66d}));
      dome.add(frame);
      for (const x of [-1.6, 1.6]) sculpt(group, new THREE.CylinderGeometry(0.09, 0.15, 3.8, 8), porcelain, [x, 2.3, 0]);
      break;
    }
    case 4: { // Signal exchange: a stepped brass transmission spire.
      for (let level = 0; level < 5; level += 1) {
        const radius = 1.55 - level * 0.25;
        sculpt(group, new THREE.CylinderGeometry(radius * 0.75, radius, 0.58, 8), level % 2 ? brass : porcelain, [0, 0.85 + level * 0.7, 0]);
      }
      break;
    }
    default: { // Portfolio atelier: an open arched gateway.
      const arch = sculpt(group, new THREE.TorusGeometry(1.65, 0.22, 12, 48, Math.PI), porcelain, [0, 2.5, 0]);
      arch.rotation.z = 0;
      for (const x of [-1.65, 1.65]) sculpt(group, new THREE.CylinderGeometry(0.22, 0.32, 2.1, 12), porcelain, [x, 1.5, 0]);
      const inner = sculpt(group, new THREE.TorusGeometry(1.3, 0.04, 8, 48), glow, [0, 2.35, 0]);
      inner.rotation.y = 0.3;
    }
  }

  const year = new Date(project.createdAt).getFullYear();
  const label = makeLabel(project.name, `${year} / ${project.language ?? "EXPERIMENT"}`, accent);
  label.position.set(0, 6.25, 0);
  group.add(label);
  group.traverse((item) => { if (item instanceof THREE.Mesh) item.userData.projectIndex = index; });
  group.userData.runtime = { pulse, signal, core, label, baseY: label.position.y };
  return group;
}

function buildSeamPortal(x: number, accent: string) {
  const group = new THREE.Group();
  group.position.set(x, 0, 0);
  group.name = "loop-seam-portal";
  const color = new THREE.Color(accent);
  const glow = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 2.4,
    transparent: true,
    opacity: 0.78,
    roughness: 0.2,
  });
  for (let index = 0; index < 4; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35 + index * 0.42, 0.055, 8, 56), glow);
    ring.position.y = 3.9;
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = index * 0.4;
    ring.userData.spin = (index % 2 ? -1 : 1) * (0.2 + index * 0.08);
    group.add(ring);
  }
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 1), glow);
  core.position.y = 3.9;
  core.userData.pulse = true;
  group.add(core);
  const light = new THREE.PointLight(color, 6, 13, 2);
  light.position.y = 3.9;
  group.add(light);
  return group;
}

function buildWorldParticles(worldLength: number) {
  const count = 260;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = Math.random() * worldLength;
    positions[index * 3 + 1] = 0.8 + Math.random() * 12;
    positions[index * 3 + 2] = -3 - Math.random() * 11;
    color.set(index % 3 === 0 ? "#ffd166" : index % 3 === 1 ? "#64e8ff" : "#fff8ea");
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 0.075, transparent: true, opacity: 0.6, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geometry, material);
  points.name = "world-particles";
  return points;
}

function buildSpeedStreaks() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0x64e8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  for (let index = 0; index < 18; index += 1) {
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + (index % 4) * 0.7, 0.018 + (index % 3) * 0.012), material.clone());
    streak.position.set(-7 + (index % 9) * 1.8, 1.2 + (index % 6) * 1.35, -1.2 - (index % 4));
    streak.userData.phase = index * 0.61;
    group.add(streak);
  }
  group.name = "speed-streaks";
  return group;
}

function buildWorld(projects: Project[]) {
  const scene = new THREE.Scene();
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 2;
  skyCanvas.height = 512;
  const skyContext = skyCanvas.getContext("2d")!;
  const skyGradient = skyContext.createLinearGradient(0, 0, 0, 512);
  skyGradient.addColorStop(0, "#447c88");
  skyGradient.addColorStop(0.55, "#b4d0c3");
  skyGradient.addColorStop(1, "#efd3aa");
  skyContext.fillStyle = skyGradient;
  skyContext.fillRect(0, 0, 2, 512);
  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTexture;
  scene.fog = new THREE.Fog(0xb4d0c3, 32, 85);
  scene.add(new THREE.HemisphereLight(0xffedd3, 0x17273e, 1.6));
  const rim = new THREE.DirectionalLight(0x8edbea, 2.2);
  rim.position.set(6, 9, -8);
  scene.add(rim);
  const sun = new THREE.DirectionalLight(0xffe4b2, 3.2);
  sun.position.set(-8, 16, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 15, bottom: -10, near: 0.5, far: 65 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.00015;
  scene.add(sun);

  const worldLength = Math.max(168, projects.length * 24);
  const platforms: Platform[] = [];
  const segmentCount = Math.ceil(worldLength / 24);
  for (const offset of [-1, 0, 1]) {
    const offsetX = offset * worldLength;
    for (let i = 0; i < segmentCount; i += 1) {
      const localMin = -10 + i * 24;
      const min = localMin + offsetX;
      const max = min + (i === 0 ? 22 : 20);
      const top = i > 0 && i % 3 === 1 ? 0.7 : i > 0 && i % 3 === 2 ? 0.25 : 0;
      const accent = chapterColors[i % chapterColors.length];
      if (offset === 0) platforms.push({ min, max, top });
      buildPlatform(scene, min, max, top, accent);
      if (i > 0) {
        const bridgeTop = top + 2.7 + (i % 2) * 0.65;
        const bridge: Platform = { min: min + 5.8, max: min + 10.8, top: bridgeTop };
        if (offset === 0) platforms.push(bridge);
        buildPlatform(scene, bridge.min, bridge.max, bridge.top, accent);
      }
    }
  }

  const far = new THREE.Group();
  far.position.z = -18;
  sculpt(far, new THREE.SphereGeometry(3.1, 40, 24), new THREE.MeshBasicMaterial({color: 0xffdfae}), [8, 9, -12]);
  const mountainMaterial = new THREE.MeshStandardMaterial({ color: 0x679689, roughness: 1, flatShading: true });
  for (let x = -30; x < worldLength + 40; x += 10) {
    const height = 5 + (Math.sin(x * 1.71) + 1) * 2.8;
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(7.8, height, 5), mountainMaterial);
    mountain.rotation.y = x * 0.13;
    mountain.position.set(x, height / 2 - 1.8, 0);
    far.add(mountain);
  }
  scene.add(far);

  const mid = new THREE.Group();
  mid.position.z = -10;
  for (let x = -12; x < worldLength + 20; x += 14) {
    const towerHeight = 2.5 + ((x * 17) % 5 + 5) % 5;
    const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x526773, roughness: 0.85 });
    const tower = addBox(mid, [2.2, towerHeight, 1.8], [x, towerHeight / 2 - 0.5, 0], towerMaterial);
    addBox(mid, [2.5, 0.18, 2], [x, towerHeight - 0.45, 0], towerMaterial);
    tower.castShadow = false;
    for (let row = 0; row < Math.floor(towerHeight); row += 1) {
      const windowLight = addBox(mid, [0.32, 0.18, 0.05], [x, row + 0.4, 0.93], new THREE.MeshBasicMaterial({ color: row % 2 ? 0xffd166 : 0x64e8ff }));
      windowLight.castShadow = false;
    }
  }
  scene.add(mid);

  const clouds = new THREE.Group();
  clouds.position.z = -7;
  for (let i = 0; i < 14; i += 1) {
    const cloud = makeCloud(0.8 + (i % 3) * 0.22, 0xffe9d1);
    cloud.position.set(-10 + i * 14, 9 + (i % 4) * 1.4, 0);
    clouds.add(cloud);
  }
  scene.add(clouds);

  const stations = projects.map((project, index) => {
    const x = 12 + index * 24;
    const ground = platforms.find((platform) => platform.min <= x && platform.max >= x && platform.top < 2);
    const top = ground?.top ?? 0;
    const station = buildProjectStation(project, index, x, top, chapterColors[index % chapterColors.length]);
    scene.add(station);
    return { project, x, top, group: station };
  });

  const startGate = new THREE.Group();
  const gateGlow = new THREE.MeshStandardMaterial({ color: 0x64e8ff, emissive: 0x2eb7d0, emissiveIntensity: 1.35 });
  addBox(startGate, [0.28, 4.2, 0.3], [-1.65, 2.1, 0], gateGlow);
  addBox(startGate, [0.28, 4.2, 0.3], [1.65, 2.1, 0], gateGlow);
  addBox(startGate, [3.6, 0.28, 0.3], [0, 4.1, 0], gateGlow);
  const startLabel = makeLabel("OHAKI SIDE QUEST", "2019 / RESEARCH BEGINS", "#64e8ff");
  startLabel.position.set(0, 6, 0);
  startGate.add(startLabel);
  startGate.position.x = -2;
  scene.add(startGate);

  const finish = new THREE.Group();
  finish.position.set(worldLength - 11, 0, 0);
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, 8, 10), gateGlow);
  beacon.position.y = 4;
  finish.add(beacon);
  for (let index = 0; index < 3; index += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1 + index * 0.55, 0.055, 8, 48), gateGlow);
    ring.position.y = 7.7;
    ring.rotation.x = Math.PI / 2;
    ring.userData.spin = 0.16 + index * 0.08;
    finish.add(ring);
  }
  const finishLabel = makeLabel("THE NEXT USEFUL THING", "OPEN CHANNEL / GITHUB", "#a7f46a");
  finishLabel.position.set(0, 10.3, 0);
  finish.add(finishLabel);
  scene.add(finish);

  const seamPortal = buildSeamPortal(worldLength - 1.5, "#64e8ff");
  scene.add(seamPortal);

  return { scene, sun, platforms, stations, far, mid, clouds, finish, seamPortal, worldLength };
}

type TestRuntimeWindow = Window & {
  __ohaki_test_set_state?: (state: Partial<{ x: number; y: number; vx: number; vy: number; grounded: boolean }>) => void;
};

export function GameWorld({
  started,
  projects,
  selectedProject,
  onActiveChapter,
  onNearbyProject,
  onProject,
  onLoop,
}: {
  started: boolean;
  projects: Project[];
  selectedProject: Project | null;
  onActiveChapter: (chapter: number) => void;
  onNearbyProject: (project: Project | null) => void;
  onProject: (project: Project) => void;
  onLoop: (loop: number, direction: number) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(started);
  const selectedRef = useRef(selectedProject);

  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { selectedRef.current = selectedProject; }, [selectedProject]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const { scene, sun, platforms, stations, far, mid, clouds, finish, seamPortal, worldLength } = buildWorld(projects);
    scene.add(sun.target);
    const explorer = buildExplorer();
    scene.add(explorer.root);
    const particles = buildWorldParticles(worldLength);
    const speedStreaks = buildSpeedStreaks();
    scene.add(particles, speedStreaks);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // One small environment bake gives the visor and brass real reflections,
    // without downloading HDR assets or adding a second per-frame render pass.
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentTarget = pmrem.fromScene(environment, 0.04);
    scene.environment = environmentTarget.texture;
    scene.environmentIntensity = 0.45;
    environment.dispose();
    pmrem.dispose();
    renderer.domElement.setAttribute("aria-label", "Playable side-scrolling GitHub portfolio world");
    renderer.domElement.dataset.gameCanvas = "true";
    renderer.domElement.tabIndex = 0;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 140);
    camera.position.set(4, 5.4, 22);
    camera.lookAt(4, 3.2, 0);
    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(4, 4);
    const keys = new Set<string>();
    let wheelUntil = 0;
    let wheelDirection = 0;
    let elapsed = 0;
    let lastChapter = -1;
    let lastNear = -2;
    let hoveredIndex = -1;
    let facing = 1;
    let jumpQueued = false;
    let moveImpulse = 0;
    let grounded = true;
    let checkpointX = 0;
    let cameraX = 4;
    let loopCount = 0;
    let seamTransition = false;
    let seamUntil = 0;
    let cameraKick = 0;
    let gaitPhase = 0;
    let landingCompression = 0;
    let locomotionBlend = 0;
    let accelerationLean = 0;
    let lanternVelocity = 0;
    let lanternSwing = 0;
    let cameraDepth = 22;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduceMotion = motionQuery.matches;
    const motionChange = () => { reduceMotion = motionQuery.matches; };
    motionQuery.addEventListener("change", motionChange);
    const impact = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.41, 48),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    impact.rotation.x = -Math.PI / 2;
    scene.add(impact);
    let impactAge = 1;
    const player = { x: 0, y: 0, vx: 0, vy: 0 };

    const updateFrustum = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      const aspect = width / height;
      const frustumHeight = width < 720 ? 18 : 16;
      camera.aspect = aspect;
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(frustumHeight / 44));
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 720 ? 1.35 : 1.7));
    };
    updateFrustum();

    const requestJump = () => { if (startedRef.current && !selectedRef.current) jumpQueued = true; };
    const keyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault();
      keys.add(event.key.toLowerCase());
      if (["arrowright", "d"].includes(event.key.toLowerCase())) moveImpulse = 1;
      if (["arrowleft", "a"].includes(event.key.toLowerCase())) moveImpulse = -1;
      if ([" ", "arrowup", "w"].includes(event.key.toLowerCase()) && !event.repeat) requestJump();
      if (event.key.toLowerCase() === "e" && lastNear >= 0) onProject(projects[lastNear]);
      if (event.key.toLowerCase() === "f") {
        if (!document.fullscreenElement) mount.requestFullscreen().catch(() => undefined);
        else document.exitFullscreen().catch(() => undefined);
      }
    };
    const keyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const wheel = (event: WheelEvent) => {
      if (!startedRef.current || selectedRef.current) return;
      wheelDirection = Math.sign(event.deltaY || event.deltaX);
      wheelUntil = performance.now() + 180;
    };
    const pointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const pointerClick = () => {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(scene.children, true).find((item) => Number.isInteger(item.object.userData.projectIndex));
      if (hit) onProject(projects[hit.object.userData.projectIndex as number]);
    };
    const mobileAction = (event: Event) => {
      const action = (event as CustomEvent<string>).detail;
      if (action === "jump") requestJump();
      if (action === "interact" && lastNear >= 0) onProject(projects[lastNear]);
      if (action === "left" || action === "right") {
        keys.add(`mobile-${action}`);
        moveImpulse = action === "right" ? 1 : -1;
      }
      if (action === "left-up" || action === "right-up") keys.delete(`mobile-${action.replace("-up", "")}`);
    };
    const travel = (event: Event) => {
      const index = Math.max(0, Math.min(stations.length - 1, (event as CustomEvent<number>).detail));
      player.x = stations[index].x - 5;
      player.y = 5;
      player.vy = 0;
      cameraX = player.x;
    };
    const findLanding = (oldY: number, nextY: number, x: number, velocityY = player.vy) => {
      let landing: number | null = null;
      if (velocityY <= 0) {
        for (const platform of platforms) {
          if (x >= platform.min + 0.12 && x <= platform.max - 0.12 && oldY >= platform.top - 0.06 && nextY <= platform.top) {
            if (landing === null || platform.top > landing) landing = platform.top;
          }
        }
      }
      return landing;
    };

    const update = (dt: number) => {
      elapsed += dt;
      const canMove = startedRef.current && !selectedRef.current;
      const left = keys.has("a") || keys.has("arrowleft") || keys.has("mobile-left");
      const right = keys.has("d") || keys.has("arrowright") || keys.has("mobile-right");
      const wheelActive = performance.now() < wheelUntil;
      const input = canMove ? (right ? 1 : 0) - (left ? 1 : 0) + (wheelActive ? wheelDirection : 0) + moveImpulse : 0;
      moveImpulse = THREE.MathUtils.damp(moveImpulse, 0, 2.8, dt);
      const targetVelocity = THREE.MathUtils.clamp(input, -1, 1) * 7.8;
      const previousVelocity = player.vx;
      player.vx = THREE.MathUtils.damp(player.vx, targetVelocity, grounded ? 14 : 6, dt);
      const acceleration = dt > 0 ? (player.vx - previousVelocity) / dt : 0;
      if (Math.abs(input) > 0.01) facing = Math.sign(input);

      if (jumpQueued && grounded) { player.vy = 10.5; grounded = false; cameraKick = 0.16; }
      jumpQueued = false;
      player.vy -= 25 * dt;
      const oldY = player.y;
      let nextX = player.x + player.vx * dt;
      let nextY = player.y + player.vy * dt;
      const collisionX = ((nextX % worldLength) + worldLength) % worldLength;
      const landing = findLanding(oldY, nextY, collisionX);
      if (landing !== null) {
        nextY = landing;
        if (!grounded && player.vy < -2.5) {
          landingCompression = Math.min(0.2, Math.abs(player.vy) * 0.016);
          cameraKick = Math.min(0.1, Math.abs(player.vy) * 0.006);
          impactAge = 0;
          impact.position.set(collisionX, landing + 0.1, 0.55);
        }
        player.vy = 0;
        grounded = true;
        checkpointX = Math.max(checkpointX, nextX - 2);
      } else if (Math.abs(player.vy) > 0.05) grounded = false;
      if (nextX >= worldLength || nextX < 0) {
        const direction = nextX >= worldLength ? 1 : -1;
        nextX += direction > 0 ? -worldLength : worldLength;
        cameraX += direction > 0 ? -worldLength : worldLength;
        checkpointX += direction > 0 ? -worldLength : worldLength;
        loopCount += direction;
        seamTransition = true;
        seamUntil = elapsed + (reduceMotion ? 0.01 : 0.8);
        onLoop(loopCount, direction);
      }
      player.x = nextX;
      player.y = nextY;
      const localGround = (x: number) => ((x % worldLength) + worldLength) % worldLength;
      if (player.y < -8) { player.x = ((checkpointX % worldLength) + worldLength) % worldLength; player.y = 5; player.vx = 0; player.vy = 0; }
      if (seamTransition && elapsed >= seamUntil) seamTransition = false;

      explorer.root.position.set(player.x, player.y, 0.55);
      sun.position.x = player.x - 8;
      sun.target.position.x = player.x;
      // Turn in depth rather than collapsing the character through zero scale.
      explorer.root.rotation.y = THREE.MathUtils.damp(explorer.root.rotation.y, facing * 1.15, 9, dt);
      explorer.body.scale.y = THREE.MathUtils.damp(explorer.body.scale.y, 1, 9, dt);
      const speed = Math.min(1, Math.abs(player.vx) / 6);
      locomotionBlend = THREE.MathUtils.damp(locomotionBlend, grounded ? speed : 0, 10, dt);
      landingCompression = THREE.MathUtils.damp(landingCompression, 0, 12, dt);
      if (grounded) gaitPhase += Math.abs(player.vx) * dt * 2.1;
      const runPhase = gaitPhase;
      // Swing in the character's sagittal plane; flex knees during recovery,
      // not during the planted half of each stride.
      [explorer.legL, explorer.legR].forEach((leg, index) => {
        const phase = runPhase + index * Math.PI;
        const swing = Math.sin(phase);
        const airPose = player.vy > 0 ? (index ? 0.35 : -0.65) : -0.12;
        leg.rotation.x = THREE.MathUtils.damp(leg.rotation.x, grounded ? swing * 0.65 * locomotionBlend : airPose, 16, dt);
        leg.position.y = 0.98 - landingCompression;
        explorer.knees[index].rotation.x = THREE.MathUtils.damp(explorer.knees[index].rotation.x,
          grounded ? Math.max(0, -Math.cos(phase)) * 0.95 * locomotionBlend + landingCompression * 2 : (player.vy > 0 ? 0.85 : 0.25), 18, dt);
      });
      [explorer.armL, explorer.armR].forEach((arm, index) => {
        const phase = runPhase + index * Math.PI;
        arm.rotation.x = THREE.MathUtils.damp(arm.rotation.x, grounded ? -Math.sin(phase) * 0.5 * locomotionBlend : -0.45, 12, dt);
        arm.rotation.z = index ? -0.08 : 0.08;
        explorer.elbows[index].rotation.x = THREE.MathUtils.damp(explorer.elbows[index].rotation.x, -0.18 - speed * 0.55 - (grounded ? 0 : 0.25), 10, dt);
      });
      accelerationLean = THREE.MathUtils.damp(accelerationLean, reduceMotion ? 0 : THREE.MathUtils.clamp(acceleration * facing * 0.004, -0.14, 0.18), 6, dt);
      explorer.body.rotation.x = THREE.MathUtils.damp(explorer.body.rotation.x, speed * 0.16 + accelerationLean - landingCompression * 0.5, 8, dt);
      explorer.body.rotation.y = reduceMotion ? 0 : Math.sin(runPhase) * 0.05 * locomotionBlend;
      const breath = reduceMotion ? 0 : Math.sin(elapsed * 1.8) * 0.012 * (1 - speed);
      explorer.body.position.y = 1.35 - landingCompression + breath + Math.cos(runPhase * 2) * 0.035 * locomotionBlend;
      explorer.head.rotation.z = reduceMotion ? 0 : Math.sin(elapsed * 2.4) * 0.025;
      explorer.head.rotation.x = THREE.MathUtils.damp(explorer.head.rotation.x, -explorer.body.rotation.x * 0.55, 5, dt);
      explorer.scarf.rotation.x = THREE.MathUtils.damp(explorer.scarf.rotation.x, reduceMotion ? 0 : 0.18 + speed * 0.8 + Math.sin(elapsed * 4) * 0.06 * speed, 5, dt);
      explorer.scarf.rotation.z = reduceMotion ? 0 : Math.sin(elapsed * 3.2) * 0.07 * speed;
      const cloth = explorer.scarfGeometry.attributes.position;
      for (let i = 0; i < cloth.count; i += 1) {
        const u = -explorer.scarfRest[i * 3 + 1] / 1.12;
        const wave = reduceMotion ? 0 : Math.sin(elapsed * (4 + speed * 3) - u * 5) * u * u;
        cloth.setXYZ(i, explorer.scarfRest[i * 3] + wave * 0.045,
          explorer.scarfRest[i * 3 + 1], -u * u * speed * 0.38 + wave * (0.045 + speed * 0.14));
      }
      cloth.needsUpdate = true;
      explorer.scarfGeometry.computeVertexNormals();
      // Damped pendulum: acceleration excites it; gravity brings it to rest.
      lanternVelocity += (-lanternSwing * 22 - lanternVelocity * 6 - acceleration * facing * 0.045) * dt;
      lanternSwing = THREE.MathUtils.clamp(lanternSwing + lanternVelocity * dt, -0.6, 0.6);
      explorer.lantern.rotation.x = -explorer.armR.rotation.x - explorer.elbows[1].rotation.x + (reduceMotion ? 0 : lanternSwing);
      explorer.drone.position.y = THREE.MathUtils.damp(explorer.drone.position.y, 2.1 + (reduceMotion ? 0 : Math.sin(elapsed * 2.2) * 0.12 - player.vy * 0.018), 4, dt);
      explorer.drone.position.x = THREE.MathUtils.damp(explorer.drone.position.x, 0.95 - facing * speed * 0.3, 3, dt);
      if (!reduceMotion) explorer.droneRing.rotation.z += dt * 1.4;
      explorer.drone.rotation.z = THREE.MathUtils.damp(explorer.drone.rotation.z, reduceMotion ? 0 : -accelerationLean * 0.8, 3, dt);
      impactAge = Math.min(1, impactAge + dt * 2.1);
      impact.visible = !reduceMotion && impactAge < 1;
      impact.scale.setScalar(1 + impactAge * 3.8);
      impact.material.opacity = (1 - impactAge) ** 2 * 0.45;

      cameraKick = THREE.MathUtils.damp(cameraKick, 0, 7, dt);
      const targetCameraX = player.x + facing * (2.2 + speed * 2.3);
      cameraX = THREE.MathUtils.damp(cameraX, targetCameraX, 3.8 + speed * 2.2, dt);
      const cameraY = THREE.MathUtils.damp(camera.position.y, 5.25 + Math.max(0, player.y) * 0.27, 4.5, dt);
      const kickX = reduceMotion ? 0 : Math.sin(elapsed * 38) * cameraKick;
      const kickY = reduceMotion ? 0 : Math.cos(elapsed * 31) * cameraKick * 0.55;
      cameraDepth = THREE.MathUtils.damp(cameraDepth, 22 + (reduceMotion ? 0 : speed * 0.65), 2.5, dt);
      camera.position.set(cameraX + kickX, cameraY + kickY, cameraDepth);
      camera.lookAt(cameraX, cameraY - 2.1, 0);
      const wrapLayer = (value: number, factor: number) => value * factor;
      far.position.x = wrapLayer(cameraX, 0.16);
      mid.position.x = wrapLayer(cameraX, 0.35);
      clouds.position.x = wrapLayer(cameraX, 0.54) + (reduceMotion ? 0 : Math.sin(elapsed * 0.08) * 2);
      particles.position.x = -Math.floor(cameraX / worldLength) * worldLength;
      particles.rotation.z = reduceMotion ? 0 : Math.sin(elapsed * 0.08) * 0.015;
      const streakOpacity = reduceMotion ? 0 : THREE.MathUtils.smoothstep(speed, 0.35, 1) * 0.34;
      speedStreaks.position.x = cameraX;
      speedStreaks.children.forEach((child) => {
        const streak = child as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
        streak.position.x = ((streak.position.x - player.vx * dt * 1.9 + 13) % 26) - 13;
        streak.position.y += Math.sin(elapsed * 1.4 + streak.userData.phase) * dt * 0.018;
        streak.material.opacity = streakOpacity * (0.45 + Math.sin(elapsed * 2.2 + streak.userData.phase) * 0.2);
        streak.scale.x = 0.8 + speed * 2.4;
      });

      stations.forEach(({ group }, index) => {
        const runtime = group.userData.runtime;
        if (!reduceMotion) runtime.pulse.rotation.z += dt * (0.22 + index * 0.02);
        runtime.pulse.scale.setScalar(1 + (reduceMotion ? 0 : Math.sin(elapsed * 1.2 + index) * 0.025));
        if (!reduceMotion) runtime.signal.rotation.y += dt * 0.6;
        const engaged = index === lastNear || index === hoveredIndex;
        const reveal = engaged ? 1 : 0;
        runtime.core.material.emissiveIntensity = THREE.MathUtils.damp(runtime.core.material.emissiveIntensity, engaged ? 1.25 : 0.2, 5, dt);
        runtime.core.position.y = THREE.MathUtils.damp(runtime.core.position.y, 2.7 + (reduceMotion ? 0 : reveal * 0.42), 4, dt);
        runtime.pulse.rotation.y = THREE.MathUtils.damp(runtime.pulse.rotation.y, reduceMotion ? 0 : reveal * 0.65, 4, dt);
        if (!reduceMotion) runtime.core.rotation.y += dt * (engaged ? 0.65 : 0.12);
        runtime.label.position.y = runtime.baseY;
      });
      finish.children.forEach((child) => { if (child.userData.spin && !reduceMotion) child.rotation.z += dt * child.userData.spin; });
      seamPortal.children.forEach((child) => {
        if (child.userData.spin && !reduceMotion) child.rotation.z += dt * child.userData.spin;
        if (child.userData.pulse) child.scale.setScalar(1 + (reduceMotion ? 0 : Math.sin(elapsed * 1.7) * 0.06));
      });

      const nearest = stations.reduce((best, station, index) => {
        const direct = Math.abs(player.x - station.x);
        const distance = Math.min(direct, worldLength - direct);
        return distance < best.distance ? { index, distance } : best;
      }, { index: -1, distance: Infinity });
      const nearIndex = nearest.distance < 4.1 ? nearest.index : -1;
      if (nearIndex !== lastNear) { lastNear = nearIndex; onNearbyProject(nearIndex >= 0 ? projects[nearIndex] : null); }
      const chapter = Math.max(0, Math.min(chapterNames.length - 1, Math.round(localGround(player.x) / 24)));
      if (chapter !== lastChapter) { lastChapter = chapter; onActiveChapter(chapter); }

      mount.dataset.playerX = player.x.toFixed(3);
      mount.dataset.playerY = player.y.toFixed(3);
      mount.dataset.playerVx = player.vx.toFixed(3);
      mount.dataset.playerVy = player.vy.toFixed(3);
      mount.dataset.grounded = String(grounded);
      mount.dataset.cameraX = cameraX.toFixed(3);
      mount.dataset.loopCount = String(loopCount);
      mount.dataset.normalizedX = (player.x / worldLength).toFixed(4);
      mount.dataset.seamTransition = String(seamTransition);
      mount.dataset.nearby = lastNear >= 0 ? projects[lastNear].name : "";
      mount.dataset.motion = reduceMotion ? "reduced" : "full";
      mount.dataset.gaitPhase = gaitPhase.toFixed(3);
      mount.dataset.scarfTip = cloth.getZ(cloth.count - 1).toFixed(3);

      raycaster.setFromCamera(pointer, camera);
      const hover = raycaster.intersectObjects(scene.children, true).find((item) => Number.isInteger(item.object.userData.projectIndex));
      const nextHover = hover ? (hover.object.userData.projectIndex as number) : -1;
      if (nextHover !== hoveredIndex) { hoveredIndex = nextHover; renderer.domElement.style.cursor = hoveredIndex >= 0 ? "pointer" : "grab"; }
    };

    const render = () => renderer.render(scene, camera);
    const loop = () => { update(Math.min(clock.getDelta(), 1 / 30)); render(); };
    const visibility = () => renderer.setAnimationLoop(document.hidden ? null : loop);
    renderer.setAnimationLoop(loop);

    window.render_game_to_text = () => JSON.stringify({
      mode: startedRef.current ? "playing" : "intro",
      player: { ...player, grounded, facing },
      cameraX,
      chapter: lastChapter,
      loopCount,
      normalizedX: player.x / worldLength,
      worldLength,
      seamTransition,
      nearbyProject: lastNear >= 0 ? projects[lastNear].name : null,
      selectedProject: selectedRef.current?.name ?? null,
      coordinateNote: "cyclic origin at start gate; +x moves right, +y moves up; x wraps at worldLength",
    } satisfies RuntimeState);
    window.advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let index = 0; index < steps; index += 1) update(1 / 60);
      render();
    };

    (window as TestRuntimeWindow).__ohaki_test_set_state = (state) => {
      Object.assign(player, state);
      if (typeof state.grounded === "boolean") grounded = state.grounded;
      cameraX = player.x;
      update(1 / 60);
      render();
    };

    window.addEventListener("resize", updateFrustum);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", keyDown, { passive: false });
    window.addEventListener("keyup", keyUp);
    window.addEventListener("ohaki:mobile", mobileAction);
    window.addEventListener("ohaki:travel", travel);
    renderer.domElement.addEventListener("wheel", wheel, { passive: true });
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("click", pointerClick);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", updateFrustum);
      document.removeEventListener("visibilitychange", visibility);
      motionQuery.removeEventListener("change", motionChange);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("ohaki:mobile", mobileAction);
      window.removeEventListener("ohaki:travel", travel);
      renderer.domElement.removeEventListener("wheel", wheel);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("click", pointerClick);
      delete window.render_game_to_text;
      delete window.advanceTime;
      delete (window as TestRuntimeWindow).__ohaki_test_set_state;
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
        if (object instanceof THREE.Sprite) {
          const texture = object.userData.texture as THREE.Texture | undefined;
          texture?.dispose();
          object.material.dispose();
        }
      });
      if (scene.background instanceof THREE.Texture) scene.background.dispose();
      environmentTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onActiveChapter, onLoop, onNearbyProject, onProject, projects]);

  return <div className="side-world" aria-label="Game runtime state" data-testid="side-world" ref={mountRef} />;
}
