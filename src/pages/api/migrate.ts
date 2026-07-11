import type { APIRoute } from "astro";

export const prerender = false;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// One-time migration endpoint — fixes book_sizes price_delta values to match
// scraped Facebook ad data. Delete this file after running once.
// Protected by a secret key to prevent unauthorized access.
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (secret !== "photobook-migrate-2024") {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    // Lazy import to avoid module-level crash if DATABASE_URL is missing
    const { sql } = await import("../../db/client");

    // Fix size price deltas: small=0, medium=+500, large=+1000
    await sql`UPDATE book_sizes SET price_delta = 0,    dims = '20x20 cm' WHERE value = 'small'`;
    await sql`UPDATE book_sizes SET price_delta = 500,  dims = '30x20 cm' WHERE value = 'medium'`;
    await sql`UPDATE book_sizes SET price_delta = 1000, dims = '40x30 cm' WHERE value = 'large'`;

    // Ensure base_price_da = 3500 (bulk; single = 3900 in code)
    await sql`INSERT INTO shop_config (key, value) VALUES ('base_price_da', '3500')
              ON CONFLICT (key) DO UPDATE SET value = '3500'`;

    // Ensure cover materials exist
    await sql`INSERT INTO cover_materials (value, label, sub, color, is_active)
              VALUES ('wooden', 'Photobook en Bois', 'Couverture en bois gravé premium', '#d2b48c', true)
              ON CONFLICT (value) DO UPDATE SET label='Photobook en Bois', is_active=true`;

    await sql`INSERT INTO cover_materials (value, label, sub, color, is_active)
              VALUES ('classic', 'Photobook Classique', 'Couverture simili-cuir élégante', '#3a2f2a', true)
              ON CONFLICT (value) DO UPDATE SET label='Photobook Classique', is_active=true`;

    const [sizes, covers, config] = await Promise.all([
      sql`SELECT value, label, dims, price_delta FROM book_sizes ORDER BY price_delta ASC`,
      sql`SELECT value, label, is_active FROM cover_materials`,
      sql`SELECT key, value FROM shop_config`,
    ]);

    return json({ ok: true, sizes, covers, config }, 200);
  } catch (err: any) {
    return json({ error: String(err?.message ?? err) }, 500);
  }
};
