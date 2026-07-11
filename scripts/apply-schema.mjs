import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("no DATABASE_URL");
  process.exit(1);
}
const sql = neon(url);
const ddl = readFileSync(new URL("../src/db/schema.sql", import.meta.url), "utf8");
// Strip full-line SQL comments, then split into individual statements.
const cleaned = ddl
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");
const stmts = cleaned
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);
for (const s of stmts) {
  await sql.query(s);
  console.log("OK:", s.split("\n")[0].slice(0, 60));
}
const rows = await sql.query("SELECT count(*)::int AS n FROM orders");
console.log("orders row count:", rows[0].n);
