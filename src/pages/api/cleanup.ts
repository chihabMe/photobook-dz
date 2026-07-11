import type { APIRoute } from "astro";

export const prerender = false;

// Removes the junk 'liene' test cover from cover_materials table.
// DELETE THIS FILE after running once.
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== "photobook-migrate-2024") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  try {
    const { sql } = await import("../../db/client");
    await sql`DELETE FROM cover_materials WHERE value = 'liene'`;
    const covers = await sql`SELECT value, label, is_active FROM cover_materials`;
    return new Response(JSON.stringify({ ok: true, covers }, null, 2), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
};
