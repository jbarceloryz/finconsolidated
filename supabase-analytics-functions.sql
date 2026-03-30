-- ═══════════════════════════════════════════════════════════════════════════
-- Analytics RPC Functions — Run this entire file in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Client Revenue Breakdown (active clients only — billed in last 2 months)
CREATE OR REPLACE FUNCTION analytics_client_revenue_active()
RETURNS TABLE(
  client TEXT,
  invoice_count BIGINT,
  total_billed NUMERIC,
  avg_invoice_size NUMERIC,
  largest_invoice NUMERIC
) LANGUAGE sql STABLE AS $$
  WITH active_clients AS (
    SELECT DISTINCT client
    FROM cashflow_invoices
    WHERE due_date >= (CURRENT_DATE - INTERVAL '2 months')
  )
  SELECT
    ci.client,
    COUNT(*) AS invoice_count,
    SUM(ci.amount) AS total_billed,
    ROUND(AVG(ci.amount), 2) AS avg_invoice_size,
    MAX(ci.amount) AS largest_invoice
  FROM cashflow_invoices ci
  INNER JOIN active_clients ac ON ci.client = ac.client
  GROUP BY ci.client
  ORDER BY total_billed DESC;
$$;

-- 2. Payment Terms & Outstanding Balance
CREATE OR REPLACE FUNCTION analytics_payment_terms()
RETURNS TABLE(
  client TEXT,
  agreed_terms_days NUMERIC,
  actual_days_to_due NUMERIC,
  still_outstanding BIGINT,
  outstanding_balance NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    client,
    AVG(payment_terms) AS agreed_terms_days,
    ROUND(AVG(due_date - issue_date), 1) AS actual_days_to_due,
    COUNT(*) FILTER (WHERE status = 'SENT') AS still_outstanding,
    SUM(amount) FILTER (WHERE status = 'SENT') AS outstanding_balance
  FROM cashflow_invoices
  WHERE issue_date IS NOT NULL
  GROUP BY client
  ORDER BY outstanding_balance DESC NULLS LAST;
$$;

-- 3. Overdue Invoices Aging
CREATE OR REPLACE FUNCTION analytics_overdue_aging()
RETURNS TABLE(
  client TEXT,
  invoice_number TEXT,
  amount NUMERIC,
  due_date DATE,
  days_overdue INTEGER
) LANGUAGE sql STABLE AS $$
  SELECT
    client,
    invoice_number,
    amount,
    due_date,
    (CURRENT_DATE - due_date)::integer AS days_overdue
  FROM cashflow_invoices
  WHERE status = 'SENT'
    AND due_date < CURRENT_DATE
  ORDER BY days_overdue DESC;
$$;
