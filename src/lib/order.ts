// Shared order types + validation. Imported by both the client-side
// OrderForm island and the server endpoint (src/pages/api/order.ts), so
// the same rules run in the browser and are re-checked on the server.

export interface OrderInput {
  fullName: string;
  phone: string;
  wilaya: string;
  commune: string;
  // Honeypot: must stay empty. Bots tend to fill every field.
  company?: string;
  cover?: string;
  size?: string;
  engraving?: string;
}

export type FieldErrors = Partial<Record<keyof OrderInput, string>>;

// Algerian mobile numbers: 05, 06, or 07 followed by 8 digits.
export const DZ_PHONE_RE = /^0(5|6|7)[0-9]{8}$/;

const VALID_WILAYA_CODES = new Set(
  Array.from({ length: 58 }, (_, i) => String(i + 1)),
);

/** Strip spaces/dashes so "0555 12 34 56" validates as "0555123456". */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s.-]/g, "");
}

export function validateOrder(input: OrderInput): FieldErrors {
  const errors: FieldErrors = {};

  const name = input.fullName?.trim() ?? "";
  if (name.length < 3) {
    errors.fullName = "Nom trop court (min. 3 caractères).";
  } else if (name.length > 80) {
    errors.fullName = "Nom trop long.";
  }

  const phone = normalizePhone(input.phone ?? "");
  if (!DZ_PHONE_RE.test(phone)) {
    errors.phone = "Numéro invalide. Doit commencer par 05, 06 ou 07.";
  }

  if (!VALID_WILAYA_CODES.has(String(input.wilaya ?? ""))) {
    errors.wilaya = "Veuillez sélectionner une wilaya.";
  }

  const commune = input.commune?.trim() ?? "";
  if (commune.length < 2) {
    errors.commune = "Veuillez indiquer votre commune.";
  } else if (commune.length > 80) {
    errors.commune = "Nom de commune trop long.";
  }

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
