import { supabase, isSupabaseConfigured } from './supabase'

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

// ── Demo mock data generators ────────────────────────────────────────────────

function demoClientRevenue() {
  // Only "active" clients (billed recently) — already filtered in demo
  const clients = ['Alpha Solutions', 'Beta Digital', 'Gamma Partners', 'Delta Services', 'Epsilon Group']
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

export const fetchClientRevenue = () => callRPC('analytics_client_revenue_active', demoClientRevenue)
export const fetchPaymentTerms = () => callRPC('analytics_payment_terms', demoPaymentTerms)
export const fetchOverdueAging = () => callRPC('analytics_overdue_aging', demoOverdueAging)

/** Fetch all analytics in parallel */
export async function fetchAllAnalytics() {
  const [clientRevenue, paymentTerms, overdueAging] = await Promise.all([
    fetchClientRevenue(),
    fetchPaymentTerms(),
    fetchOverdueAging(),
  ])
  return { clientRevenue, paymentTerms, overdueAging }
}
