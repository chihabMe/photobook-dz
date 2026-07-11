import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { FramedPhotobook } from "./FramedPhotobook";
import type { CoverMaterial, BookSize } from "./customizerOptions";

interface CustomizerCanvasProps {
  cover: CoverMaterial;
  size: BookSize;
  photoUrl: string | null;
  engraving?: string;
  coverOptions?: any[];
  sizeOptions?: any[];
}

// Interactive 3D preview for the customizer. Lighting/camera match the
// Stitch "Live 3D Customizer" scene (ambient 0.6 + one point light, fov 75
// at z=3). Drag to rotate; scroll to zoom.
export default function CustomizerCanvas({
  cover,
  size,
  photoUrl,
  engraving,
  coverOptions,
  sizeOptions,
}: CustomizerCanvasProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <PerspectiveCamera makeDefault position={[0, 1.2, 3]} fov={75} />

      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />

      <FramedPhotobook
        cover={cover}
        size={size}
        photoUrl={photoUrl}
        engraving={engraving}
        coverOptions={coverOptions}
        sizeOptions={sizeOptions}
      />

      <OrbitControls
        enablePan={false}
        enableZoom
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={6}
      />
    </Canvas>
  );
}
