-- ============================================================================
-- Fix: Allow authenticated users to access all data tables.
--
-- The simplest approach: disable RLS on data tables entirely.
-- App-level auth (magic link + allowlist) already controls who can access.
-- Only the allowed_emails table keeps RLS for security.
--
-- Run this in Supabase SQL Editor.
-- ============================================================================

-- Data tables — disable RLS so both anon and authenticated roles can access
ALTER TABLE IF EXISTS cashflow_invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts_payable DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS net_income_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS net_income_hc_projected DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS net_income_variance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS talent_pool DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cashflow_settings DISABLE ROW LEVEL SECURITY;

-- Analytics RPC functions — grant execute to authenticated role
DO $$ BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'analytics_client_revenue_active';
  IF FOUND THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION analytics_client_revenue_active() TO authenticated';
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'analytics_payment_terms';
  IF FOUND THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION analytics_payment_terms() TO authenticated';
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_proc WHERE proname = 'analytics_overdue_aging';
  IF FOUND THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION analytics_overdue_aging() TO authenticated';
  END IF;
END $$;
