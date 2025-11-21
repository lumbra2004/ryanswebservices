-- Run this on your Neon database (psql or Neon Data Editor)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example: insert an admin with username 'admin' and password 'bob3'
-- INSERT INTO admins (username, password_hash) VALUES ('admin', crypt('bob3', gen_salt('bf')));
