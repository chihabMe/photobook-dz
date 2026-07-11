// Neon Postgres client. Uses the serverless driver's tagged-template `sql`
// helper, which is safe against injection (values are parameterized, never
// interpolated into the query string).
import { neon } from "@neondatabase/serverless";

const rawUrl = import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL ?? "";

// Strip any accidental prefix before the protocol (e.g. "Y\n" from a
// misconfigured env var set during a CLI confirmation prompt).
const url = rawUrl.includes("postgresql://")
  ? rawUrl.substring(rawUrl.indexOf("postgresql://")).trim()
  : rawUrl.trim();

if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill in the Neon connection string.",
  );
}

export const sql = neon(url);
