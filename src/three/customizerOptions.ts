// Shared types + pricing for the Live 3D Customizer. Imported by the
// Customizer island, the 3D scene, and the price display so the same
// options and price rules live in one place.

export type CoverMaterial = string;
export type BookSize = string;

export interface CustomizerState {
  cover: string;
  size: string;
  engraving: string;
  photoUrl: string | null;
  quantity?: number;
  theme?: string;
}

export interface ThemeOption {
  value: string;
  label: { fr: string; ar: string; en: string };
  icon: string;
  symbol: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { value: "classic", label: { fr: "Souvenirs Classiques", ar: "ذكريات كلاسيكية", en: "Classic Memories" }, icon: "auto_stories", symbol: "✨" },
  { value: "wedding", label: { fr: "Mariage & Fiancailles", ar: "زواج وخطوبة", en: "Wedding & Engagement" }, icon: "favorite", symbol: "💍" },
  { value: "omra", label: { fr: "Omra & Hajj", ar: "عمرة وحج", en: "Omra & Hajj" }, icon: "dark_mode", symbol: "🌙" },
  { value: "baby", label: { fr: "Bébé & Naissance", ar: "طفل ومولود جديد", en: "Baby & Birth" }, icon: "child_care", symbol: "👶" },
  { value: "travel", label: { fr: "Voyages & Aventures", ar: "سفر ومغامرات", en: "Travel & Vacations" }, icon: "flight", symbol: "✈️" }
];

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
  { value: "small",  label: "Small",  dims: "20x20 cm", priceDelta: 0,    aspect: 1 },
  { value: "medium", label: "Medium", dims: "30x20 cm", priceDelta: 500,  aspect: 1 },
  { value: "large",  label: "Large",  dims: "40x30 cm", priceDelta: 1000, aspect: 4 / 3 },
];

// Scraped from Facebook ads:
// - 1 album  → 3,900 DA (base)
// - 2+ albums → 3,500 DA / unit (bulk promo)
export const BASE_PRICE_SINGLE_DA = 3900;
export const BASE_PRICE_BULK_DA   = 3500; // 2+ units
export const ENGRAVING_MAX = 30;

export function priceFor(
  state: Pick<CustomizerState, "size">,
  quantity: number = 1
): number {
  const unitBase = quantity >= 2 ? BASE_PRICE_BULK_DA : BASE_PRICE_SINGLE_DA;
  const size = SIZE_OPTIONS.find((s) => s.value === state.size);
  return (unitBase + (size?.priceDelta ?? 0)) * quantity;
}

export function formatDA(amount: number): string {
  return `${amount.toLocaleString("en-US")} DA`;
}
