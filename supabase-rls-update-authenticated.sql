-- ============================================================================
-- Update RLS policies to allow BOTH anon AND authenticated roles.
-- Run this in Supabase SQL Editor after enabling Magic Link auth.
--
-- After switching to Supabase Magic Link, logged-in users operate under
-- the "authenticated" role. Existing policies that only granted "anon"
-- access will block data from loading.
-- ============================================================================

-- ── cashflow_invoices ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cashflow_invoices' AND policyname = 'Allow authenticated read cashflow'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated read cashflow" ON cashflow_invoices FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cashflow_invoices' AND policyname = 'Allow authenticated write cashflow'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated write cashflow" ON cashflow_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ── accounts_payable ─────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'accounts_payable' AND policyname = 'Allow authenticated read ap'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated read ap" ON accounts_payable FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'accounts_payable' AND policyname = 'Allow authenticated write ap'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated write ap" ON accounts_payable FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ── net_income_metrics ───────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'net_income_metrics' AND policyname = 'Allow authenticated read net_income_metrics'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated read net_income_metrics" ON net_income_metrics FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- ── net_income_hc_projected ──────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'net_income_hc_projected' AND policyname = 'Allow authenticated read hc_projected'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated read hc_projected" ON net_income_hc_projected FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- ── net_income_variance ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'net_income_variance' AND policyname = 'Allow authenticated read variance'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated read variance" ON net_income_variance FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- ── talent_pool (GP Analysis) ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'talent_pool' AND policyname = 'Allow authenticated read talent_pool'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated read talent_pool" ON talent_pool FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- ── cashflow_settings ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cashflow_settings' AND policyname = 'Allow authenticated read cashflow_settings'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated read cashflow_settings" ON cashflow_settings FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cashflow_settings' AND policyname = 'Allow authenticated write cashflow_settings'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated write cashflow_settings" ON cashflow_settings FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ── Analytics RPC functions ──────────────────────────────────────────────────
-- RPC functions (analytics_client_revenue_active, analytics_payment_terms,
-- analytics_overdue_aging) execute as the caller's role. Grant execute to
-- authenticated if not already granted:
GRANT EXECUTE ON FUNCTION analytics_client_revenue_active() TO authenticated;
GRANT EXECUTE ON FUNCTION analytics_payment_terms() TO authenticated;
GRANT EXECUTE ON FUNCTION analytics_overdue_aging() TO authenticated;
