"use client";

import dynamic from "next/dynamic";

// Three.js solo se renderiza en el cliente.
const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false });

export default function BackgroundScene() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <Scene3D />
    </div>
  );
}
