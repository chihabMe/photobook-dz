-- Photobook DZ — orders schema.
-- Apply with: psql "$DATABASE_URL" -f src/db/schema.sql
--   (or via `neonctl` connection-string).

CREATE TABLE IF NOT EXISTS orders (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name    TEXT        NOT NULL,
  phone        TEXT        NOT NULL,
  wilaya_code  SMALLINT    NOT NULL CHECK (wilaya_code BETWEEN 1 AND 58),
  commune      TEXT        NOT NULL,
  product      TEXT        NOT NULL DEFAULT 'photobook-bois-classique',
  cover        TEXT,
  size         TEXT,
  engraving    TEXT,
  price_da     INTEGER     NOT NULL DEFAULT 3500,
  status       TEXT        NOT NULL DEFAULT 'pending',
  ip_hash      TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup of recent orders for the confirmation-call workflow.
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);

-- Simple per-IP rate limiting window support.
CREATE INDEX IF NOT EXISTS orders_ip_created_idx ON orders (ip_hash, created_at DESC);

-- Cover materials configuration
CREATE TABLE IF NOT EXISTS cover_materials (
  id          SERIAL PRIMARY KEY,
  value       TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  sub         TEXT NOT NULL,
  color       TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

-- Book sizes configuration
CREATE TABLE IF NOT EXISTS book_sizes (
  id          SERIAL PRIMARY KEY,
  value       TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  dims        TEXT NOT NULL,
  price_delta INTEGER NOT NULL DEFAULT 0,
  aspect      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  is_active   BOOLEAN NOT NULL DEFAULT true
);

-- General shop config settings
CREATE TABLE IF NOT EXISTS shop_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL
);
