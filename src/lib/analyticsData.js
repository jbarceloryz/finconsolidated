import { supabase, isSupabaseConfigured } from './supabase'

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// ── Demo mock data generators ────────────────────────────────────────────────

function demoClientRevenue() {
  const clients = ['Alpha Solutions', 'Beta Digital', 'Gamma Partners', 'Delta Services', 'Epsilon Group', 'Zeta Consulting']
  return clients.map((client, i) => ({
    client,
    invoice_count: 12 - i * 2,
    total_billed: Math.round((85000 - i * 12000) * 100) / 100,
    avg_invoice_size: Math.round((7000 - i * 600) * 100) / 100,
    largest_invoice: Math.round((15000 - i * 1500) * 100) / 100,
  }))
}

function demoPaymentTerms() {
  const clients = ['Alpha Solutions', 'Beta Digital', 'Gamma Partners', 'Delta Services', 'Epsilon Group']
  return clients.map((client, i) => ({
    client,
    agreed_terms_days: 30 + i * 5,
    actual_days_to_due: 28 + i * 4,
    still_outstanding: Math.max(0, 4 - i),
    outstanding_balance: Math.max(0, Math.round((22000 - i * 6000) * 100) / 100),
  }))
}

function demoContractorMargin() {
  const names = ['Alex Rivera', 'Sam Chen', 'Jordan Blake', 'Morgan Lee', 'Casey Patel', 'Taylor Quinn', 'Avery Simmons', 'Riley Torres']
  const roles = ['Senior Engineer', 'Product Manager', 'Data Analyst', 'UX Designer', 'DevOps Engineer', 'QA Lead', 'Full-Stack Dev', 'ML Engineer']
  const cos = ['Acme Corp', 'TechFlow Inc', 'NovaStar LLC', 'BrightPath Co', 'Zenith Labs']
  return names.map((name, i) => {
    const rate = 120 - i * 8
    const cost = Math.round(rate * (0.5 + i * 0.03) * 100) / 100
    const margin = Math.round((rate - cost) * 100) / 100
    return {
      candidate_name: name,
      role: roles[i],
      company: cos[i % cos.length],
      rate,
      actual_cost: cost,
      net_margin: margin,
      margin_pct: Math.round((margin / rate) * 1000) / 10,
    }
  })
}

function demoHCVariance() {
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const Y = new Date().getFullYear()
  const M = new Date().getMonth()
  const yr = String(Y).slice(-2)
  const results = []
  for (let i = -5; i <= 0; i++) {
    const dt = new Date(Y, M + i, 1)
    const name = MONTHS[dt.getMonth()]
    const suffix = String(dt.getFullYear()).slice(-2)
    const label = `${name}-${suffix}`
    const projected = 45000 + (i + 5) * 3000
    const actual = projected + Math.round(Math.sin(i * 1.5) * 5000)
    const variance = actual - projected
    results.push({
      period_label: label,
      actual,
      projected,
      recorded_variance: variance,
      computed_variance: variance,
      pct_off: Math.round((variance / projected) * 1000) / 10,
    })
  }
  return results
}

function demoContractorChurn() {
  const Y = new Date().getFullYear()
  const M = new Date().getMonth()
  const results = []
  for (let i = 0; i < 4; i++) {
    const dt = new Date(Y, M - i, 1)
    results.push({
      churn_month: dt.toISOString(),
      contractors_churned: Math.max(1, 3 - i),
      monthly_rate_lost: Math.round((8000 - i * 1500) * 100) / 100,
      avg_tenure_days: 90 + i * 30,
    })
  }
  return results
}

function demoRevisionRates() {
  const clients = ['Alpha Solutions', 'Beta Digital', 'Gamma Partners', 'Delta Services']
  return clients.map((client, i) => ({
    client,
    total_invoices: 10 - i,
    revised_count: Math.max(0, 3 - i),
    revision_rate_pct: Math.round(Math.max(0, (3 - i) / (10 - i)) * 1000) / 10,
  }))
}

function demoOverdueAging() {
  const clients = ['Gamma Partners', 'Epsilon Group', 'Beta Digital']
  const now = new Date()
  return clients.map((client, i) => {
    const daysOverdue = 45 - i * 12
    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() - daysOverdue)
    return {
      client,
      invoice_number: `INV-${3100 + i}`,
      amount: Math.round((8500 - i * 2000) * 100) / 100,
      due_date: dueDate.toISOString().split('T')[0],
      days_overdue: daysOverdue,
    }
  })
}

// ── Supabase RPC callers ─────────────────────────────────────────────────────

async function callRPC(fnName, demoFn) {
  if (IS_DEMO) return demoFn()
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase.rpc(fnName)
  if (error) {
    console.error(`Supabase RPC ${fnName} error:`, error)
    return []
  }
  return data || []
}

export const fetchClientRevenue = () => callRPC('analytics_client_revenue', demoClientRevenue)
export const fetchPaymentTerms = () => callRPC('analytics_payment_terms', demoPaymentTerms)
export const fetchContractorMargin = () => callRPC('analytics_contractor_margin', demoContractorMargin)
export const fetchHCVariance = () => callRPC('analytics_hc_variance', demoHCVariance)
export const fetchContractorChurn = () => callRPC('analytics_contractor_churn', demoContractorChurn)
export const fetchRevisionRates = () => callRPC('analytics_revision_rates', demoRevisionRates)
export const fetchOverdueAging = () => callRPC('analytics_overdue_aging', demoOverdueAging)

/** Fetch all 7 analytics in parallel */
export async function fetchAllAnalytics() {
  const [clientRevenue, paymentTerms, contractorMargin, hcVariance, contractorChurn, revisionRates, overdueAging] = await Promise.all([
    fetchClientRevenue(),
    fetchPaymentTerms(),
    fetchContractorMargin(),
    fetchHCVariance(),
    fetchContractorChurn(),
    fetchRevisionRates(),
    fetchOverdueAging(),
  ])
  return { clientRevenue, paymentTerms, contractorMargin, hcVariance, contractorChurn, revisionRates, overdueAging }
}
