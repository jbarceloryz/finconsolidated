-- ═══════════════════════════════════════════════════════════════════════════
-- Analytics RPC Functions — Run this entire file in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Client Revenue Breakdown
CREATE OR REPLACE FUNCTION analytics_client_revenue()
RETURNS TABLE(
  client TEXT,
  invoice_count BIGINT,
  total_billed NUMERIC,
  avg_invoice_size NUMERIC,
  largest_invoice NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    client,
    COUNT(*) AS invoice_count,
    SUM(amount) AS total_billed,
    ROUND(AVG(amount), 2) AS avg_invoice_size,
    MAX(amount) AS largest_invoice
  FROM cashflow_invoices
  GROUP BY client
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

-- 3. Contractor Margin Analysis
CREATE OR REPLACE FUNCTION analytics_contractor_margin()
RETURNS TABLE(
  candidate_name TEXT,
  role TEXT,
  company TEXT,
  rate NUMERIC,
  actual_cost NUMERIC,
  net_margin NUMERIC,
  margin_pct NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    candidate_name,
    role,
    company,
    rate,
    actual_cost,
    net_margin,
    ROUND((net_margin / NULLIF(rate, 0)) * 100, 1) AS margin_pct
  FROM talent_pool
  WHERE status = 'active'
    AND rate IS NOT NULL
    AND net_margin IS NOT NULL
  ORDER BY margin_pct DESC;
$$;

-- 4. HC Actual vs Projected Variance
CREATE OR REPLACE FUNCTION analytics_hc_variance()
RETURNS TABLE(
  period_label TEXT,
  actual NUMERIC,
  projected NUMERIC,
  recorded_variance NUMERIC,
  computed_variance NUMERIC,
  pct_off NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    m.period_label,
    m.value AS actual,
    p.value AS projected,
    v.value AS recorded_variance,
    ROUND(m.value - p.value, 2) AS computed_variance,
    ROUND(((m.value - p.value) / NULLIF(p.value, 0)) * 100, 1) AS pct_off
  FROM net_income_metrics m
  JOIN net_income_hc_projected p ON m.period_label = p.period_label
  LEFT JOIN net_income_variance v ON m.period_label = v.period_label
  WHERE m.company = 'HC'
    AND m.metric_key = 'net_income'
  ORDER BY m.period_label;
$$;

-- 5. Contractor Churn Analysis
CREATE OR REPLACE FUNCTION analytics_contractor_churn()
RETURNS TABLE(
  churn_month TIMESTAMPTZ,
  contractors_churned BIGINT,
  monthly_rate_lost NUMERIC,
  avg_tenure_days NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    DATE_TRUNC('month', end_date) AS churn_month,
    COUNT(*) AS contractors_churned,
    SUM(rate) AS monthly_rate_lost,
    ROUND(AVG(end_date - start_date), 0) AS avg_tenure_days
  FROM talent_pool
  WHERE end_date IS NOT NULL
    AND status != 'active'
  GROUP BY churn_month
  ORDER BY churn_month DESC;
$$;

-- 6. Invoice Revision Rates
CREATE OR REPLACE FUNCTION analytics_revision_rates()
RETURNS TABLE(
  client TEXT,
  total_invoices BIGINT,
  revised_count BIGINT,
  revision_rate_pct NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    client,
    COUNT(*) AS total_invoices,
    SUM(CASE WHEN revised THEN 1 ELSE 0 END) AS revised_count,
    ROUND(
      SUM(CASE WHEN revised THEN 1 ELSE 0 END)::numeric
      / COUNT(*) * 100, 1
    ) AS revision_rate_pct
  FROM cashflow_invoices
  GROUP BY client
  HAVING COUNT(*) > 1
  ORDER BY revision_rate_pct DESC;
$$;

-- 7. Overdue Invoices Aging
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
