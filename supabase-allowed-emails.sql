-- ============================================================================
-- Allowed Emails table for Magic Link authentication
-- Run this in Supabase SQL Editor to create the email allowlist.
-- ============================================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS allowed_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS (only authenticated users can query — prevents enumeration)
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can check allowlist"
  ON allowed_emails FOR SELECT
  TO authenticated
  USING (true);

-- 3. Seed with your email(s)
--    Replace with your actual email addresses.
-- INSERT INTO allowed_emails (email, name) VALUES
--   ('you@example.com', 'Your Name'),
--   ('colleague@example.com', 'Colleague Name');
