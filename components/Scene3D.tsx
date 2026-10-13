"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Volumen donde flotan las partículas (unidades de la escena).
const BOUNDS = { x: 9, y: 5.5, z: 3 };
const SPEED = 0.3;
// Distancia máxima de conexión entre partículas y entre partícula y ratón.
const LINK_DIST = 2.2;
const MOUSE_DIST = 3.2;
// Tope de segmentos para acotar el coste por fotograma.
const MAX_SEGMENTS = 2600;

/** Textura circular con degradado para que los nodos se vean como puntos luminosos. */
function makeSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(200,245,255,0.9)");
  g.addColorStop(1, "rgba(120,220,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function Network() {
  const group = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0, active: false });
  const tmp = useMemo(() => new THREE.Vector3(), []);

  // Menos nodos en pantallas pequeñas para mantener los FPS.
  const count = useMemo(() => (window.innerWidth < 768 ? 110 : 200), []);

  const { pointsGeo, lineGeo, positions, velocities, linePos, lineCol, sprite } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * BOUNDS.x;
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * BOUNDS.y;
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * BOUNDS.z;
      velocities[i * 3] = (Math.random() * 2 - 1) * SPEED;
      velocities[i * 3 + 1] = (Math.random() * 2 - 1) * SPEED;
      velocities[i * 3 + 2] = (Math.random() * 2 - 1) * SPEED * 0.5;
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const linePos = new Float32Array(MAX_SEGMENTS * 6);
    const lineCol = new Float32Array(MAX_SEGMENTS * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setDrawRange(0, 0);

    return { pointsGeo, lineGeo, positions, velocities, linePos, lineCol, sprite: makeSprite() };
  }, [count]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const g = group.current;
    if (!g) return;

    // Parallax suave del conjunto según el ratón.
    const { x: px, y: py } = state.pointer;
    g.position.x += (px * 0.5 - g.position.x) * dt * 2;
    g.position.y += (py * 0.35 - g.position.y) * dt * 2;

    // El ratón se activa tras el primer movimiento (state.pointer arranca en 0,0).
    const m = mouse.current;
    if (px !== m.x || py !== m.y) m.active = true;
    m.x = px;
    m.y = py;

    // Posición del ratón en el plano z=0, en coordenadas locales del grupo.
    let mx = 0;
    let my = 0;
    if (m.active) {
      const cam = state.camera;
      tmp.set(px, py, 0.5).unproject(cam).sub(cam.position).normalize();
      const t = -cam.position.z / tmp.z;
      mx = cam.position.x + tmp.x * t - g.position.x;
      my = cam.position.y + tmp.y * t - g.position.y;
    }

    // Mover partículas con rebote en los límites.
    const lim = [BOUNDS.x, BOUNDS.y, BOUNDS.z];
    for (let i = 0; i < count * 3; i++) {
      positions[i] += velocities[i] * dt;
      const l = lim[i % 3];
      if (positions[i] > l || positions[i] < -l) {
        velocities[i] *= -1;
        positions[i] = Math.max(-l, Math.min(l, positions[i]));
      }
    }

    // Conexiones: la opacidad (brillo del color) baja linealmente con la distancia.
    let seg = 0;
    const link2 = LINK_DIST * LINK_DIST;
    const mouse2 = MOUSE_DIST * MOUSE_DIST;
    const addSegment = (
      ax: number, ay: number, az: number,
      bx: number, by: number, bz: number,
      k: number, r: number, gc: number, b: number,
    ) => {
      const o = seg * 6;
      linePos[o] = ax; linePos[o + 1] = ay; linePos[o + 2] = az;
      linePos[o + 3] = bx; linePos[o + 4] = by; linePos[o + 5] = bz;
      for (let v = 0; v < 2; v++) {
        lineCol[o + v * 3] = r * k;
        lineCol[o + v * 3 + 1] = gc * k;
        lineCol[o + v * 3 + 2] = b * k;
      }
      seg++;
    };

    for (let i = 0; i < count && seg < MAX_SEGMENTS; i++) {
      const ax = positions[i * 3], ay = positions[i * 3 + 1], az = positions[i * 3 + 2];
      for (let j = i + 1; j < count && seg < MAX_SEGMENTS; j++) {
        const dx = ax - positions[j * 3];
        const dy = ay - positions[j * 3 + 1];
        const dz = az - positions[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < link2) {
          const k = 1 - Math.sqrt(d2) / LINK_DIST;
          addSegment(ax, ay, az, positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2], k * 0.7, 0.45, 0.85, 1);
        }
      }
      if (m.active && seg < MAX_SEGMENTS) {
        const dx = ax - mx;
        const dy = ay - my;
        const dz = az; // el ratón vive en z=0
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < mouse2) {
          const k = 1 - Math.sqrt(d2) / MOUSE_DIST;
          addSegment(ax, ay, az, mx, my, 0, k * 0.55, 0.85, 0.95, 1);
        }
      }
    }

    lineGeo.setDrawRange(0, seg * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
    pointsGeo.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <points geometry={pointsGeo} frustumCulled={false}>
        <pointsMaterial
          map={sprite}
          size={0.16}
          sizeAttenuation
          color="#e6fbff"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments geometry={lineGeo} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  );
}

export default function Scene3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 55 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
    >
      <Network />
    </Canvas>
  );
}
