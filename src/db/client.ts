// Neon Postgres client. Uses the serverless driver's tagged-template `sql`
// helper, which is safe against injection (values are parameterized, never
// interpolated into the query string).
import { neon } from "@neondatabase/serverless";

const url = import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill in the Neon connection string.",
  );
}

export const sql = neon(url);
