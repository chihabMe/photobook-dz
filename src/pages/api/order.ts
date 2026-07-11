import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { sql } from "../../db/client";
import { validateOrder, hasErrors, normalizePhone } from "../../lib/order";

export const prerender = false;

// Very small in-memory rate limiter. Good enough for a single-instance
// deploy; swap for a durable store (KV/Redis) if scaled horizontally.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request }) => {
  // Reject non-JSON payloads early.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ message: "Requête invalide." }, 415);
  }

  const ip = clientIp(request);
  if (rateLimited(ip)) {
    return json(
      { message: "Trop de tentatives. Réessayez dans une minute." },
      429,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ message: "JSON invalide." }, 400);
  }

  // Honeypot: real users never fill this. Pretend success to waste bot time.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return json({ ok: true }, 200);
  }

  const input = {
    fullName: String(body.fullName ?? ""),
    phone: normalizePhone(String(body.phone ?? "")),
    wilaya: String(body.wilaya ?? ""),
    commune: String(body.commune ?? ""),
  };

  // Server-side re-validation — never trust the client.
  const errors = validateOrder(input);
  if (hasErrors(errors)) {
    return json({ message: "Champs invalides.", errors }, 422);
  }

  const cover = typeof body.cover === "string" ? body.cover : null;
  const size = typeof body.size === "string" ? body.size : null;
  const engraving = typeof body.engraving === "string" ? body.engraving : null;
  const quantity = typeof body.quantity === "number" ? body.quantity : 1;
  const theme = typeof body.theme === "string" ? body.theme : "classic";

  let price = 3900; // Default: single unit base price from ads
  try {
    const configRows = await sql`SELECT value FROM shop_config WHERE key = 'base_price_da'`;
    const dbBulkPrice = configRows[0] ? Number(configRows[0].value) : 3500;
    const dbSinglePrice = dbBulkPrice + 400; // Single always costs 400 DA more than bulk

    // Apply pricing: 1 photobook = single price, 2+ = bulk price per unit
    const unitBasePrice = quantity >= 2 ? dbBulkPrice : dbSinglePrice;
    price = unitBasePrice;

    if (size) {
      const sizeRows = await sql`SELECT price_delta FROM book_sizes WHERE value = ${size} AND is_active = true`;
      if (sizeRows[0]) {
        price += Number(sizeRows[0].price_delta);
      }
    }
    price = price * quantity;
  } catch (err) {
    console.error("[order API] Failed to query dynamic pricing, using fallback:", err);
    // Fallback mirrors the same logic without DB
    const fallbackBase = quantity >= 2 ? 3500 : 3900;
    const sizeDelta = size === "large" ? 1000 : size === "medium" ? 500 : 0;
    price = (fallbackBase + sizeDelta) * quantity;
  }

  const productBase = cover ? `photobook-${cover}-${size}-${theme}` : `photobook-bois-classique-${theme}`;
  const product = quantity >= 2 ? `${productBase} (x${quantity})` : productBase;

  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 255);

  try {
    const rows = await sql`
      INSERT INTO orders (
        full_name, phone, wilaya_code, commune,
        product, cover, size, engraving, price_da,
        ip_hash, user_agent
      )
      VALUES (
        ${input.fullName.trim()},
        ${input.phone},
        ${Number(input.wilaya)},
        ${input.commune.trim()},
        ${product},
        ${cover},
        ${size},
        ${engraving},
        ${price},
        ${ipHash},
        ${userAgent}
      )
      RETURNING id
    `;
    return json({ ok: true, id: rows[0]?.id }, 201);
  } catch (err) {
    console.error("[order] insert failed:", err);
    return json(
      { message: "Erreur serveur. Veuillez réessayer dans un instant." },
      500,
    );
  }
};

// Anything other than POST is not allowed.
export const ALL: APIRoute = () =>
  json({ message: "Méthode non autorisée." }, 405);
