import { useRef, useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";
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
  engraving?: string;
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

// Generates a dynamic procedural wood grain pattern in a canvas and loads it
// as a THREE.CanvasTexture, matching the cover color.
function useWoodTexture(colorHex: string, isWooden: boolean): THREE.Texture | null {
  return useMemo(() => {
    if (!isWooden || typeof document === "undefined") return null;

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Fill background with the user-selected cover color
    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 512, 512);

    // Draw fine natural wood grain curves
    ctx.strokeStyle = "rgba(60, 40, 20, 0.12)";
    ctx.lineWidth = 1.8;
    for (let i = -150; i < 662; i += 7) {
      ctx.beginPath();
      for (let y = 0; y <= 512; y += 8) {
        // Natural waving grain formulas
        const wave = Math.sin(y * 0.015) * 12 + Math.sin(y * 0.004) * 22;
        const x = i + wave;
        if (y === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Draw occasional grain wood knots
    ctx.fillStyle = "rgba(60, 40, 20, 0.06)";
    ctx.beginPath();
    ctx.ellipse(340, 220, 42, 22, Math.PI / 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(60, 40, 20, 0.1)";
    ctx.lineWidth = 1.2;
    for (let r = 6; r < 42; r += 7) {
      ctx.beginPath();
      ctx.ellipse(340, 220, r, r * 0.52, Math.PI / 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, [colorHex, isWooden]);
}

export function FramedPhotobook({
  cover,
  size,
  photoUrl,
  engraving = "",
  coverOptions,
  sizeOptions,
}: FramedPhotobookProps) {
  const group = useRef<THREE.Group>(null);

  const coverColor = useMemo(
    () => (coverOptions || COVER_OPTIONS).find((c) => c.value === cover)?.color ?? "#d2b48c",
    [cover, coverOptions],
  );

  const isWooden = cover === "wooden";

  // Procedural wood texture
  const woodTex = useWoodTexture(coverColor, isWooden);

  // Derive shininess (light covers look matte, leather/dark covers look glossy)
  const shininess = useMemo(() => {
    const hex = coverColor.replace("#", "");
    if (hex.length < 6) return 20;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    // Dark cover → leather sheen (55), light cover → matte wood (12)
    return Math.round(12 + (1 - brightness / 255) * 43);
  }, [coverColor]);

  const aspect = useMemo(
    () => (sizeOptions || SIZE_OPTIONS).find((s) => s.value === size)?.aspect ?? 1,
    [size, sizeOptions],
  );

  const photoTex = usePhotoTexture(photoUrl);

  // Geometry dimensions
  const w = 2 * aspect;
  const d = 2;

  // Offset layout: shift photo frame slightly upwards (-Z) to make space for the engraving text at the bottom (+Z)
  const frameZOffset = -0.15;
  const engravingZOffset = 0.65;

  const frameW = w * 0.7;
  const frameD = d * 0.65;

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
        <meshPhongMaterial
          color={coverColor}
          shininess={shininess}
          map={woodTex}
        />
      </mesh>

      {/* Recessed frame border (slightly proud of the cover) */}
      <mesh position={[0, 0.151, frameZOffset]}>
        <boxGeometry args={[frameW + 0.08, 0.02, frameD + 0.08]} />
        <meshPhongMaterial
          color={coverColor}
          shininess={isWooden ? 15 : 25}
          map={woodTex}
        />
      </mesh>

      {/* The photo inside the frame, facing up (+Y) */}
      <mesh position={[0, 0.162, frameZOffset]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[frameW, frameD]} />
        {photoTex ? (
          <meshBasicMaterial map={photoTex} toneMapped={false} />
        ) : (
          <meshPhongMaterial color="#eaeef4" />
        )}
      </mesh>

      {/* Leather Spine Binding on the left edge (-X) */}
      <mesh position={[-w / 2 - 0.02, 0, 0]}>
        <boxGeometry args={[0.1, 0.32, d + 0.01]} />
        <meshPhongMaterial color="#2d221c" shininess={35} />
      </mesh>

      {/* Engraved Cover Text */}
      {engraving && (
        <group>
          {/* Laser-engraved depth shadow offset */}
          <Text
            position={[0, 0.15, engravingZOffset + 0.005]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.11}
            color={isWooden ? "#22130c" : "#1a1310"}
            anchorX="center"
            anchorY="middle"
            maxWidth={w * 0.85}
          >
            {engraving}
          </Text>
          {/* Main text: charcoal for wood engraving, gold foil print for leather */}
          <Text
            position={[0, 0.152, engravingZOffset]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.11}
            color={isWooden ? "#3d2314" : "#d4af37"}
            anchorX="center"
            anchorY="middle"
            maxWidth={w * 0.85}
          >
            {engraving}
          </Text>
        </group>
      )}

      {/* Page block — white, slightly inset */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[w - 0.08, 0.15, d - 0.08]} />
        <meshPhongMaterial color={0xffffff} />
      </mesh>

      {/* Back cover */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[w, 0.1, d]} />
        <meshPhongMaterial
          color={coverColor}
          shininess={shininess}
          map={woodTex}
        />
      </mesh>
    </group>
  );
}
