import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Photobook geometry matching the Stitch "Three.js" design screen:
// a flat book lying down — a tan wooden top cover, a white page block,
// and a matching back cover, stacked along Y. Idle motion is a slow
// auto-spin plus a gentle sine bob (drag-to-rotate is handled by the
// OrbitControls in PhotobookCanvas).
//
// Stitch source proportions:
//   cover  = BoxGeometry(2, 0.1, 2)  wood  #D2B48C
//   pages  = BoxGeometry(1.9, 0.15, 1.9) white #ffffff
//   covers at y = +0.1 / -0.1, pages at y = 0
export function Photobook() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    // Continuous auto-spin (matches targetRotationY += 0.005 per frame).
    group.current.rotation.y += 0.005;
    // Gentle float bob (matches position.y = sin(t * 0.002) * 0.05, where
    // the Stitch source used Date.now(); elapsedTime * 2 keeps the cadence).
    group.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
  });

  return (
    <group ref={group}>
      {/* Top cover — light wood */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2, 0.1, 2]} />
        <meshPhongMaterial color={0xd2b48c} />
      </mesh>

      {/* Page block — white, slightly inset */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.9, 0.15, 1.9]} />
        <meshPhongMaterial color={0xffffff} />
      </mesh>

      {/* Back cover — light wood */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[2, 0.1, 2]} />
        <meshPhongMaterial color={0xd2b48c} />
      </mesh>
    </group>
  );
}
