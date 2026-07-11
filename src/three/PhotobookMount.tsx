import { lazy, Suspense, useEffect, useState } from "react";

const PhotobookCanvas = lazy(() => import("./PhotobookCanvas"));

// Decides whether the WebGL photobook should mount at all. Gates on:
//  - a real WebGL context being available
//  - not being a low-capability / small device
//  - the user not requesting reduced motion
// When gated off, nothing renders and the server-rendered poster <img>
// underneath remains the sole visual (fast, safe fallback).
function canRender3D(): boolean {
  if (typeof window === "undefined") return false;

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  // Skip on narrow viewports (mid-range Android is common in the DZ market).
  if (window.matchMedia?.("(max-width: 767px)").matches) return false;

  // Respect Data Saver / very limited memory when exposed.
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return false;

  // Confirm a WebGL context can actually be created.
  try {
    const c = document.createElement("canvas");
    const gl =
      c.getContext("webgl2") ??
      c.getContext("webgl") ??
      c.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

export default function PhotobookMount() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setEnabled(canRender3D());
  }, []);

  // Fade the canvas in once mounted, so the poster -> 3D swap isn't jarring.
  useEffect(() => {
    if (enabled) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 z-10 transition-opacity duration-700"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <Suspense fallback={null}>
        <PhotobookCanvas />
      </Suspense>
    </div>
  );
}
