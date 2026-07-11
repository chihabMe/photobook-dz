import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Load env
const env = readFileSync('.env', 'utf-8');
const match = env.match(/DATABASE_URL="([^"]+)"/);
const url = match?.[1];

if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const sql = neon(url);

console.log('Fixing DB to match scraped Facebook data...\n');

// 1. Fix size price deltas (logical order: small=0, medium=+500, large=+1000)
await sql`UPDATE book_sizes SET price_delta = 500, dims = '30x20 cm' WHERE value = 'medium'`;
await sql`UPDATE book_sizes SET price_delta = 1000, dims = '40x30 cm' WHERE value = 'large'`;
await sql`UPDATE book_sizes SET dims = '20x20 cm' WHERE value = 'small'`;

// 2. Ensure base_price_da = 3500 (the bulk/promo price; single will be +400 in code)
await sql`INSERT INTO shop_config (key, value) VALUES ('base_price_da', '3500') ON CONFLICT (key) DO UPDATE SET value = '3500'`;

// 3. Ensure cover materials match what was advertised
await sql`INSERT INTO cover_materials (value, label, sub, color, is_active) VALUES
  ('wooden', 'Photobook en Bois', 'Couverture en bois gravé premium', '#d2b48c', true)
  ON CONFLICT (value) DO UPDATE SET label='Photobook en Bois', is_active=true`;

await sql`INSERT INTO cover_materials (value, label, sub, color, is_active) VALUES
  ('classic', 'Photobook Classique', 'Couverture simili-cuir élégante', '#3a2f2a', true)
  ON CONFLICT (value) DO UPDATE SET label='Photobook Classique', is_active=true`;

// Verify
const [sizes, covers, config] = await Promise.all([
  sql`SELECT value, label, dims, price_delta FROM book_sizes ORDER BY price_delta ASC`,
  sql`SELECT value, label, sub, is_active FROM cover_materials`,
  sql`SELECT key, value FROM shop_config`
]);

console.log('✅ Sizes:', JSON.stringify(sizes, null, 2));
console.log('✅ Covers:', JSON.stringify(covers, null, 2));
console.log('✅ Config:', JSON.stringify(config, null, 2));
