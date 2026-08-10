"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles, Environment } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

/** A single gold coin. */
function Coin({ radius, speed, phase, y }: { radius: number; speed: number; phase: number; y: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.getElapsedTime() * speed + phase;
    if (ref.current) {
      ref.current.position.set(Math.cos(t) * radius, y + Math.sin(t * 1.3) * 0.15, Math.sin(t) * radius);
      ref.current.rotation.y += 0.03;
      ref.current.rotation.x += 0.01;
    }
  });
  return (
    <group ref={ref}>
      <mesh castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 48]} />
        <meshStandardMaterial color="#ecb23e" metalness={1} roughness={0.25} emissive="#7a5410" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

/** The central orb + orbiting system, with pointer parallax. */
function OrbSystem({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const coins = useMemo(
    () => [
      { radius: 2.1, speed: 0.5, phase: 0, y: 0.2 },
      { radius: 2.4, speed: 0.42, phase: 2.1, y: -0.4 },
      { radius: 1.9, speed: 0.6, phase: 4.0, y: 0.6 },
      { radius: 2.7, speed: 0.36, phase: 1.0, y: -0.1 },
      { radius: 2.2, speed: 0.48, phase: 5.2, y: 0.9 },
    ],
    []
  );

  useFrame((state) => {
    if (!group.current) return;
    if (reduced) return;
    // Gentle pointer parallax — the orb "looks" toward the cursor.
    const px = state.pointer.x * 0.35;
    const py = state.pointer.y * 0.25;
    group.current.rotation.y += (px - group.current.rotation.y) * 0.05;
    group.current.rotation.x += (-py - group.current.rotation.x) * 0.05;
  });

  return (
    <group ref={group}>
      <Float speed={reduced ? 0 : 1.4} rotationIntensity={reduced ? 0 : 0.4} floatIntensity={reduced ? 0 : 0.8}>
        <mesh castShadow>
          <icosahedronGeometry args={[1.35, 24]} />
          <MeshDistortMaterial
            color="#5566e6"
            emissive="#2a1e05"
            emissiveIntensity={0.15}
            distort={reduced ? 0.15 : 0.42}
            speed={reduced ? 0 : 1.6}
            roughness={0.15}
            metalness={0.6}
          />
        </mesh>
      </Float>

      {/* Orbiting coins */}
      {coins.map((c, i) => (
        <Coin key={i} {...c} />
      ))}

      {/* Star dust */}
      <Sparkles count={40} scale={7} size={2.4} speed={reduced ? 0 : 0.3} color="#f5f2ea" opacity={0.7} />
      <Sparkles count={18} scale={6} size={3} speed={reduced ? 0 : 0.2} color="#ecb23e" opacity={0.8} />
    </group>
  );
}

export default function GuruOrb() {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.6} color="#fff4d6" />
      <pointLight position={[-6, -2, -4]} intensity={40} color="#35c6a5" />
      <pointLight position={[4, -3, 3]} intensity={30} color="#7c86f2" />
      <OrbSystem reduced={reduced} />
      <Environment preset="city" />
    </Canvas>
  );
}
