-- Day 1 schema. Deliberately NO index on tickets yet:
-- on Day 12 you add one and measure the before/after with EXPLAIN ANALYZE.

CREATE TABLE IF NOT EXISTS tickets (
  id             SERIAL PRIMARY KEY,
  subject        TEXT        NOT NULL,
  body           TEXT        NOT NULL,
  customer_email TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'closed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS replies (
  id         SERIAL PRIMARY KEY,
  ticket_id  INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author     TEXT        NOT NULL CHECK (author IN ('customer', 'agent')),
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
