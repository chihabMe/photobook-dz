import type { APIRoute } from "astro";
import { sql } from "../../db/client";

export const prerender = false;

async function queryWithRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      return queryWithRetry(fn, retries - 1);
    }
    throw err;
  }
}

export const GET: APIRoute = async () => {
  try {
    const [covers, sizes, config] = await queryWithRetry(() =>
      Promise.all([
        sql`
          SELECT value, label, sub, color 
          FROM cover_materials 
          WHERE is_active = true 
          ORDER BY id ASC
        `,
        sql`
          SELECT value, label, dims, price_delta as "priceDelta", aspect 
          FROM book_sizes 
          WHERE is_active = true 
          ORDER BY id ASC
        `,
        sql`
          SELECT key, value 
          FROM shop_config
        `,
      ])
    );

    const basePriceRow = config.find((row) => row.key === "base_price_da");
    const basePrice = basePriceRow ? Number(basePriceRow.value) : 3500;

    return new Response(
      JSON.stringify({
        coverOptions: covers,
        sizeOptions: sizes,
        basePrice,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
        },
      }
    );
  } catch (err) {
    console.error("[config API] failed:", err);
    return new Response(
      JSON.stringify({ message: "Internal server error." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
