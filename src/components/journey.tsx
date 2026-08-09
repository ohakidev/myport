// 3D storytelling journey: a procedural traveler walks through four
// locations as the visitor scrolls. Locations assemble ahead of the
// traveler, palette/lighting crossfade at chapter borders, and every
// milestone on the trail is a real public repository of ohakidev.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { GitHubPortfolio, Project } from "@/lib/github";

const colorByLanguage: Record<string, string> = {
  TypeScript: "#67e8f9",
  JavaScript: "#fde047",
  Python: "#86efac",
  HTML: "#fb7185",
  CSS: "#c084fc",
};

const chapters = [
  { id: "origin", label: "Basecamp", hud: "BASECAMP — WHERE THE SPARK STARTS" },
  { id: "practice", label: "Workshop", hud: "WORKSHOP — HOW IDEAS BECOME PROOFS" },
  { id: "work", label: "Trail", hud: "THE TRAIL — PUBLIC EXPERIMENTS" },
  { id: "contact", label: "Summit", hud: "SUMMIT — THE NEXT DEPARTURE" },
];

const ZONE_SPAN = 30;
const PATH_LENGTH = ZONE_SPAN * (chapters.length - 1);

const zonePalettes = [
  { fog: "#0b0c18", hemi: "#8b9dd6", accent: "#fbbf24", edge: "#67e8f9" },
  { fog: "#081018", hemi: "#7fc7dd", accent: "#22d3ee", edge: "#67e8f9" },
  { fog: "#120a16", hemi: "#c39ad1", accent: "#fb7185", edge: "#fb7185" },
  { fog: "#081014", hemi: "#9fd6a8", accent: "#bef264", edge: "#bef264" },
];

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.69c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.55 9.55 0 0 1 12 7.68a9.5 9.5 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v1.9c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

const easeOutBack = (value: number) => {
  const c1 = 1.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
};

const pathX = (progress: number) => Math.sin(progress * Math.PI * 2) * 1.3;

function buildTraveler() {
  const group = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({
    color: 0x232c44,
    roughness: 0.48,
    metalness: 0.3,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x12172a,
    roughness: 0.6,
    metalness: 0.25,
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.42, 6, 14), suit);
  torso.position.y = 0.98;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 16), dark);
  head.position.y = 1.62;
  group.add(head);
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.245, 18, 12, Math.PI * 1.15, Math.PI * 0.7, Math.PI * 0.3, Math.PI * 0.32),
    new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x67e8f9,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    }),
  );
  visor.position.y = 1.62;
  group.add(visor);

  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.24), dark);
  pack.position.set(0, 1.06, 0.28);
  group.add(pack);
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.34, 6),
    new THREE.MeshStandardMaterial({ color: 0xfb7185, emissive: 0xfb7185, emissiveIntensity: 1.4 }),
  );
  beacon.position.set(0.12, 1.5, 0.32);
  group.add(beacon);

  const limbGeometry = new THREE.CapsuleGeometry(0.085, 0.4, 4, 10);
  const makeLimb = (x: number, y: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const limb = new THREE.Mesh(limbGeometry, dark);
    limb.position.y = -0.26;
    pivot.add(limb);
    group.add(pivot);
    return pivot;
  };
  const legL = makeLimb(-0.15, 0.62);
  const legR = makeLimb(0.15, 0.62);
  const armL = makeLimb(-0.4, 1.28);
  const armR = makeLimb(0.4, 1.28);

  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffd28a, emissive: 0xffb454, emissiveIntensity: 2.4 }),
  );
  lantern.position.y = -0.56;
  armR.add(lantern);
  const lanternLight = new THREE.PointLight(0xffc26e, 14, 9, 1.8);
  lanternLight.position.y = -0.56;
  armR.add(lanternLight);

  return { group, legL, legR, armL, armR, head, lanternLight };
}

function buildCamp() {
  const camp = new THREE.Group();
  camp.position.z = -6;

  const fire = new THREE.Group();
  fire.position.set(1.9, 0, 0);
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3042, roughness: 0.9 });
  for (let i = 0; i < 7; i += 1) {
    const angle = (i / 7) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), stoneMaterial);
    stone.position.set(Math.cos(angle) * 0.55, 0.08, Math.sin(angle) * 0.55);
    fire.add(stone);
  }
  const flameMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb454,
    emissive: 0xff8a3d,
    emissiveIntensity: 2.6,
    transparent: true,
    opacity: 0.92,
  });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.72, 8), flameMaterial);
  flame.position.y = 0.42;
  fire.add(flame);
  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.46, 8), flameMaterial.clone());
  flameCore.position.y = 0.34;
  fire.add(flameCore);
  const fireLight = new THREE.PointLight(0xff9f43, 26, 12, 1.9);
  fireLight.position.y = 0.8;
  fire.add(fireLight);
  camp.add(fire);

  const tent = new THREE.Mesh(
    new THREE.ConeGeometry(1.05, 1.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x1c2c46, roughness: 0.75 }),
  );
  tent.position.set(-2.6, 0.74, -0.8);
  tent.rotation.y = Math.PI / 4;
  camp.add(tent);

  const flagPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 2.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a445f }),
  );
  flagPole.position.set(-1.2, 1.2, 1.4);
  camp.add(flagPole);
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.3),
    new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  flag.position.set(-0.93, 2.15, 1.4);
  camp.add(flag);

  return { camp, animated: [flame, flameCore, flag], fireLight };
}

function buildWorkshop() {
  const workshop = new THREE.Group();
  workshop.position.z = -ZONE_SPAN - 4;

  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.12, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x182238, roughness: 0.55, metalness: 0.4 }),
  );
  bench.position.set(-2.2, 0.86, 0.4);
  workshop.add(bench);
  for (const offset of [-1.05, 1.05]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.9), bench.material as THREE.Material);
    leg.position.set(-2.2 + offset, 0.4, 0.4);
    workshop.add(leg);
  }

  const holo = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 1),
    new THREE.MeshBasicMaterial({ color: 0x67e8f9, wireframe: true, transparent: true, opacity: 0.8 }),
  );
  holo.position.set(-2.2, 1.9, 0.4);
  workshop.add(holo);

  const panels: THREE.Mesh[] = [];
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f1b2e,
    emissive: 0x22d3ee,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.2,
  });
  [
    { x: 2.1, y: 1.7, z: -1.4, w: 1.5, h: 1.0 },
    { x: 3.2, y: 2.4, z: -2.6, w: 1.1, h: 1.5 },
    { x: 1.4, y: 2.9, z: -3.4, w: 1.9, h: 0.7 },
  ].forEach((spec, index) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(spec.w, spec.h, 0.04), panelMaterial.clone());
    panel.position.set(spec.x, spec.y, spec.z);
    panel.rotation.y = -0.5 - index * 0.12;
    workshop.add(panel);
    panels.push(panel);
  });

  const workshopLight = new THREE.PointLight(0x22d3ee, 20, 14, 1.8);
  workshopLight.position.set(1.8, 2.6, -1.4);
  workshop.add(workshopLight);

  return { workshop, holo, panels, workshopLight };
}

function buildTrail(projects: Project[]) {
  const trail = new THREE.Group();
  const startZ = -ZONE_SPAN * 2 - 6;
  const spacing = Math.min(3.6, 20 / Math.max(projects.length, 1));
  const orbs: THREE.Mesh[] = [];
  const rings: THREE.Mesh[] = [];

  projects.forEach((project, index) => {
    const z = startZ - index * spacing;
    const side = index % 2 === 0 ? 1 : -1;
    const x = side * (2.6 + (index % 3) * 0.35);
    const color = new THREE.Color(colorByLanguage[project.language ?? ""] ?? "#f0abfc");

    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.9, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x232a41, roughness: 0.5, metalness: 0.5 }),
    );
    pillar.position.set(x, 0.45, z);
    trail.add(pillar);

    const orb = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.34, 1),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.85,
        roughness: 0.25,
        metalness: 0.2,
      }),
    );
    orb.position.set(x, 1.28, z);
    orb.name = project.name;
    orb.userData = { project, baseY: 1.28, index };
    trail.add(orb);
    orbs.push(orb);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.012, 6, 60),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 }),
    );
    ring.position.copy(orb.position);
    ring.rotation.x = Math.PI / 2.4;
    trail.add(ring);
    rings.push(ring);
  });

  const trailLight = new THREE.PointLight(0xfb7185, 16, 16, 1.8);
  trailLight.position.set(0, 2.4, startZ - 2);
  trail.add(trailLight);

  return { trail, orbs, rings };
}

function buildSummit() {
  const summit = new THREE.Group();
  const z = -PATH_LENGTH - 5;
  summit.position.z = z;

  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(2.1, 0.07, 10, 90),
    new THREE.MeshStandardMaterial({
      color: 0xbef264,
      emissive: 0x84cc16,
      emissiveIntensity: 1.6,
      roughness: 0.3,
    }),
  );
  portal.position.set(0, 2.4, -2.5);
  summit.add(portal);

  const portalLight = new THREE.PointLight(0xbef264, 30, 20, 1.7);
  portalLight.position.set(0, 2.6, -2.2);
  summit.add(portalLight);

  const rocks: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i += 1) {
    const rock = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.22 + (i % 3) * 0.1, 0),
      new THREE.MeshStandardMaterial({ color: 0x2c3550, roughness: 0.8 }),
    );
    const angle = (i / 6) * Math.PI * 2;
    rock.position.set(Math.cos(angle) * 3.4, 1.2 + Math.sin(angle * 2) * 0.6, Math.sin(angle) * 2.6 - 2);
    summit.add(rock);
    rocks.push(rock);
  }

  return { summit, portal, rocks, portalLight };
}

function JourneyWorld({
  projects,
  selected,
  onSelect,
  onZoneChange,
}: {
  projects: Project[];
  selected: string | null;
  onSelect: (project: Project) => void;
  onZoneChange: (zone: number) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);
  const selectRef = useRef(onSelect);
  const zoneRef = useRef(onZoneChange);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    zoneRef.current = onZoneChange;
  }, [onZoneChange]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(new THREE.Color(zonePalettes[0].fog), 0.034);
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 160);
    camera.position.set(0, 2.4, 8.4);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(new THREE.Color(zonePalettes[0].hemi), 0x120a1c, 1.35);
    scene.add(hemi);
    const rim = new THREE.DirectionalLight(0x9fb2ff, 0.5);
    rim.position.set(-6, 8, 6);
    scene.add(rim);

    // Ground + glowing path ribbon
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x0d101d, roughness: 0.95 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 240), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    scene.add(ground);

    const ribbon = new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, PATH_LENGTH + 30),
      new THREE.MeshStandardMaterial({ color: 0x10131f, roughness: 0.85 }),
    );
    ribbon.rotation.x = -Math.PI / 2;
    ribbon.position.set(0, 0.005, -PATH_LENGTH / 2 + 6);
    scene.add(ribbon);

    const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.5 });
    [-1.62, 1.62].forEach((x) => {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, PATH_LENGTH + 30), edgeMaterial);
      edge.position.set(x, 0.03, -PATH_LENGTH / 2 + 6);
      scene.add(edge);
    });

    // Stars
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(720 * 3);
    let seed = 41;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < starPositions.length; i += 3) {
      starPositions[i] = (random() - 0.5) * 140;
      starPositions[i + 1] = 6 + random() * 38;
      starPositions[i + 2] = 24 - random() * (PATH_LENGTH + 80);
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xb8c6ea, size: 0.09, transparent: true, opacity: 0.7 }),
    );
    scene.add(stars);

    // Fireflies hugging the path
    const flyGeometry = new THREE.BufferGeometry();
    const flyPositions = new Float32Array(240 * 3);
    for (let i = 0; i < flyPositions.length; i += 3) {
      flyPositions[i] = (random() - 0.5) * 14;
      flyPositions[i + 1] = 0.3 + random() * 3;
      flyPositions[i + 2] = 8 - random() * (PATH_LENGTH + 24);
    }
    flyGeometry.setAttribute("position", new THREE.BufferAttribute(flyPositions, 3));
    const flyMaterial = new THREE.PointsMaterial({
      color: 0x8de0ff,
      size: 0.05,
      transparent: true,
      opacity: 0.55,
    });
    const flies = new THREE.Points(flyGeometry, flyMaterial);
    scene.add(flies);

    // Locations
    const zoneGroups: { group: THREE.Group; centerZ: number; props: THREE.Object3D[] }[] = [];
    const camp = buildCamp();
    const workshop = buildWorkshop();
    const trail = buildTrail(projects);
    const summit = buildSummit();

    scene.add(camp.camp, workshop.workshop, trail.trail, summit.summit);
    zoneGroups.push(
      { group: camp.camp, centerZ: -5, props: [...camp.camp.children] },
      { group: workshop.workshop, centerZ: -ZONE_SPAN - 3, props: [...workshop.workshop.children] },
      { group: trail.trail, centerZ: -ZONE_SPAN * 2 - 8, props: [...trail.trail.children] },
      { group: summit.summit, centerZ: -PATH_LENGTH - 4, props: [...summit.summit.children] },
    );
    zoneGroups.forEach((zone) => {
      zone.props.forEach((prop) => prop.scale.setScalar(0.001));
    });

    const traveler = buildTraveler();
    traveler.group.position.set(pathX(0), 0, 6);
    scene.add(traveler.group);

    // Interaction
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(3, 3);
    let hovered: THREE.Mesh | null = null;

    const pointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
    };
    const click = () => {
      if (hovered) {
        selectRef.current(hovered.userData.project as Project);
        document.getElementById("work")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      }
    };
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("click", click);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    // Zone transition pulses
    const pulses: { mesh: THREE.Mesh; life: number }[] = [];
    let currentZone = 0;
    zoneRef.current(0);

    const spawnPulse = (position: THREE.Vector3, color: THREE.Color) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.2, 0.02, 8, 64),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }),
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.copy(position);
      mesh.position.y = 0.06;
      scene.add(mesh);
      pulses.push({ mesh, life: 1 });
    };

    const clock = new THREE.Clock();
    let frame = 0;
    let smoothedProgress = 0;
    let smoothedSpeed = 0;
    let lastProgress = 0;
    const fogColor = new THREE.Color();
    const hemiColor = new THREE.Color();
    const accentA = new THREE.Color();
    const accentB = new THREE.Color();

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const time = clock.getElapsedTime();

      const maxScroll = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
      const rawProgress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
      const blend = reduced ? 1 : 0.09;
      smoothedProgress += (rawProgress - smoothedProgress) * blend;
      const instantSpeed = Math.abs(rawProgress - lastProgress) / Math.max(dt, 0.001);
      lastProgress = rawProgress;
      smoothedSpeed += (Math.min(instantSpeed * 1.6, 1.6) - smoothedSpeed) * 0.08;
      const walking = Math.min(smoothedSpeed, 1);

      // Traveler movement along the path
      const p = smoothedProgress;
      const targetZ = 6 - p * (PATH_LENGTH + 10);
      const targetX = pathX(p);
      const prevX = traveler.group.position.x;
      const prevZ = traveler.group.position.z;
      traveler.group.position.x += (targetX - prevX) * (reduced ? 1 : 0.16);
      traveler.group.position.z += (targetZ - prevZ) * (reduced ? 1 : 0.16);
      const vx = traveler.group.position.x - prevX;
      const vz = traveler.group.position.z - prevZ;
      if (Math.abs(vz) > 0.0004 || Math.abs(vx) > 0.0004) {
        const targetYaw = Math.atan2(vx, vz);
        let delta = targetYaw - traveler.group.rotation.y;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        traveler.group.rotation.y += delta * 0.2;
      }

      // Walk cycle / idle
      const swing = reduced ? 0 : Math.sin(time * 9.5) * (0.18 + walking * 0.55);
      traveler.legL.rotation.x = swing;
      traveler.legR.rotation.x = -swing;
      traveler.armL.rotation.x = -swing * 0.85;
      traveler.armR.rotation.x = swing * 0.55;
      traveler.group.position.y = reduced ? 0 : Math.abs(Math.cos(time * 9.5)) * 0.06 * walking;
      traveler.group.rotation.z = reduced ? 0 : Math.sin(time * 9.5) * 0.025 * walking;
      if (!reduced && walking < 0.06) {
        traveler.head.rotation.y = Math.sin(time * 0.6) * 0.35;
        traveler.group.position.y += Math.sin(time * 1.6) * 0.012;
      } else {
        traveler.head.rotation.y *= 0.9;
      }

      // Zone blending for atmosphere
      const zoneFloat = Math.min(Math.max((p * chapters.length * 1.06 - 0.03), 0), chapters.length - 1);
      const zoneIndex = Math.min(Math.floor(zoneFloat), chapters.length - 1);
      const zoneFrac = zoneFloat - zoneIndex;
      const nextIndex = Math.min(zoneIndex + 1, chapters.length - 1);
      const a = zonePalettes[zoneIndex];
      const b = zonePalettes[nextIndex];
      fogColor.set(a.fog).lerp(new THREE.Color(b.fog), zoneFrac);
      (scene.fog as THREE.FogExp2).color.copy(fogColor);
      hemiColor.set(a.hemi).lerp(new THREE.Color(b.hemi), zoneFrac);
      hemi.color.copy(hemiColor);
      accentA.set(a.accent);
      accentB.set(b.accent);
      accentA.lerp(accentB, zoneFrac);
      traveler.lanternLight.color.copy(accentA).lerp(new THREE.Color("#ffd28a"), 0.5);
      edgeMaterial.color.set(a.edge).lerp(new THREE.Color(b.edge), zoneFrac);

      if (zoneIndex !== currentZone) {
        currentZone = zoneIndex;
        zoneRef.current(zoneIndex);
        if (!reduced) spawnPulse(traveler.group.position, accentA.clone());
      }

      // Locations assemble as the traveler approaches
      zoneGroups.forEach((zone) => {
        const distance = Math.abs(zone.centerZ - traveler.group.position.z);
        const visibility = Math.min(Math.max(1 - distance / 26, 0), 1);
        zone.props.forEach((prop, index) => {
          const staggered = Math.min(Math.max(visibility * 1.5 - index * 0.06, 0), 1);
          const targetScale = reduced ? (visibility > 0.02 ? 1 : 0.001) : easeOutBack(staggered) * (staggered > 0 ? 1 : 0.001);
          prop.scale.setScalar(Math.max(targetScale, 0.001));
        });
      });

      // Living details
      if (!reduced) {
        camp.fireLight.intensity = 24 + Math.sin(time * 11) * 4 + Math.sin(time * 23) * 2;
        camp.animated[0].scale.setScalar(1 + Math.sin(time * 12) * 0.12);
        camp.animated[1].scale.setScalar(1 + Math.cos(time * 15) * 0.16);
        camp.animated[2].rotation.y = Math.sin(time * 1.8) * 0.25;
        workshop.holo.rotation.y = time * 0.6;
        workshop.holo.rotation.x = Math.sin(time * 0.7) * 0.3;
        workshop.holo.position.y = 1.9 + Math.sin(time * 1.4) * 0.08;
        workshop.panels.forEach((panel, index) => {
          panel.position.y += Math.sin(time * 0.9 + index * 1.7) * 0.0016;
        });
        summit.portal.rotation.z = time * 0.28;
        summit.portalLight.intensity = 26 + Math.sin(time * 2.2) * 6;
        summit.rocks.forEach((rock, index) => {
          rock.rotation.y = time * (0.2 + index * 0.05);
          rock.position.y += Math.sin(time * 0.8 + index) * 0.0018;
        });
        flyMaterial.opacity = 0.4 + Math.sin(time * 1.3) * 0.18;
        flies.position.y = Math.sin(time * 0.5) * 0.14;
      }

      trail.orbs.forEach((orb, index) => {
        const active = orb.name === selectedRef.current;
        const isHovered = orb === hovered;
        const target = active ? 1.45 : isHovered ? 1.24 : 1;
        orb.scale.lerp(new THREE.Vector3(target, target, target), 0.14);
        if (!reduced) {
          orb.position.y = (orb.userData.baseY as number) + Math.sin(time * 1.2 + index) * 0.07;
          orb.rotation.y = time * (0.25 + index * 0.02);
          trail.rings[index].rotation.z = time * 0.35;
        }
      });

      // Pulses
      for (let i = pulses.length - 1; i >= 0; i -= 1) {
        const pulse = pulses[i];
        pulse.life -= dt * 1.15;
        if (pulse.life <= 0) {
          scene.remove(pulse.mesh);
          pulse.mesh.geometry.dispose();
          (pulse.mesh.material as THREE.Material).dispose();
          pulses.splice(i, 1);
          continue;
        }
        const growth = 1 + (1 - pulse.life) * 5;
        pulse.mesh.scale.setScalar(growth);
        (pulse.mesh.material as THREE.MeshBasicMaterial).opacity = pulse.life * 0.65;
      }

      // Hover raycast
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(trail.orbs, false)[0]?.object as THREE.Mesh | undefined;
      hovered = hit ?? null;
      renderer.domElement.style.cursor = hovered ? "pointer" : "default";

      // Camera follows the traveler
      const focus = traveler.group.position;
      const camX = focus.x * 0.65 + pointer.x * (reduced ? 0 : 1.1);
      const camY = 2.35 + pointer.y * (reduced ? 0 : 0.42);
      const camZ = focus.z + 7.6;
      camera.position.x += (camX - camera.position.x) * 0.055;
      camera.position.y += (camY - camera.position.y) * 0.055;
      camera.position.z += (camZ - camera.position.z) * 0.075;
      camera.lookAt(focus.x * 0.6, 1.25, focus.z - 2.4);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("click", click);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const material = object.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [projects]);

  return <div className="journey-world" ref={mountRef} />;
}

function ProjectPanel({ project, close }: { project: Project; close: () => void }) {
  return (
    <aside className="project-panel" aria-live="polite">
      <button className="panel-close" type="button" onClick={close} aria-label="Close project detail">
        ×
      </button>
      <p className="micro-label">TRAIL MILESTONE</p>
      <h3>{project.name}</h3>
      <p>{project.description}</p>
      <div className="project-meta">
        <span>{project.language ?? "Mixed stack"}</span>
        <span>★ {project.stars}</span>
        <span>{new Date(project.pushedAt).getFullYear()}</span>
      </div>
      {project.topics.length > 0 && (
        <div className="topic-row">
          {project.topics.slice(0, 5).map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
        </div>
      )}
      <div className="panel-actions">
        <a href={project.url} target="_blank" rel="noreferrer">
          View source <ArrowIcon />
        </a>
        {project.homepage && (
          <a href={project.homepage} target="_blank" rel="noreferrer">
            Open live project
          </a>
        )}
      </div>
    </aside>
  );
}

function useReveal() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

export function Journey({ portfolio }: { portfolio: GitHubPortfolio }) {
  const [selected, setSelected] = useState<Project | null>(portfolio.projects[0] ?? null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeChapter, setActiveChapter] = useState("origin");
  const [zone, setZone] = useState(0);
  const chronological = useMemo(
    () => [...portfolio.projects].sort((a, b) => Date.parse(a.pushedAt) - Date.parse(b.pushedAt)),
    [portfolio.projects],
  );
  const languages = useMemo(
    () => Array.from(new Set(portfolio.projects.map((project) => project.language).filter(Boolean))),
    [portfolio.projects],
  );

  useReveal();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (current) setActiveChapter(current.target.id);
      },
      { threshold: [0.25, 0.55] },
    );
    chapters.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  const inspect = (project: Project) => {
    setSelected(project);
    setPanelOpen(true);
  };

  return (
    <main>
      <a href="#origin" className="skip-link">Skip to story</a>
      <JourneyWorld
        projects={chronological}
        selected={selected?.name ?? null}
        onSelect={inspect}
        onZoneChange={setZone}
      />

      <header className="site-nav">
        <a href="#origin" className="brand" aria-label="ohakidev home">
          <span>O</span>
          <strong>ohaki</strong>
        </a>
        <nav aria-label="Story chapters">
          {chapters.map((chapter, index) => (
            <a
              key={chapter.id}
              href={`#${chapter.id}`}
              className={activeChapter === chapter.id ? "active" : ""}
            >
              <span>0{index + 1}</span>
              {chapter.label}
            </a>
          ))}
        </nav>
        <a
          className="github-link"
          href={portfolio.profileUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub profile"
        >
          <GitHubIcon />
        </a>
      </header>

      <div className="chapter-progress" aria-hidden="true">
        {chapters.map((chapter) => (
          <span key={chapter.id} className={activeChapter === chapter.id ? "active" : ""} />
        ))}
      </div>

      <div className="journey-hud" aria-hidden="true">
        <span className="hud-key">NOW ENTERING</span>
        <strong key={zone} className="hud-place">{chapters[zone].hud}</strong>
      </div>

      {panelOpen && selected && <ProjectPanel project={selected} close={() => setPanelOpen(false)} />}

      <div className="story-shell">
        <section className="story-chapter hero-chapter" id="origin" aria-labelledby="origin-title">
          <div className="chapter-tag"><span>01</span> BASECAMP / RESEARCHER</div>
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="micro-label reveal">{portfolio.bio || "research everything that can make life better"}</p>
              <h1 id="origin-title" className="reveal">
                Curious by default.
                <em>Useful by design.</em>
              </h1>
              <p className="hero-lede reveal">
                I am <strong>{portfolio.name}</strong> — an independent builder walking through
                products, automation, communities, and emerging technology. Scroll, and the
                traveler moves.
              </p>
              <div className="hero-actions reveal">
                <a href="#practice" className="primary-button">
                  Start the journey <ArrowIcon />
                </a>
                <a href={portfolio.profileUrl} target="_blank" rel="noreferrer" className="quiet-link">
                  @{portfolio.login}
                </a>
              </div>
            </div>
            <div className="hero-note reveal">
              <span>THE JOURNEY</span>
              <p>
                Each location along the path is a chapter of real public work. Scroll to make the
                traveler walk, move your pointer to look around, and click a glowing milestone to
                open its source.
              </p>
              <div className="hero-stats">
                <strong>{portfolio.publicRepos}</strong><span>public experiments</span>
                <strong>{portfolio.followers}</strong><span>people following</span>
                <strong>{languages.length}</strong><span>observed languages</span>
              </div>
            </div>
          </div>
          <div className="scroll-cue"><i /> scroll to start walking</div>
        </section>

        <section className="story-chapter practice-chapter" id="practice" aria-labelledby="practice-title">
          <div className="chapter-tag"><span>02</span> WORKSHOP / HOW I BUILD</div>
          <div className="section-heading">
            <p className="micro-label reveal">No fixed title. A repeatable instinct.</p>
            <h2 id="practice-title" className="reveal">Research becomes a prototype. A prototype becomes proof.</h2>
          </div>
          <div className="practice-grid">
            {[
              ["Observe", "Start with a real friction point, not a fashionable stack."],
              ["Connect", "Map data, people, APIs, and constraints into one working system."],
              ["Prototype", "Ship the smallest interactive proof that can teach something."],
              ["Refine", "Keep what improves life. Remove what only adds noise."],
            ].map(([title, copy], index) => (
              <article key={title} className="reveal" style={{ transitionDelay: `${index * 90}ms` }}>
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <div className="stack-band reveal">
            <p>Observed in the public work</p>
            <div>
              {languages.map((language) => (
                <span key={language ?? "Mixed"}>
                  <i style={{ background: colorByLanguage[language ?? ""] ?? "#f0abfc" }} />
                  {language}
                </span>
              ))}
              <span><i className="neutral" /> Next.js</span>
              <span><i className="neutral" /> shadcn/ui</span>
              <span><i className="neutral" /> Vercel</span>
            </div>
          </div>
        </section>

        <section className="story-chapter work-chapter" id="work" aria-labelledby="work-title">
          <div className="chapter-tag"><span>03</span> THE TRAIL / PUBLIC WORK</div>
          <div className="section-heading work-heading">
            <div>
              <p className="micro-label reveal">Milestones drawn from GitHub</p>
              <h2 id="work-title" className="reveal">The experiments changed. The curiosity did not.</h2>
            </div>
            <p className="reveal">
              This trail does not invent a résumé. It follows the public repository path — each
              milestone links to its code, live deployment, and last active year. Click a glowing
              orb in the 3D scene or an entry below.
            </p>
          </div>
          <div className="work-timeline" role="list">
            <div className="timeline-spine" aria-hidden="true" />
            {chronological.map((project, index) => (
              <article
                key={project.name}
                role="listitem"
                className={selected?.name === project.name ? "work-entry active reveal is-visible" : "work-entry reveal"}
              >
                <button type="button" onClick={() => inspect(project)}>
                  <span className="entry-year">{new Date(project.pushedAt).getFullYear()}</span>
                  <i className="entry-node" aria-hidden="true" />
                  <span className="entry-card">
                    <span className="entry-kicker">MILESTONE {String(index + 1).padStart(2, "0")}</span>
                    <strong>{project.name}</strong>
                    <small>{project.description}</small>
                    <span className="entry-footer">
                      <b>{project.language ?? "Mixed stack"}</b>
                      <em>{project.homepage ? "live + source" : "source available"}</em>
                    </span>
                  </span>
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="story-chapter contact-chapter" id="contact" aria-labelledby="contact-title">
          <div className="chapter-tag"><span>04</span> SUMMIT / NEXT DEPARTURE</div>
          <div className="contact-grid">
            <div>
              <p className="micro-label reveal">The next useful experiment can start here.</p>
              <h2 id="contact-title" className="reveal">What should we make less difficult?</h2>
            </div>
            <div className="contact-card reveal">
              <p>
                Explore the source, try the live projects, and open a conversation through
                GitHub. I am interested in research-led products, thoughtful automation, and
                tools that create tangible value.
              </p>
              <a href={portfolio.profileUrl} target="_blank" rel="noreferrer" className="primary-button">
                Start on GitHub <ArrowIcon />
              </a>
            </div>
          </div>
          <footer>
            <span>© {new Date().getFullYear()} {portfolio.login}</span>
            <span>Procedural Three.js · public GitHub data · no portrait</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
