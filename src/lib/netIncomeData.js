import { supabase, isSupabaseConfigured } from './supabase'

const METRIC_KEYS = ['totalIncome', 'cogs', 'grossProfit', 'totalExpenses', 'operatingIncome']

/**
 * Fetches Net Income data from Supabase and returns the same shape as parseFinancialCsv.
 * @returns {Promise<{ months: string[], byCompany: {}, metricsByCompany: {}, hcProjectedSales: number[], varianceVsProjected: number[] } | null>}
 */
export async function fetchNetIncomeFromSupabase() {
  if (!isSupabaseConfigured()) return null

  const [metricsRes, hcRes, varRes] = await Promise.all([
    supabase.from('net_income_metrics').select('company, metric_key, period_label, value').order('period_label'),
    supabase.from('net_income_hc_projected').select('period_label, value').order('period_label'),
    supabase.from('net_income_variance').select('period_label, value').order('period_label'),
  ])

  if (metricsRes.error) {
    console.error('Supabase net_income_metrics error:', metricsRes.error)
    return null
  }

  const metrics = metricsRes.data || []
  const hcRows = hcRes.data || []
  const varRows = varRes.data || []

  const MONTH_ABBR = [
    'Jan','Feb','Mar','Apr','May','Jun',
    'Jul','Aug','Sep','Oct','Nov','Dec',
  ]
  const periodSet = new Set()
  metrics.forEach((r) => periodSet.add(r.period_label))
  const months = [...periodSet].sort((a, b) => {
    const [aMonth, aYear] = a.split('-')
    const [bMonth, bYear] = b.split('-')
    if (aYear !== bYear) return Number(aYear) - Number(bYear)
    return MONTH_ABBR.indexOf(aMonth) - MONTH_ABBR.indexOf(bMonth)
  })

  const byCompany = {}
  const metricsByCompany = {}

  const companies = [...new Set(metrics.map((r) => r.company))]
  companies.forEach((company) => {
    metricsByCompany[company] = {
      totalIncome: new Array(months.length).fill(0),
      cogs: new Array(months.length).fill(0),
      grossProfit: new Array(months.length).fill(0),
      totalExpenses: new Array(months.length).fill(0),
      operatingIncome: new Array(months.length).fill(0),
    }
    byCompany[company] = new Array(months.length).fill(0)
  })

  metrics.forEach((row) => {
    const { company, metric_key, period_label, value } = row
    const num = Number(value) || 0
    const normalised = metric_key === 'totalCOGS' ? 'cogs' : metric_key
    if (!METRIC_KEYS.includes(normalised)) return
    const idx = months.indexOf(period_label)
    if (idx === -1 || !metricsByCompany[company]) return
    metricsByCompany[company][normalised][idx] = num
    if (metric_key === 'operatingIncome') byCompany[company][idx] = num
  })

  const hcProjectedSales = months.map((p) => {
    const row = hcRows.find((r) => r.period_label === p)
    return row != null ? Number(row.value) || 0 : 0
  })
  const varianceVsProjected = months.map((p) => {
    const row = varRows.find((r) => r.period_label === p)
    return row != null ? Number(row.value) || 0 : 0
  })

  return {
    months,
    byCompany,
    metricsByCompany,
    hcProjectedSales,
    varianceVsProjected,
  }
}
