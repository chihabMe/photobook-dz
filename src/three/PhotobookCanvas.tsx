import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Photobook } from "./Photobook";

// Lazy R3F scene mounted over the poster <img>, faithful to the Stitch
// "Three.js" design screen: transparent background, one ambient + one
// point light, a fov-75 camera at z=3, and drag-to-rotate. Device gating +
// reduced-motion handling live in the loader (PhotobookMount).
export default function PhotobookCanvas() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={75} />

      {/* Matches the Stitch scene: soft ambient + a single point light. */}
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />

      <Photobook />

      {/* Drag-to-rotate. Auto-spin + bob live in the Photobook itself, so
          autoRotate stays off here to avoid doubling the motion. */}
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.1}
      />
    </Canvas>
  );
}
