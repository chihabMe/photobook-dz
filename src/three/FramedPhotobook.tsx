import { useRef, useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  COVER_OPTIONS,
  SIZE_OPTIONS,
  type CoverMaterial,
  type BookSize,
} from "./customizerOptions";

interface FramedPhotobookProps {
  cover: CoverMaterial;
  size: BookSize;
  photoUrl: string | null;
  coverOptions?: any[];
  sizeOptions?: any[];
}

// Loads an image URL into a THREE.Texture, disposing the previous one and
// revoking nothing here (the object URL is owned by the Customizer island).
function usePhotoTexture(photoUrl: string | null): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!photoUrl) {
      setTexture(null);
      return;
    }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(photoUrl, (tex) => {
      if (cancelled) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      setTexture(tex);
    });
    return () => {
      cancelled = true;
    };
  }, [photoUrl]);

  // Dispose the texture when it changes or the component unmounts.
  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  return texture;
}

// The customizable photobook. Faithful to the Stitch scene (flat book:
// wood/leather covers + white page block, auto-spin + bob), extended so the
// front cover shows an inset "frame" that displays the user's uploaded photo.
export function FramedPhotobook({
  cover,
  size,
  photoUrl,
  coverOptions,
  sizeOptions,
}: FramedPhotobookProps) {
  const group = useRef<THREE.Group>(null);

  const coverColor = useMemo(
    () => (coverOptions || COVER_OPTIONS).find((c) => c.value === cover)?.color ?? "#d2b48c",
    [cover, coverOptions],
  );
  // Derive shininess from cover color brightness: dark covers look glossy
  // (like leather), light covers look matte (like wood or linen).
  const shininess = useMemo(() => {
    const hex = coverColor.replace("#", "");
    if (hex.length < 6) return 20;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    // brightness 0-255: dark → high shininess (60), light → low shininess (10)
    return Math.round(10 + (1 - brightness / 255) * 50);
  }, [coverColor]);
  const aspect = useMemo(
    () => (sizeOptions || SIZE_OPTIONS).find((s) => s.value === size)?.aspect ?? 1,
    [size, sizeOptions],
  );

  const photoTex = usePhotoTexture(photoUrl);

  // Cover footprint: width follows the chosen aspect, depth stays constant.
  const w = 2 * aspect;
  const d = 2;

  // Inset frame dimensions on the front cover (leaves a wood/leather border).
  const frameW = w * 0.72;
  const frameD = d * 0.72;

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y += 0.005;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
  });

  return (
    <group ref={group}>
      {/* Top / front cover */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[w, 0.1, d]} />
        <meshPhongMaterial color={coverColor} shininess={shininess} />
      </mesh>

      {/* Recessed frame border (slightly proud of the cover) */}
      <mesh position={[0, 0.151, 0]}>
        <boxGeometry args={[frameW + 0.08, 0.02, frameD + 0.08]} />
        <meshPhongMaterial color={coverColor} shininess={20} />
      </mesh>

      {/* The photo (or placeholder) sitting inside the frame, facing up (+Y) */}
      <mesh position={[0, 0.162, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[frameW, frameD]} />
        {photoTex ? (
          <meshBasicMaterial map={photoTex} toneMapped={false} />
        ) : (
          <meshPhongMaterial color="#e9eef5" />
        )}
      </mesh>

      {/* Page block — white, slightly inset */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[w - 0.1, 0.15, d - 0.1]} />
        <meshPhongMaterial color={0xffffff} />
      </mesh>

      {/* Back cover */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[w, 0.1, d]} />
        <meshPhongMaterial color={coverColor} shininess={shininess} />
      </mesh>
    </group>
  );
}
