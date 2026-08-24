"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
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

function makeLabel(title: string, subtitle: string, accent: string, width = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 320;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "rgba(7, 15, 27, .92)";
  context.fillRect(18, 18, width - 36, 284);
  context.strokeStyle = accent;
  context.lineWidth = 8;
  context.strokeRect(18, 18, width - 36, 284);
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
  sprite.scale.set(7.7, 2.4, 1);
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
  const navy = new THREE.MeshStandardMaterial({ color: 0x20355d, roughness: 0.62 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x08111f, roughness: 0.75 });
  const coral = new THREE.MeshStandardMaterial({ color: 0xff715f, roughness: 0.44 });
  const cyan = new THREE.MeshStandardMaterial({ color: 0x64e8ff, emissive: 0x2abbd2, emissiveIntensity: 2.1, roughness: 0.18 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xc57a18, emissiveIntensity: 1.5 });

  const body = new THREE.Group();
  body.position.y = 1.1;
  root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.62, 7, 14), navy);
  torso.scale.z = 0.72;
  body.add(torso);
  addBox(body, [0.62, 0.4, 0.16], [0, 0.02, 0.36], dark);
  const harnessA = addBox(body, [0.08, 0.74, 0.07], [0, 0.02, -0.39], coral);
  harnessA.rotation.z = 0.72;
  const harnessB = addBox(body, [0.08, 0.74, 0.07], [0, 0.02, -0.4], coral);
  harnessB.rotation.z = -0.72;

  const head = new THREE.Group();
  head.position.y = 0.84;
  body.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 15), dark);
  helmet.scale.z = 0.85;
  head.add(helmet);
  const visor = addBox(head, [0.52, 0.17, 0.08], [0, 0, 0.32], cyan);
  visor.rotation.x = -0.04;
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 12), coral);
    pod.rotation.z = Math.PI / 2;
    pod.position.x = side * 0.35;
    head.add(pod);
  }

  const armL = new THREE.Group();
  const armR = new THREE.Group();
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  [armL, armR].forEach((arm, index) => {
    arm.position.set(index ? 0.46 : -0.46, 0.34, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.48, 5, 10), navy);
    upper.position.y = -0.35;
    arm.add(upper);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 9), dark);
    glove.position.y = -0.7;
    arm.add(glove);
    body.add(arm);
  });
  [legL, legR].forEach((leg, index) => {
    leg.position.set(index ? 0.2 : -0.2, 0.76, 0);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.54, 5, 10), navy);
    shin.position.y = -0.4;
    leg.add(shin);
    addBox(leg, [0.3, 0.22, 0.46], [0.08, -0.82, 0.08], dark);
    root.add(leg);
  });

  const lantern = new THREE.Group();
  lantern.position.set(0, -0.82, 0);
  lantern.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), amber));
  const lanternRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 20), amber);
  lanternRing.rotation.x = Math.PI / 2;
  lantern.add(lanternRing);
  armR.add(lantern);

  const drone = new THREE.Group();
  drone.position.set(0.95, 2.1, 0);
  drone.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), cyan));
  const droneRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.018, 6, 30), cyan);
  droneRing.rotation.x = Math.PI / 2;
  drone.add(droneRing);
  root.add(drone);

  root.userData.source = "img2threejs procedural reconstruction";
  root.userData.identity = "stylized builder/explorer; not a facial likeness";
  return { root, body, head, armL, armR, legL, legR, lantern, drone, droneRing };
}

type Platform = { min: number; max: number; top: number };

function buildPlatform(scene: THREE.Scene, min: number, max: number, top: number, accent: string) {
  const width = max - min;
  const earth = new THREE.MeshStandardMaterial({ color: 0x18273a, roughness: 0.9 });
  const edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(accent), emissive: new THREE.Color(accent), emissiveIntensity: 0.36, roughness: 0.5 });
  addBox(scene, [width, 1.2, 5.5], [(min + max) / 2, top - 0.6, 0], earth);
  addBox(scene, [width, 0.16, 5.7], [(min + max) / 2, top + 0.05, 0], edge);
  const supports = Math.max(2, Math.floor(width / 6));
  for (let i = 0; i < supports; i += 1) {
    const x = min + 2 + (i / Math.max(1, supports - 1)) * Math.max(0, width - 4);
    const beam = addBox(scene, [0.18, 2.8, 0.18], [x, top - 2, 2.45], edge);
    beam.rotation.z = i % 2 ? 0.12 : -0.12;
  }
}

function buildProjectStation(project: Project, index: number, x: number, top: number, accent: string) {
  const group = new THREE.Group();
  group.position.set(x, top, 0);
  group.name = `repo-${project.name}`;
  const accentColor = new THREE.Color(accent);
  const metal = new THREE.MeshStandardMaterial({ color: 0x243750, metalness: 0.25, roughness: 0.52 });
  const glow = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 1.45, roughness: 0.26 });
  const glass = new THREE.MeshPhysicalMaterial({ color: accentColor, transparent: true, opacity: 0.27, roughness: 0.1, transmission: 0.18, emissive: accentColor, emissiveIntensity: 0.2 });

  const legs = [-1, 1].map((side) => addBox(group, [0.25, 3.4, 0.25], [side * 1.65, 1.7, 0], metal));
  const screen = addBox(group, [3.7, 2.25, 0.28], [0, 3.1, 0], metal);
  const core = addBox(group, [3.2, 1.72, 0.12], [0, 3.1, 0.24], glass);
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.055, 8, 40), glow);
  pulse.position.set(0, 3.1, 0.38);
  group.add(pulse);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 1.25, 8), metal);
  antenna.position.set(1.28, 4.85, 0);
  group.add(antenna);
  const signal = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), glow);
  signal.position.set(1.28, 5.52, 0);
  group.add(signal);

  if (index % 3 === 0) {
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.78, 0.25, 24), metal);
    dish.rotation.x = Math.PI / 2;
    dish.rotation.z = -0.28;
    dish.position.set(-1.35, 5.15, 0);
    group.add(dish);
  } else if (index % 3 === 1) {
    for (const side of [-1, 1]) {
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), glow);
      orb.position.set(side * 1.35, 4.65, 0);
      group.add(orb);
    }
  } else {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.12, 8, 32, Math.PI), glow);
    arch.position.y = 4.65;
    group.add(arch);
  }

  const year = new Date(project.createdAt).getFullYear();
  const label = makeLabel(project.name, `${year} / ${project.language ?? "EXPERIMENT"}`, accent);
  label.position.set(0, 6.65, 0);
  group.add(label);
  [screen, core, pulse, signal, ...legs].forEach((item) => { item.userData.projectIndex = index; });
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
  scene.background = new THREE.Color(0xdda878);
  scene.fog = new THREE.Fog(0xdda878, 28, 72);
  scene.add(new THREE.HemisphereLight(0xffedd3, 0x17273e, 3.2));
  const sun = new THREE.DirectionalLight(0xffe4b2, 4.6);
  sun.position.set(-8, 16, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const worldLength = Math.max(168, projects.length * 24);
  const platforms: Platform[] = [];
  const segmentCount = Math.ceil((worldLength + 12) / 24);
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
  const mountainMaterial = new THREE.MeshBasicMaterial({ color: 0x786a83, transparent: true, opacity: 0.65 });
  for (let x = -30; x < worldLength + 40; x += 10) {
    const height = 5 + (Math.sin(x * 1.71) + 1) * 2.8;
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(5.8, height, 5), mountainMaterial);
    mountain.position.set(x, height / 2 - 1.8, 0);
    far.add(mountain);
  }
  scene.add(far);

  const mid = new THREE.Group();
  mid.position.z = -10;
  for (let x = -12; x < worldLength + 20; x += 14) {
    const towerHeight = 2.5 + ((x * 17) % 5 + 5) % 5;
    const tower = addBox(mid, [2.2, towerHeight, 1], [x, towerHeight / 2 - 0.5, 0], new THREE.MeshBasicMaterial({ color: 0x394660 }));
    tower.castShadow = false;
    for (let row = 0; row < Math.floor(towerHeight); row += 1) {
      const windowLight = addBox(mid, [0.32, 0.18, 0.05], [x, row + 0.4, 0.55], new THREE.MeshBasicMaterial({ color: row % 2 ? 0xffd166 : 0x64e8ff }));
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

  return { scene, platforms, stations, far, mid, clouds, finish, seamPortal, worldLength };
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
    const { scene, platforms, stations, far, mid, clouds, finish, seamPortal, worldLength } = buildWorld(projects);
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
    renderer.domElement.setAttribute("aria-label", "Playable side-scrolling GitHub portfolio world");
    renderer.domElement.dataset.gameCanvas = "true";
    renderer.domElement.tabIndex = 0;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 100);
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
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const player = { x: 0, y: 0, vx: 0, vy: 0 };

    const updateFrustum = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      const aspect = width / height;
      const frustumHeight = width < 720 ? 18 : 16;
      camera.left = (-frustumHeight * aspect) / 2;
      camera.right = (frustumHeight * aspect) / 2;
      camera.top = frustumHeight / 2;
      camera.bottom = -frustumHeight / 2;
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
      player.vx = THREE.MathUtils.damp(player.vx, targetVelocity, grounded ? 14 : 6, dt);
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
        if (!grounded && player.vy < -2.5) { explorer.body.scale.y = 0.84; cameraKick = Math.min(0.26, Math.abs(player.vy) * 0.018); }
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
      explorer.root.scale.x = THREE.MathUtils.damp(explorer.root.scale.x, facing, 15, dt);
      explorer.body.scale.y = THREE.MathUtils.damp(explorer.body.scale.y, 1, 9, dt);
      const speed = Math.min(1, Math.abs(player.vx) / 6);
      const runPhase = elapsed * (7 + speed * 9);
      const stride = Math.sin(runPhase) * 0.72 * speed;
      explorer.legL.rotation.z = grounded ? stride : -0.35;
      explorer.legR.rotation.z = grounded ? -stride : 0.42;
      explorer.armL.rotation.z = grounded ? -stride * 0.7 : -0.55;
      explorer.armR.rotation.z = grounded ? stride * 0.55 : 0.5;
      explorer.body.rotation.z = THREE.MathUtils.damp(explorer.body.rotation.z, grounded ? -player.vx * 0.018 : -0.12 * facing, 8, dt);
      explorer.body.position.y = THREE.MathUtils.damp(explorer.body.position.y, grounded ? 1.1 + Math.abs(Math.sin(runPhase)) * 0.085 * speed : 1.13, 13, dt);
      explorer.head.rotation.z = Math.sin(elapsed * 2.4) * 0.035;
      explorer.lantern.rotation.z = Math.sin(elapsed * 7) * 0.22;
      explorer.drone.position.y = 2.1 + Math.sin(elapsed * 3.2) * 0.18;
      explorer.drone.position.x = 0.95 - facing * speed * 0.15;
      explorer.droneRing.rotation.z += dt * 2.4;

      cameraKick = THREE.MathUtils.damp(cameraKick, 0, 7, dt);
      const targetCameraX = player.x + facing * (2.2 + speed * 2.3);
      cameraX = THREE.MathUtils.damp(cameraX, targetCameraX, 3.8 + speed * 2.2, dt);
      const cameraY = THREE.MathUtils.damp(camera.position.y, 5.25 + Math.max(0, player.y) * 0.27, 4.5, dt);
      const kickX = reduceMotion ? 0 : Math.sin(elapsed * 38) * cameraKick;
      const kickY = reduceMotion ? 0 : Math.cos(elapsed * 31) * cameraKick * 0.55;
      camera.position.set(cameraX + kickX, cameraY + kickY, 22);
      camera.lookAt(cameraX, cameraY - 2.1, 0);
      const wrapLayer = (value: number, factor: number) => -((((value * factor) % worldLength) + worldLength) % worldLength) + worldLength * 0.5;
      far.position.x = wrapLayer(cameraX, 0.16);
      mid.position.x = wrapLayer(cameraX, 0.35);
      clouds.position.x = wrapLayer(cameraX, 0.54) + Math.sin(elapsed * 0.08) * 2;
      particles.position.x = -Math.floor(cameraX / worldLength) * worldLength;
      particles.rotation.z = Math.sin(elapsed * 0.08) * 0.015;
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
        runtime.pulse.rotation.z += dt * (0.55 + index * 0.03);
        runtime.pulse.scale.setScalar(1 + Math.sin(elapsed * 2.2 + index) * 0.08);
        runtime.signal.rotation.y += dt * 1.8;
        runtime.core.material.emissiveIntensity = index === lastNear ? 1.25 : 0.2;
        runtime.label.position.y = runtime.baseY + Math.sin(elapsed * 1.8 + index) * 0.08;
      });
      finish.children.forEach((child) => { if (child.userData.spin) child.rotation.z += dt * child.userData.spin; });
      seamPortal.children.forEach((child) => {
        if (child.userData.spin) child.rotation.z += dt * child.userData.spin;
        if (child.userData.pulse) child.scale.setScalar(1 + Math.sin(elapsed * 3.4) * 0.2);
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
        if (object instanceof THREE.Mesh) {
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
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onActiveChapter, onLoop, onNearbyProject, onProject, projects]);

  return <div className="side-world" aria-label="Game runtime state" data-testid="side-world" ref={mountRef} />;
}
