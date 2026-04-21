-- Persistent cache for generated lesson packs (24h TTL enforced in application)
CREATE TABLE IF NOT EXISTS engine_cache (
  cache_key  TEXT        PRIMARY KEY,
  pack       JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS engine_cache_created_at_idx ON engine_cache (created_at);
