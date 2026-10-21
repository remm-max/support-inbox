   CREATE INDEX IF NOT EXISTS tickets_created_idx
     ON tickets (created_at DESC);

   CREATE INDEX IF NOT EXISTS tickets_status_created_idx
     ON tickets (status, created_at DESC);
