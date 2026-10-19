import * as THREE from "three";
import { worldPalette } from "./palette";

// A bounded pool, updated by the existing world loop. No timers or extra renderer.
export function createGardenEffects(scene: THREE.Scene) {
  const group = new THREE.Group();
  scene.add(group);
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.45, 32), new THREE.MeshBasicMaterial({ color: worldPalette.cobalt, side: THREE.DoubleSide, depthWrite: false }));
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  group.add(marker);
  const markerCross = new THREE.Group();
  markerCross.visible = false;
  const crossMaterial = new THREE.MeshBasicMaterial({ color: worldPalette.cobaltLight, transparent: true, opacity: 0.9, depthWrite: false });
  const crossHorizontal = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.025, 0.08), crossMaterial);
  const crossVertical = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 1.35), crossMaterial);
  markerCross.add(crossHorizontal, crossVertical);
  markerCross.position.y = 0.035;
  group.add(markerCross);
  const rings = Array.from({ length: 4 }, () => {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.72, 32), new THREE.MeshBasicMaterial({ color: worldPalette.cobaltLight, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2;
    group.add(mesh);
    return { mesh, age: 2, strength: 1 };
  });
  const count = 64;
  const flakes = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.065), new THREE.MeshBasicMaterial({ color: worldPalette.stoneLight }), count);
  flakes.frustumCulled = false;
  flakes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(flakes);
  const particles = Array.from({ length: count }, () => ({ x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1 }));
  const dummy = new THREE.Object3D();
  let next = 0, ringIndex = 0, total = 0;
  const burst = (x: number, z: number, strength = 1, color = Number.parseInt(worldPalette.warm.slice(1), 16)) => {
    const ring = rings[ringIndex++ % rings.length];
    ring.age = 0; ring.strength = strength; ring.mesh.position.set(x, 0.04, z); ring.mesh.material.color.setHex(color);
      for (let i = 0; i < Math.round(10 * strength); i++) {
      const id = next++ % count, angle = i * 2.39996 + total;
      Object.assign(particles[id], { x, z, y: 0.15, vx: Math.cos(angle) * strength * 1.8, vz: Math.sin(angle) * strength * 1.8, vy: 1.8 + (i % 4) * 0.5, life: 0.9, max: 0.9 });
      flakes.setColorAt(id, new THREE.Color(color));
    }
    if (flakes.instanceColor) flakes.instanceColor.needsUpdate = true;
    total++;
  };
  const update = (dt: number, time: number, reduced: boolean, destination: THREE.Vector3 | null) => {
    marker.visible = Boolean(destination);
    markerCross.visible = Boolean(destination);
    if (destination) {
      marker.position.set(destination.x, 0.035, destination.z);
      markerCross.position.set(destination.x, 0.035, destination.z);
      marker.scale.setScalar(reduced ? 1 : 1 + Math.sin(time * 5) * 0.12);
      markerCross.scale.setScalar(reduced ? 1 : 0.78 + Math.sin(time * 5 + Math.PI / 2) * 0.12);
    }
    rings.forEach(ring => {
      ring.age += dt * 1.5;
      ring.mesh.visible = !reduced && ring.age < 1;
      ring.mesh.scale.setScalar(0.4 + ring.age * ring.strength * 3);
      ring.mesh.material.opacity = Math.max(0, 1 - ring.age) * 0.6;
    });
    let active = 0;
    particles.forEach((p, index) => {
      p.life = reduced ? 0 : Math.max(0, p.life - dt);
      if (p.life > 0) {
        p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.vy -= dt * 5;
        dummy.position.set(p.x, Math.max(0.03, p.y), p.z);
        dummy.rotation.set(time * 2 + index, time + index, time * 3);
        dummy.scale.setScalar(p.life / p.max * 1.5);
        active++;
      } else dummy.scale.setScalar(0);
      dummy.updateMatrix(); flakes.setMatrixAt(index, dummy.matrix);
    });
    flakes.instanceMatrix.needsUpdate = true;
    return { active, total };
  };
  return { burst, update };
}
