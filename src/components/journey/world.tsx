"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Project } from "@/lib/github";
import { buildExplorer, buildProjectStation, addBox, sculpt } from "./world-assets";
import { chapterColors, worldPalette } from "./palette";
import { createGardenEffects } from "./world-effects";
import { buildLandscape } from "./garden-landscape";
import {
  GARDEN_LEGACY_STORAGE_KEY,
  GARDEN_SESSION_STORAGE_KEY,
  initialGardenState,
  isGardenCommand,
  readGardenSave,
  serializeGardenSave,
  serializeLegacyCompletions,
  stationPosition,
  storyFor,
  type GardenActiveSave,
  type GardenProjectRef,
  type GardenState,
} from "./story";

declare global {
  interface Window {
    render_game_to_text?: () => string;
  }
}

export function GameWorld({ started, projects, paused, onState, onReady, onError }: {
  started: boolean; projects: Project[]; paused: boolean;
  onState: (state: GardenState) => void; onReady: () => void; onError: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const controls = useRef({ started, paused });
  controls.current = { started, paused };
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch { onError(); return; }
    const narrowViewport = window.matchMedia("(max-width: 699px)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, narrowViewport ? 1.25 : 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.dataset.gameCanvas = "true";
    canvas.setAttribute("aria-label", "Playable 3D garden. Move with WASD, arrow keys, or the on-screen controls; use the chapter buttons to choose an objective.");
    mount.appendChild(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(worldPalette.sky);
    scene.fog = new THREE.Fog(worldPalette.sky, 55, 95);
    scene.add(new THREE.HemisphereLight(worldPalette.stoneLight, worldPalette.slateDeep, 1.65));
    const sun = new THREE.DirectionalLight(worldPalette.warm, 2.3);
    sun.position.set(-16, 28, 15); sun.castShadow = true;
    sun.shadow.mapSize.set(narrowViewport ? 1024 : 2048, narrowViewport ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, far: 80 });
    sun.shadow.bias = -0.0003; scene.add(sun);
    const ground = new THREE.MeshStandardMaterial({ color: worldPalette.stone, roughness: 1 });
    const stone = new THREE.MeshStandardMaterial({ color: worldPalette.stoneLight, roughness: 1 });
    const wood = new THREE.MeshStandardMaterial({ color: worldPalette.slate, roughness: 1 });
    const maxZ = Math.max(19, Math.ceil(projects.length / 3) * 16 - 3);
    addBox(scene, [47, 1.2, maxZ + 20], [0, -0.7, (maxZ - 20) / 2], ground);
    addBox(scene, [43, 0.05, 3.3], [0, -0.055, 0], stone);
    for (const x of [-13, 0, 13]) addBox(scene, [2.8, 0.06, maxZ + 15], [x, -0.045, (maxZ - 15) / 2], stone);
    sculpt(scene, new THREE.CylinderGeometry(1.3, 1.3, 0.18, 24), wood, [5, 1.05, 0]);
    sculpt(scene, new THREE.CylinderGeometry(0.18, 0.25, 1.05, 12), wood, [5, 0.45, 0]);
    for (const x of [3, 7]) addBox(scene, [1, 0.65, 1], [x, 0.25, 0], stone);
    const stations = projects.map((project, index) => {
      const [x, z] = stationPosition(index);
      const group = buildProjectStation(project, index, x, 0, chapterColors[index % chapterColors.length]);
      group.position.z = z; group.scale.setScalar(0.75); scene.add(group);
      sculpt(scene, new THREE.CylinderGeometry(1.6, 1.6, 0.04, 24), stone, [x, 0.01, z + 3.5]);
      return group;
    });
    const canopies: THREE.Mesh[] = [];
    const landscape = buildLandscape(scene);
    const explorer = buildExplorer(); scene.add(explorer.root); explorer.drone.visible = false;
    mount.dataset.character = "male";
    const parcel = addBox(explorer.body, [0.45, 0.32, 0.28], [0, 0.05, 0.56], stone); parcel.visible = false;
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const player = { x: 0, z: 0, y: 0, vy: 0, vx: 0, vz: 0 };
    const effects = createGardenEffects(scene);
    const pointer = new THREE.Vector2();
    let hover = -1, hoveredTarget = -1, pointerInside = false, lastHoverTime = 0, waveUntil = 0, landingSquash = 0, lastStep = 0;
    let evening = false, lightBlend = 0;
    let pausedRenderDirty = true, renderedLightBlend = Number.NaN;
    const daySky = new THREE.Color(worldPalette.sky), nightSky = new THREE.Color(worldPalette.slateLight);
    const warmLight = new THREE.Color(worldPalette.warm), dayLight = sun.color.clone();
    const state: GardenState = { ...initialGardenState, collected: [], completed: [] };
    const projectRefs: GardenProjectRef[] = projects.map(project => ({ name: project.name, mode: storyFor(project).mode }));
    let pendingResume: GardenActiveSave | null = null;
    const hasUnavailableResume = () => pendingResume !== null && !projectRefs.some(project => project.name === pendingResume?.project);
    const unavailableResumeMessage = () => `A saved story from ${pendingResume?.project} is not available in this project list. Your progress remains saved. Use Escape or choose Discard saved story below.`;
    let persistedCompleted: string[] = [];
    try {
      const saved = readGardenSave(
        localStorage.getItem(GARDEN_SESSION_STORAGE_KEY),
        localStorage.getItem(GARDEN_LEGACY_STORAGE_KEY),
        projectRefs,
      );
      persistedCompleted = [...saved.completed];
      // Keep unknown historical names in the save, but only expose current projects to the UI.
      state.completed = saved.completed.filter(name => projectRefs.some(project => project.name === name));
      pendingResume = saved.active;
      if (pendingResume) {
        const resumeIndex = projects.findIndex(project => project.name === pendingResume?.project);
        state.resumable = true;
        state.resumeProject = resumeIndex;
        state.message = resumeIndex < 0
          ? unavailableResumeMessage()
          : `A story is paused at ${pendingResume.progress}/3. Resume it when you are ready.`;
      }
    } catch { state.storage = false; }
    const activeSave = (): GardenActiveSave | null => {
      if (state.active < 0 || !projects[state.active]) return null;
      return {
        project: projects[state.active].name,
        mode: storyFor(projects[state.active]).mode,
        progress: state.progress,
        carrying: state.carrying,
        collected: [...state.collected],
      };
    };
    const persist = (active?: GardenActiveSave | null) => {
      try {
        const completed = [...new Set([...persistedCompleted, ...state.completed])];
        persistedCompleted = completed;
        const nextActive = active === undefined ? activeSave() ?? pendingResume : active;
        const save = { version: 2 as const, completed, active: nextActive };
        localStorage.setItem(GARDEN_SESSION_STORAGE_KEY, serializeGardenSave(save));
        // Keep the legacy key a completion array so older builds never parse an object.
        localStorage.setItem(GARDEN_LEGACY_STORAGE_KEY, serializeLegacyCompletions(completed));
      } catch { state.storage = false; }
    };
    const emit = () => {
      mount.dataset.active = String(state.active); mount.dataset.progress = String(state.progress);
      mount.dataset.collected = state.collected.join(","); mount.dataset.completed = String(state.completed.length);
      mount.dataset.completedProject = String(state.completedProject);
      mount.dataset.resumable = String(state.resumable);
      mount.dataset.resumeProject = String(state.resumeProject);
      persist();
      onState({ ...state, collected: [...state.collected], completed: [...state.completed] });
    };
    const keys = new Set<string>();
    let destination: THREE.Vector3 | null = null, elapsed = 0, phase = 0, hitPad = -1, contextLost = false, contextRecoveryTimer: number | null = null;
    let metricStartedAt = performance.now(), metricLastFrameAt = metricStartedAt, metricFrames = 0, metricFrameTotal = 0;
    let route: THREE.Vector3[] = [], guidedTarget: number | null = null, guidedResume = false;
    // Respect the OS preference before the first frame, including slow hydration.
    let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tokens = new THREE.Group(); scene.add(tokens); tokens.visible = false;
    const tokenMaterial = new THREE.MeshStandardMaterial({ color: worldPalette.warm, emissive: worldPalette.brass, emissiveIntensity: 0.2, roughness: 0.8 });
    const targets = [0, 1, 2].map(index => {
      const group = new THREE.Group();
      sculpt(group, new THREE.CylinderGeometry(0.72, 0.82, 0.12, 20), tokenMaterial, [0, 0.05, 0]);
      for (let n = 0; n <= index; n++) sculpt(group, new THREE.BoxGeometry(0.14, 0.45, 0.14), wood, [(n - index / 2) * 0.25, 0.38, 0]);
      const focus = new THREE.Mesh(new THREE.RingGeometry(0.88, 0.98, 32), new THREE.MeshBasicMaterial({ color: worldPalette.cobaltLight, side: THREE.DoubleSide, depthWrite: false }));
      focus.rotation.x = -Math.PI / 2; focus.position.y = 0.03; focus.visible = false; group.add(focus);
      group.userData.focus = focus;
      tokens.add(group); return group;
    });
    let selectedTarget: number | null = null;
    const deliveredBooks = Array.from({ length: 3 }, () => {
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.3), tokenMaterial);
      book.scale.setScalar(0); book.visible = false; tokens.add(book);
      return book;
    });
    let parcelScale = 0, cameraKick = 0;
    const clearGuidance = (message?: string) => {
      const shouldEmit = state.guiding !== null || message !== undefined;
      destination = null; route = []; guidedTarget = null; guidedResume = false;
      state.guiding = null;
      if (message !== undefined) state.message = message;
      if (shouldEmit) emit();
    };
    const targetIndexFrom = (object: THREE.Object3D) =>
      targets.findIndex(target => target.visible && target.getObjectById(object.id));
    const focusedTarget = () => {
      if (state.active < 0) return -1;
      const mode = projectRefs[state.active].mode;
      const next = mode === "deliver" ? (state.carrying ? 2 : 0)
        : mode === "sequence" ? state.progress
          : targets.findIndex(target => target.visible);
      return selectedTarget !== null && targets[selectedTarget]?.visible ? selectedTarget : next;
    };
    const moveToTarget = (index: number) => {
      if (state.active < 0 || !targets[index]?.visible) return;
      const mode = projectRefs[state.active].mode;
      if (mode === "deliver" && index !== (state.carrying ? 2 : 0)) {
        state.message = state.carrying
          ? "Deliver the book at the highlighted display."
          : "Pick up a book from the highlighted tray first.";
        emit();
        return;
      }
      const action = mode === "deliver" ? index === 0 ? "pick up the book" : "deliver the book"
        : mode === "sequence" ? `step onto pad ${index + 1}` : `collect idea ${index + 1}`;
      const warning = mode === "sequence" && index !== state.progress
        ? ` Pad ${state.progress + 1} is next; another pad resets progress.`
        : "";
      selectedTarget = index;
      clearGuidance(`Heading to ${action}.${warning}`);
      destination = targets[index].position.clone();
      cameraKick = 0.32;
      if (!reduced) effects.burst(destination.x, destination.z, 0.65);
    };
    const buildStationRoute = (index: number) => {
      const [targetX, targetZ] = stationPosition(index);
      const approachZ = targetZ + 3.5;
      const directX = targetX - player.x, directZ = approachZ - player.z;
      const directLengthSq = directX * directX + directZ * directZ;
      const directPathClear = projects.every((_, projectIndex) => {
        const [stationX, stationZ] = stationPosition(projectIndex);
        const ratio = directLengthSq ? THREE.MathUtils.clamp(((stationX - player.x) * directX + (stationZ - player.z) * directZ) / directLengthSq, 0, 1) : 0;
        return Math.hypot(player.x + directX * ratio - stationX, player.z + directZ * ratio - stationZ) > 2.1;
      });
      if (directPathClear) return [new THREE.Vector3(targetX, 0, approachZ)];
      const rows = projects.map((_, projectIndex) => stationPosition(projectIndex)[1]);
      const nearestRow = rows.reduce((nearest, row) => Math.abs(player.z - row) < Math.abs(player.z - nearest) ? row : nearest, rows[0]);
      const safeZ = THREE.MathUtils.clamp(nearestRow + (player.z < nearestRow ? -2.8 : 2.8), -13, maxZ - 3);
      const currentZSafe = rows.every(row => Math.abs(player.z - row) > 2.4);
      const travelZ = currentZSafe ? player.z : safeZ;
      const sideX = [-18, 18].reduce((best, candidate) => Math.abs(player.x - candidate) + Math.abs(candidate - targetX) < Math.abs(player.x - best) + Math.abs(best - targetX) ? candidate : best, -18);
      const points: THREE.Vector3[] = [];
      const addPoint = (x: number, z: number) => {
        const previous = points[points.length - 1];
        if (!previous || Math.hypot(previous.x - x, previous.z - z) > 0.18) points.push(new THREE.Vector3(x, 0, z));
      };
      if (!currentZSafe) addPoint(player.x, safeZ);
      addPoint(sideX, travelZ);
      addPoint(sideX, approachZ);
      addPoint(targetX, approachZ);
      return points;
    };
    const guideToStation = (index: number, autoStart: boolean) => {
      if (!Number.isInteger(index) || index < 0 || index >= projects.length) return;
      if (autoStart && hasUnavailableResume()) {
        state.message = unavailableResumeMessage();
        emit();
        return;
      }
      clearGuidance();
      route = buildStationRoute(index);
      destination = route.shift() ?? null;
      guidedTarget = autoStart ? index : null;
      guidedResume = false;
      state.guiding = guidedTarget;
      state.completedProject = null;
      state.message = autoStart
        ? `Walk to ${projects[index].name}. Its story will begin when you reach the workshop.`
        : `Explore ${projects[index].name}. Press E near its workshop to play; movement controls change your course.`;
      emit();
    };
    const prepareEvent = (index: number, resume: GardenActiveSave | null = null) => {
      const mode = storyFor(projects[index]).mode;
      state.active = index;
      state.progress = resume?.progress ?? 0;
      state.carrying = resume?.carrying ?? false;
      state.collected = resume ? [...resume.collected] : [];
      state.completedProject = null;
      state.resumable = false;
      state.resumeProject = null;
      pendingResume = null;
      hitPad = -1;
      selectedTarget = null;
      const [x, z] = stationPosition(index);
      [[x - 3, z + 4], [x, z + 6.5], [x + 3, z + 4]].forEach(([tx, tz], targetIndex) => {
        targets[targetIndex].position.set(tx, 0, tz);
        targets[targetIndex].visible = mode !== "deliver" || targetIndex !== 1;
      });
      deliveredBooks.forEach((book, bookIndex) => {
        book.position.set(x + 3 + (bookIndex - 1) * 0.52, 0.16 + bookIndex * 0.02, z + 4 + (bookIndex === 1 ? 0.3 : 0));
        book.scale.setScalar(0);
        book.visible = false;
      });
      if (mode !== "deliver") state.collected.forEach(targetIndex => { if (targets[targetIndex]) targets[targetIndex].visible = false; });
      tokens.visible = true;
      state.message = resume ? `Story resumed at ${state.progress}/3. Continue where you left off.` : storyFor(projects[index]).premise;
      persist(activeSave());
      emit();
    };
    const startEvent = (requestedIndex?: number) => {
      if (!controls.current.started || controls.current.paused || state.active >= 0) return;
      if (hasUnavailableResume()) {
        state.message = unavailableResumeMessage();
        emit();
        return;
      }
      if (requestedIndex === undefined && state.resumable) {
        state.message = "A saved story is waiting. Resume it or choose a chapter from the trail.";
        emit();
        return;
      }
      const index = requestedIndex ?? state.nearby;
      if (!Number.isInteger(index) || index < 0 || index >= projects.length) return;
      clearGuidance();
      prepareEvent(index);
      if (!reduced) effects.burst(player.x, player.z, 1.2);
    };
    const resumeEvent = () => {
      if (!controls.current.started || controls.current.paused || state.active >= 0 || !pendingResume) return;
      const index = projects.findIndex(project => project.name === pendingResume?.project);
      if (index < 0) {
        state.resumable = true;
        state.resumeProject = -1;
        state.message = unavailableResumeMessage();
        emit();
        return;
      }
      clearGuidance();
      route = buildStationRoute(index);
      destination = route.shift() ?? null;
      guidedTarget = index;
      guidedResume = true;
      state.guiding = index;
      state.resumeProject = index;
      state.message = `Returning to ${projects[index].name}. Your saved story is safe.`;
      emit();
      if (!destination) prepareEvent(index, pendingResume);
    };
    const cancel = () => {
      clearGuidance();
      pendingResume = null;
      state.resumable = false;
      state.resumeProject = null;
      state.active = -1; state.progress = 0; state.carrying = false; state.collected = []; state.completedProject = null; tokens.visible = false; parcel.visible = false;
      selectedTarget = null;
      deliveredBooks.forEach(book => { book.scale.setScalar(0); book.visible = false; }); parcelScale = 0;
      persist(null);
      state.message = "Event stopped. Finished chapters are safe. Start again whenever you like."; emit();
    };
    const action = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isGardenCommand(detail)) return;
      if (detail.endsWith("-up")) { keys.delete(detail.slice(0, -3)); return; }
      if (detail === "motion-full" || detail === "motion-system") { reduced = detail === "motion-system"; return; }
      if (detail === "light") { evening = !evening; return; }
      if (controls.current.paused || !controls.current.started) { clearInput(); return; }
      if (detail === "resume") resumeEvent();
      if (detail === "bloom") {
        landscape.wake();
        if (!reduced) effects.burst(player.x, player.z, 2.5, 0xeeb7ab);
        mount.dataset.gardenResponse = "bloom";
      }
      if (detail.startsWith("target:") && state.active >= 0) {
        const index = Number(detail.slice(7));
        if (Number.isInteger(index)) moveToTarget(index);
      }
      if (detail.startsWith("visit:")) {
        const index = Number(detail.slice(6));
        if (Number.isInteger(index) && index >= 0 && index < projects.length) guideToStation(index, false);
      }
      if (detail.startsWith("tour:")) {
        const index = Number(detail.slice(5));
        if (Number.isInteger(index) && index >= 0 && index < projects.length) guideToStation(index, true);
      }
      if (detail === "wave") { waveUntil = elapsed + 1.8; mount.dataset.gesture = "wave"; }
      if (detail === "start") startEvent();
      if (detail === "cancel") cancel();
      if (detail === "home") { player.x = 0; player.z = 0; player.vx = 0; player.vz = 0; clearGuidance(); }
      if (detail === "jump" && player.y === 0 && !controls.current.paused) player.vy = 7;
      else if (["left", "right", "up", "down"].includes(detail)) { keys.add(detail); clearGuidance(); }
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("button, a, input, textarea, [role=dialog]")) return;
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
      if (controls.current.paused) { clearInput(); return; }
      if (key === "escape" && (state.active >= 0 || hasUnavailableResume())) { cancel(); return; }
      if (!controls.current.started) { clearInput(); return; }
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) { keys.add(key); clearGuidance(); }
      if (key === "e" && !event.repeat) startEvent();
      if (key === "r" && !event.repeat && !controls.current.paused) { waveUntil = elapsed + 1.8; mount.dataset.gesture = "wave"; }
      if (key === " " && player.y === 0 && !event.repeat && !controls.current.paused) player.vy = 7;
    };
    const keyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const clearInput = () => { keys.clear(); player.vx = 0; player.vz = 0; };
    const raycaster = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const pointerMove = (event: PointerEvent) => {
      if (controls.current.paused) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      pointerInside = event.pointerType !== "touch";
      if (elapsed - lastHoverTime < 0.05) return;
      lastHoverTime = elapsed;
      raycaster.setFromCamera(pointer, camera);
      const targetHit = state.active >= 0
        ? raycaster.intersectObjects(targets.filter(target => target.visible), true)[0]
        : undefined;
      hoveredTarget = targetHit ? targetIndexFrom(targetHit.object) : -1;
      const hit = raycaster.intersectObjects(stations, true)[0];
      hover = hit ? Number(hit.object.userData.projectIndex ?? -1) : -1;
      canvas.style.cursor = hover >= 0 || hoveredTarget >= 0 ? "pointer" : "crosshair";
      mount.dataset.hovered = String(hover);
      mount.dataset.targetHover = String(hoveredTarget);
    };
    const pointerLeave = () => { pointerInside = false; hover = -1; hoveredTarget = -1; pointer.set(0, 0); mount.dataset.hovered = "-1"; mount.dataset.targetHover = "-1"; };
    const click = (event: PointerEvent) => {
      if (!controls.current.started || controls.current.paused) return;
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      if (state.active >= 0) {
        const targetHit = raycaster.intersectObjects(targets.filter(target => target.visible), true)[0];
        if (targetHit) {
          const index = targetIndexFrom(targetHit.object);
          if (index >= 0) moveToTarget(index);
          canvas.focus(); return;
        }
      }
      const gardenHit = raycaster.intersectObjects(landscape.interactables, true)[0];
      if (gardenHit) {
        landscape.wake(); mount.dataset.gardenResponse = "bloom";
        if (!reduced) effects.burst(gardenHit.point.x, gardenHit.point.z, 1.8, 0xeeb7ab);
        canvas.focus(); return;
      }
      if (raycaster.intersectObject(explorer.root, true).length) {
        waveUntil = elapsed + 1.8; mount.dataset.gesture = "wave"; canvas.focus(); return;
      }
      const landmark = raycaster.intersectObjects(stations, true)[0];
      if (landmark) {
        const index = Number(landmark.object.userData.projectIndex ?? -1);
        if (index >= 0) {
          const [x, z] = stationPosition(index);
          guideToStation(index, false);
          cameraKick = 0.32;
          if (!reduced) effects.burst(x, z + 3.5, 0.6);
          canvas.focus(); return;
        }
      }
      const point = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, point)) {
        clearGuidance();
        destination = point; destination.x = THREE.MathUtils.clamp(point.x, -19, 19); destination.z = THREE.MathUtils.clamp(point.z, -15, maxZ - 2);
        cameraKick = 0.22;
        if (!reduced) effects.burst(destination.x, destination.z, 0.45);
      }
      canvas.focus();
    };
    const resize = () => {
      const width = Math.max(mount.clientWidth, 1), height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height; camera.fov = width < 700 ? 49 : 38; camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 700 ? 1.25 : 1.5));
      renderer.setSize(width, height, false);
      pausedRenderDirty = true;
    };
    const loseContext = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      clearInput();
      mount.dataset.context = "lost";
      state.message = "The 3D canvas paused while the graphics context recovers. Your progress is safe.";
      emit();
      if (contextRecoveryTimer === null) {
        contextRecoveryTimer = window.setTimeout(() => {
          contextRecoveryTimer = null;
          if (contextLost) onError();
        }, 8000);
      }
    };
    const restoreContext = () => {
      contextLost = false;
      if (contextRecoveryTimer !== null) window.clearTimeout(contextRecoveryTimer);
      contextRecoveryTimer = null;
      mount.dataset.context = "restored";
      resize();
      state.message = state.active >= 0 ? "The 3D canvas is back. Continue your story." : state.message;
      emit();
      onReady();
    };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();
    window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", clearInput); document.addEventListener("visibilitychange", clearInput);
    window.addEventListener("ohaki:garden", action);
    window.addEventListener("ohaki:mobile", action);
    canvas.addEventListener("pointerdown", click); canvas.addEventListener("webglcontextlost", loseContext); canvas.addEventListener("webglcontextrestored", restoreContext);
    canvas.addEventListener("pointermove", pointerMove); canvas.addEventListener("pointerleave", pointerLeave);
    const clock = new THREE.Clock(), look = new THREE.Vector3(), cameraTarget = new THREE.Vector3();
    const recordFrame = () => {
      const now = performance.now();
      const frameMs = Math.max(0, Math.min(1000, now - metricLastFrameAt));
      metricLastFrameAt = now;
      metricFrames += 1;
      metricFrameTotal += frameMs;
      if (now - metricStartedAt < 1000) return;
      const elapsedMs = now - metricStartedAt;
      const info = renderer.info.render;
      mount.dataset.frameMs = (metricFrameTotal / Math.max(metricFrames, 1)).toFixed(2);
      mount.dataset.fps = (metricFrames * 1000 / elapsedMs).toFixed(1);
      mount.dataset.drawcalls = String(info.calls);
      mount.dataset.triangles = String(info.triangles);
      metricStartedAt = now;
      metricFrames = 0;
      metricFrameTotal = 0;
    };
    const complete = () => {
      if (state.active < 0) return;
      const completedIndex = state.active;
      const name = projects[completedIndex].name;
      if (!state.completed.includes(name)) state.completed.push(name);
      state.completedProject = completedIndex;
      state.message = storyFor(projects[completedIndex]).lesson;
      waveUntil = elapsed + 2;
      cameraKick = 0.8;
      if (!reduced) effects.burst(player.x, player.z, 2.5, 0xb8e3a0);
      clearGuidance();
      state.active = -1; state.progress = 0; state.carrying = false; state.collected = []; state.resumable = false; state.resumeProject = null; pendingResume = null; parcel.visible = false; tokens.visible = false;
      deliveredBooks.forEach(book => { book.scale.setScalar(0); book.visible = false; }); parcelScale = 0;
      persist(null);
      emit();
    };
    const animate = () => {
      if (contextLost) return;
      const dt = Math.min(clock.getDelta(), 0.035);
      if (document.hidden) { clearInput(); return; }
      // Atmosphere preferences remain live while a menu pauses gameplay.
      lightBlend = THREE.MathUtils.damp(lightBlend, evening ? 1 : 0, reduced ? 100 : 2, dt);
      (scene.background as THREE.Color).copy(daySky).lerp(nightSky, lightBlend);
      (scene.fog as THREE.Fog).color.copy(scene.background as THREE.Color);
      sun.color.copy(dayLight).lerp(warmLight, lightBlend); sun.intensity = 2.3 - lightBlend * 1.1;
      mount.dataset.lighting = evening ? "evening" : "day";
      mount.dataset.motion = reduced ? "reduced" : "full";
      if (controls.current.paused) {
        clearInput();
        if (pausedRenderDirty || Math.abs(lightBlend - renderedLightBlend) > 0.001) {
          renderer.render(scene, camera);
          recordFrame();
          renderedLightBlend = lightBlend;
          pausedRenderDirty = false;
        }
        return;
      }
      elapsed += dt;
      const moving = controls.current.started;
      let dx = 0, dz = 0, arrivedTour: number | null = null;
      if (moving) {
        dx = Number(keys.has("d") || keys.has("arrowright") || keys.has("right")) - Number(keys.has("a") || keys.has("arrowleft") || keys.has("left"));
        dz = Number(keys.has("s") || keys.has("arrowdown") || keys.has("down")) - Number(keys.has("w") || keys.has("arrowup") || keys.has("up"));
        if (destination && !dx && !dz) {
          dx = destination.x - player.x; dz = destination.z - player.z;
          if (Math.hypot(dx, dz) < 0.16) {
            destination = route.shift() ?? null;
            if (!destination && guidedTarget !== null) { arrivedTour = guidedTarget; guidedTarget = null; }
            dx = 0; dz = 0;
          }
        }
      }
      const length = Math.hypot(dx, dz), speed = state.carrying ? 3.5 : 5.5;
      player.vx = THREE.MathUtils.damp(player.vx, length ? dx / length * speed : 0, 14, dt);
      player.vz = THREE.MathUtils.damp(player.vz, length ? dz / length * speed : 0, 14, dt);
      if (!moving) {
        player.vx = 0; player.vz = 0;
        if (keys.size) clearInput();
      }
      player.x = THREE.MathUtils.clamp(player.x + player.vx * dt, -19, 19);
      player.z = THREE.MathUtils.clamp(player.z + player.vz * dt, -15, maxZ - 2);
      stations.forEach(station => {
        const ox = player.x - station.position.x, oz = player.z - station.position.z, distance = Math.hypot(ox, oz);
        if (distance < 1.8) {
          player.x = station.position.x + (distance ? ox / distance : 0) * 1.8;
          player.z = station.position.z + (distance ? oz / distance : 1) * 1.8; destination = null;
        }
      });
      const oldHeight = player.y;
      if (moving) { player.vy -= dt * 20; player.y = Math.max(0, player.y + player.vy * dt); if (!player.y) player.vy = 0; }
      if (oldHeight > 0 && player.y === 0) {
        landingSquash = reduced ? 0 : 0.19;
        if (!reduced) effects.burst(player.x, player.z, 1.2);
      }
      landingSquash = THREE.MathUtils.damp(landingSquash, 0, 9, dt);
      const velocity = Math.hypot(player.vx, player.vz); phase += velocity * dt * 2.1;
      explorer.root.position.set(player.x, player.y, player.z);
      if (velocity > 0.05) {
        const angle = Math.atan2(player.vx, player.vz);
        explorer.root.rotation.y += Math.atan2(Math.sin(angle - explorer.root.rotation.y), Math.cos(angle - explorer.root.rotation.y)) * Math.min(1, dt * 12);
      }
      const gait = reduced ? 0 : Math.min(velocity / 5.5, 1);
      if (!reduced && moving && player.y === 0 && velocity > 1 && phase - lastStep > Math.PI) {
        lastStep = phase; effects.burst(player.x, player.z, 0.18, 0xd4c6a0);
      }
      explorer.legL.rotation.x = Math.sin(phase) * 0.6 * gait; explorer.legR.rotation.x = -explorer.legL.rotation.x;
      explorer.armL.rotation.x = -Math.sin(phase) * 0.4 * gait; explorer.armR.rotation.x = Math.sin(phase) * 0.4 * gait;
      const waving = elapsed < waveUntil && moving && velocity < 0.3;
      explorer.armL.rotation.z = THREE.MathUtils.damp(explorer.armL.rotation.z, waving ? -2.2 + (reduced ? 0 : Math.sin(elapsed * 15) * 0.25) : 0.08, 12, dt);
      explorer.elbows[0].rotation.x = THREE.MathUtils.damp(explorer.elbows[0].rotation.x, waving ? -0.8 : -0.2, 10, dt);
      if (waving) explorer.root.rotation.y = THREE.MathUtils.damp(explorer.root.rotation.y, Math.atan2(5, 20), 7, dt);
      mount.dataset.gesture = waving ? "wave" : "idle";
      explorer.head.rotation.y = THREE.MathUtils.damp(explorer.head.rotation.y, !reduced && pointerInside && velocity < 0.3 ? pointer.x * 0.3 : 0, 5, dt);
      explorer.body.scale.set(1 + landingSquash * 0.5, 1 - landingSquash, 1 + landingSquash * 0.5);
      explorer.knees.forEach((knee, i) => { knee.rotation.x = Math.max(0, Math.sin(phase + i * Math.PI)) * 0.55 * gait; });
      explorer.body.position.y = 1.35 + (reduced ? 0 : Math.sin(elapsed * 2) * 0.015 + Math.abs(Math.sin(phase)) * 0.04 * gait);
      explorer.body.rotation.x = THREE.MathUtils.damp(explorer.body.rotation.x, gait * 0.09, 6, dt);
      explorer.hair.rotation.x = -explorer.body.rotation.x * 0.4;
      explorer.scarf.rotation.x = THREE.MathUtils.damp(explorer.scarf.rotation.x, gait * 0.65, 5, dt);
      explorer.lantern.rotation.z = reduced ? 0 : Math.sin(phase - 0.5) * 0.15 * gait;
      explorer.eyes.forEach(eye => { eye.scale.y = reduced ? 1 : 1 - Math.pow(Math.max(0, Math.cos(elapsed * 1.45)), 64) * 0.92; });
      parcelScale = THREE.MathUtils.damp(parcelScale, state.carrying ? 1 : 0, reduced ? 100 : 12, dt);
      parcel.visible = parcelScale > 0.01;
      parcel.scale.setScalar(parcelScale);
      let nearby = -1, nearest = 6.5;
      stations.forEach((station, index) => {
        const distance = Math.hypot(player.x - station.position.x, player.z - station.position.z);
        if (distance < nearest) { nearest = distance; nearby = index; }
        const restored = state.completed.includes(projects[index].name);
        station.userData.runtime.signal.scale.setScalar(restored ? 2 : 1);
        const engaged = index === hover || index === state.nearby || index === state.active;
        const runtime = station.userData.runtime;
        runtime.label.visible = controls.current.started && (index === nearby || index === hover || index === state.active);
        runtime.signal.material.emissiveIntensity = restored ? 2.6 : 0.35;
        runtime.pulse.material.color.setHex(restored ? 0xbde4ab : 0xb88c4f);
        runtime.pulse.rotation.y = reduced ? 0 : elapsed * (engaged ? 1 : 0.2);
        runtime.core.position.y = THREE.MathUtils.damp(runtime.core.position.y, engaged ? 3.3 : 2.7, 5, dt);
        runtime.core.material.emissiveIntensity = THREE.MathUtils.damp(runtime.core.material.emissiveIntensity, engaged ? 1 : 0.2, 5, dt);
        runtime.pulse.scale.setScalar(THREE.MathUtils.damp(runtime.pulse.scale.x, engaged ? 1.22 : 1, 5, dt));
      });
      const nearbyChanged = nearby !== state.nearby;
      if (nearbyChanged) state.nearby = nearby;
      if (arrivedTour !== null) {
        if (guidedResume && pendingResume) {
          const saved = pendingResume;
          guidedResume = false;
          prepareEvent(arrivedTour, saved);
        } else startEvent(arrivedTour);
      }
      else if (nearbyChanged) emit();
      const mode = state.active >= 0 ? projectRefs[state.active].mode : null;
      const nextTarget = focusedTarget();
      targets.forEach((target, index) => {
        const focus = target.userData.focus as THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
        const focused = state.active >= 0 && target.visible && index === nextTarget;
        focus.visible = focused;
        focus.scale.setScalar(!reduced && focused ? 1 + Math.sin(elapsed * 4) * 0.06 : 1);
        target.scale.setScalar(!reduced && focused ? 1 + Math.sin(elapsed * 4) * 0.045 : 1);
      });
      deliveredBooks.forEach((book, index) => {
        const shouldShow = mode === "deliver" && index < state.progress;
        const scale = THREE.MathUtils.damp(book.scale.x, shouldShow ? 1 : 0, reduced ? 100 : 12, dt);
        book.scale.setScalar(scale);
        book.visible = scale > 0.01;
      });
      if (moving && state.active >= 0 && player.y < 0.4) {
        const hit = targets.findIndex(t => t.visible && Math.hypot(player.x - t.position.x, player.z - t.position.z) < 0.9);
        const previousProgress = state.progress, wasCarrying = state.carrying;
        let sequenceReset = false;
        if (mode === "collect" && hit >= 0) {
          targets[hit].visible = false; selectedTarget = null; state.collected = [...state.collected, hit]; state.progress++; state.message = `Idea collected (${state.progress}/3). Follow the highlighted mark to the next one.`; emit();
        } else if (mode === "sequence" && hit >= 0 && hit !== hitPad) {
          selectedTarget = null;
          if (hit === state.progress) { targets[hit].visible = false; state.collected = [...state.collected, hit]; state.progress++; state.message = `Connected (${state.progress}/3). Follow the next numbered pad.`; }
          else { sequenceReset = true; state.progress = 0; state.collected = []; targets.forEach(t => { t.visible = true; }); state.message = "Wrong pad. Sequence reset to 0/3. Start at pad 1."; }
          emit();
        } else if (mode === "deliver" && hit >= 0) {
          selectedTarget = null;
          if (!state.carrying && hit === 0) { state.carrying = true; state.message = `Picked up book ${state.progress + 1} of 3. Carry it to the three-peg display.`; emit(); }
          else if (state.carrying && hit === 2) { state.carrying = false; state.progress++; state.message = `Book delivered (${state.progress}/3). Return to the one-peg tray.`; emit(); }
        }
        hitPad = hit;
        const changed = state.progress !== previousProgress || state.carrying !== wasCarrying;
        if (changed || sequenceReset) cameraKick = sequenceReset ? -0.55 : 0.55;
        if (!reduced && sequenceReset) effects.burst(targets[hit].position.x, targets[hit].position.z, 0.9, 0xe6a48d);
        else if (!reduced && changed) effects.burst(player.x, player.z, 1.5, 0xf4cd84);
        if (state.progress >= 3) complete();
      }
      // Keep the avatar between the top story panel and mobile movement deck;
      // desktop gets a little more forward context for the workshop landmarks.
      look.set(player.x, narrowViewport ? 1.3 : 1, player.z + (narrowViewport ? 1.1 : 0));
      cameraTarget.set(player.x + (narrowViewport ? 2.8 : 5), narrowViewport ? 14 : 16.5, player.z + (narrowViewport ? 17 : 20));
      cameraKick = THREE.MathUtils.damp(cameraKick, 0, reduced ? 100 : 9, dt);
      cameraTarget.y += reduced ? 0 : cameraKick;
      if (!reduced && pointerInside && !controls.current.paused) { cameraTarget.x += pointer.x * 0.65; cameraTarget.y += pointer.y * 0.35; }
      canopies.forEach((tree, index) => {
        const near = Math.max(0, 1 - Math.hypot(player.x - tree.position.x, player.z - tree.position.z) / 5);
        tree.rotation.z = reduced ? 0 : Math.sin(elapsed * 1.4 + index) * (0.025 + near * 0.12);
      });
      const effectState = effects.update(dt, elapsed, reduced, destination);
      landscape.update(dt, elapsed, reduced || controls.current.paused, player.x, player.z, state.completed.length);
      mount.dataset.effectBursts = String(effectState.total); mount.dataset.effectParticles = String(effectState.active);
      mount.dataset.lighting = evening ? "evening" : "day";
      if (!controls.current.started) {
        look.set(0, 1.1, 5);
        cameraTarget.set(narrowViewport ? 15 : 24, narrowViewport ? 19 : 23, narrowViewport ? 26 : 33);
      }
      camera.position.lerp(cameraTarget, reduced ? 1 : 1 - Math.exp(-dt * 5)); camera.lookAt(look);
      mount.dataset.playerX = player.x.toFixed(3); mount.dataset.playerZ = player.z.toFixed(3); mount.dataset.playerY = player.y.toFixed(3);
      mount.dataset.motion = reduced ? "reduced" : "full"; mount.dataset.gaitPhase = phase.toFixed(3);
      renderer.render(scene, camera);
      recordFrame();
      renderedLightBlend = lightBlend;
      pausedRenderDirty = false;
    };
    window.render_game_to_text = () => {
      const targetFocus = focusedTarget();
      return JSON.stringify({
        mode: state.active >= 0 ? "chapter" : controls.current.started ? "exploring" : "intro",
        player: { x: Number(player.x.toFixed(2)), y: Number(player.y.toFixed(2)), z: Number(player.z.toFixed(2)) },
        nearbyProject: state.nearby >= 0 ? projects[state.nearby]?.name ?? null : null,
        activeProject: state.active >= 0 ? projects[state.active]?.name ?? null : null,
        progress: state.progress,
        carrying: state.carrying,
        collected: [...state.collected],
        targetFocus,
        visibleTargets: targets.map(target => target.visible),
        destination: destination ? { x: Number(destination.x.toFixed(2)), z: Number(destination.z.toFixed(2)) } : null,
        completed: [...state.completed],
        resumable: state.resumable,
        paused: controls.current.paused,
        reducedMotion: reduced,
        status: state.message,
        coordinateNote: "world origin is the entry point; +x and +z increase world coordinates; +y is height",
      });
    };
    camera.position.set(17, 28, 35); emit(); renderer.setAnimationLoop(animate); onReady();
    return () => {
      renderer.setAnimationLoop(null); observer.disconnect();
      delete window.render_game_to_text;
      if (contextRecoveryTimer !== null) window.clearTimeout(contextRecoveryTimer);
      window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", clearInput); document.removeEventListener("visibilitychange", clearInput);
      window.removeEventListener("ohaki:garden", action);
      window.removeEventListener("ohaki:mobile", action);
      canvas.removeEventListener("pointerdown", click); canvas.removeEventListener("webglcontextlost", loseContext); canvas.removeEventListener("webglcontextrestored", restoreContext);
      canvas.removeEventListener("pointermove", pointerMove); canvas.removeEventListener("pointerleave", pointerLeave);
      const materials = new Set<THREE.Material>();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) object.geometry.dispose();
        if (object instanceof THREE.Mesh || object instanceof THREE.Sprite || object instanceof THREE.LineSegments) {
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
        }
      });
      materials.forEach(material => { for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose(); material.dispose(); });
      renderer.dispose(); canvas.remove();
    };
  }, [projects, onState, onReady, onError]);
  return <div ref={mountRef} className="side-world" data-testid="side-world" />;
}
