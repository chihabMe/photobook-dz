// Shared types + pricing for the Live 3D Customizer. Imported by the
// Customizer island, the 3D scene, and the price display so the same
// options and price rules live in one place.

export type CoverMaterial = string;
export type BookSize = string;

export interface CustomizerState {
  cover: string;
  size: string;
  engraving: string;
  // Object URL for the user-uploaded cover photo. Frontend-only: never
  // sent to the server or persisted — it lives only in the browser tab.
  photoUrl: string | null;
}

export interface CoverOption {
  value: CoverMaterial;
  label: string;
  sub: string;
  // Base tint used for the 3D cover material when no photo is applied.
  color: string;
}

export interface SizeOption {
  value: BookSize;
  label: string;
  dims: string;
  // Extra charge over the base price, in DA.
  priceDelta: number;
  // Cover aspect ratio (width / height) driving the 3D geometry.
  aspect: number;
}

export const COVER_OPTIONS: CoverOption[] = [
  {
    value: "wooden",
    label: "Wooden Heritage",
    sub: "Premium carved wood",
    color: "#d2b48c",
  },
  {
    value: "classic",
    label: "Classic Leatherette",
    sub: "Durable & sleek",
    color: "#3a2f2a",
  },
];

export const SIZE_OPTIONS: SizeOption[] = [
  { value: "small", label: "Small", dims: "20x20 cm", priceDelta: 0, aspect: 1 },
  {
    value: "medium",
    label: "Medium",
    dims: "30x30 cm",
    priceDelta: 1000,
    aspect: 1,
  },
  {
    value: "large",
    label: "Large",
    dims: "40x30 cm",
    priceDelta: 2000,
    aspect: 4 / 3,
  },
];

export const BASE_PRICE_DA = 3500;
export const ENGRAVING_MAX = 30;

export function priceFor(state: Pick<CustomizerState, "size">): number {
  const size = SIZE_OPTIONS.find((s) => s.value === state.size);
  return BASE_PRICE_DA + (size?.priceDelta ?? 0);
}

export function formatDA(amount: number): string {
  return `${amount.toLocaleString("en-US")} DA`;
}
