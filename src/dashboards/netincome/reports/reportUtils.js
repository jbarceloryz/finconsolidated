// Shared helpers for WBR and MBR report generation.
// All calculations derive from the same data the Net Income dashboard uses,
// so the figures always match the live UI.

const MONTH_NAMES_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_ABBR_LIST = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function fmtMoney(value) {
  if (value == null || isNaN(value)) return '$0'
  const n = Number(value)
  if (n === 0) return '$0'
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function fmtPct(value, digits = 2) {
  if (value == null || isNaN(value)) return '0%'
  const sign = value > 0 ? '+' : ''
  return `${sign}${Number(value).toFixed(digits)}%`
}

export function fmtPctNoSign(value, digits = 2) {
  if (value == null || isNaN(value)) return '0%'
  return `${Number(value).toFixed(digits)}%`
}

export function monthIndexFromLabel(label) {
  if (!label) return -1
  const [name] = String(label).split('-')
  let idx = MONTH_ABBR_LIST.indexOf(name)
  if (idx < 0) idx = MONTH_NAMES_FULL.indexOf(name)
  return idx
}

export function formatMonthLong(label) {
  if (!label) return ''
  const [name, yr] = String(label).split('-')
  const idx = MONTH_ABBR_LIST.indexOf(name)
  const full = idx >= 0 ? MONTH_NAMES_FULL[idx] : name
  return `${full} 20${yr}`
}

export function formatMonthShort(label) {
  if (!label) return ''
  const [name, yr] = String(label).split('-')
  return `${name} ${yr}`
}

export function deriveCurrentMonthLabel(months, yearSuffix) {
  const now = new Date()
  const candidates = [
    `${MONTH_ABBR_LIST[now.getMonth()]}-${yearSuffix}`,
    `${MONTH_NAMES_FULL[now.getMonth()]}-${yearSuffix}`,
  ]
  for (const c of candidates) {
    if (months.includes(c)) return c
  }
  // Fallback to last month present for that year
  const ofYear = months.filter((m) => String(m).endsWith('-' + yearSuffix))
  return ofYear[ofYear.length - 1] || months[months.length - 1]
}

export function valueAt(metricsByCompany, company, metric, months, monthLabel) {
  const m = metricsByCompany[company]
  if (!m || !m[metric]) return 0
  const idx = months.indexOf(monthLabel)
  if (idx < 0) return 0
  const v = m[metric][idx]
  return v !== undefined && !isNaN(v) ? Number(v) : 0
}

export function pctChange(curr, prev) {
  if (prev === 0) return curr !== 0 ? (curr > 0 ? 100 : -100) : 0
  return ((curr - prev) / Math.abs(prev)) * 100
}

// Returns 12 monthly values for a given company + metric for the given year suffix
export function monthlySeries(metricsByCompany, company, metric, months, yearSuffix) {
  const m = metricsByCompany[company]
  if (!m || !m[metric]) return Array(12).fill(0)
  const yearMonths = months.filter((x) => String(x).endsWith('-' + yearSuffix))
  return yearMonths.map((lbl) => valueAt(metricsByCompany, company, metric, months, lbl))
}

// Reorders months to chronological order Jan → Dec for a given year
export function chronologicalMonths(months, yearSuffix) {
  const ofYear = months.filter((m) => String(m).endsWith('-' + yearSuffix))
  return [...ofYear].sort((a, b) => monthIndexFromLabel(a) - monthIndexFromLabel(b))
}

// Computes overdue invoices from cashflow (dueDate < today, not paid)
export function computeOverdueInvoices(invoices) {
  if (!Array.isArray(invoices)) return []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return invoices
    .filter((inv) => {
      if (!inv || !inv.dueDate) return false
      const due = inv.dueDate instanceof Date ? inv.dueDate : new Date(inv.dueDate)
      if (isNaN(due.getTime())) return false
      if (due >= today) return false
      // Treat anything that isn't PAID as outstanding
      const status = (inv.status || '').toUpperCase()
      return status !== 'PAID' && status !== 'VOID'
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
}

// Builds a P&L row per entity for a specific month
export function buildMonthlyPL(metricsByCompany, months, entities, monthLabel) {
  return entities.map((entity) => ({
    entity: entity.label,
    key: entity.key,
    totalIncome: valueAt(metricsByCompany, entity.key, 'totalIncome', months, monthLabel),
    cogs: valueAt(metricsByCompany, entity.key, 'cogs', months, monthLabel),
    grossProfit: valueAt(metricsByCompany, entity.key, 'grossProfit', months, monthLabel),
    totalExpenses: valueAt(metricsByCompany, entity.key, 'totalExpenses', months, monthLabel),
    operatingIncome: valueAt(metricsByCompany, entity.key, 'operatingIncome', months, monthLabel),
  }))
}

// Aggregates talent_pool rows into GP% per client (monthly contractors only)
export function summarizeGpByClient(talentRows) {
  if (!Array.isArray(talentRows) || talentRows.length === 0) return []
  const byCompany = {}
  for (const r of talentRows) {
    const rateType = (r.rate_type || '').toLowerCase()
    if (rateType && rateType !== 'monthly') continue
    const status = (r.status || '').toLowerCase()
    if (status === 'offboarded' || status === 'terminated') continue
    const company = r.company || 'Unknown'
    const rate = Number(r.rate) || 0
    const cost = Number(r.actual_cost) || 0
    const netMargin = r.net_margin !== undefined && r.net_margin !== null
      ? Number(r.net_margin)
      : rate - cost
    if (!byCompany[company]) byCompany[company] = { company, placements: 0, gpSum: 0, gpPcts: [], gpList: [] }
    byCompany[company].placements++
    byCompany[company].gpSum += netMargin
    byCompany[company].gpList.push(netMargin)
    const pct = rate > 0 ? (netMargin / rate) * 100 : 0
    byCompany[company].gpPcts.push(pct)
  }
  const rows = Object.values(byCompany).map((row) => {
    const avgGpPct = row.gpPcts.reduce((s, v) => s + v, 0) / (row.gpPcts.length || 1)
    const avgGp = row.gpSum / (row.placements || 1)
    const sorted = [...row.gpList].sort((a, b) => a - b)
    const median = sorted.length === 0
      ? 0
      : sorted.length % 2 === 1
        ? sorted[Math.floor(sorted.length / 2)]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    return {
      company: row.company,
      placements: row.placements,
      avgGpPct,
      avgGp,
      medianGp: median,
    }
  })
  // Grand total
  const totals = rows.reduce(
    (acc, r) => {
      acc.placements += r.placements
      acc.gpSum += r.avgGp * r.placements
      acc.pctSum += r.avgGpPct * r.placements
      return acc
    },
    { placements: 0, gpSum: 0, pctSum: 0 }
  )
  const grand = {
    company: 'Grand Total',
    placements: totals.placements,
    avgGpPct: totals.placements > 0 ? totals.pctSum / totals.placements : 0,
    avgGp: totals.placements > 0 ? totals.gpSum / totals.placements : 0,
    medianGp: null, // not meaningful across clients
    isTotal: true,
  }
  return [...rows.sort((a, b) => a.company.localeCompare(b.company)), grand]
}

// Builds a narrative summary block for the report executive section.
export function buildExecutiveNarrative({
  metricsByCompany,
  months,
  currentMonthLabel,
  previousMonthLabel,
  hcKey,
}) {
  const revCurr = valueAt(metricsByCompany, 'CONSOLIDATED', 'totalIncome', months, currentMonthLabel)
  const revPrev = valueAt(metricsByCompany, 'CONSOLIDATED', 'totalIncome', months, previousMonthLabel)
  const revDelta = pctChange(revCurr, revPrev)

  const gpCurr = valueAt(metricsByCompany, 'CONSOLIDATED', 'grossProfit', months, currentMonthLabel)
  const gpPrev = valueAt(metricsByCompany, 'CONSOLIDATED', 'grossProfit', months, previousMonthLabel)
  const gmCurr = revCurr !== 0 ? (gpCurr / revCurr) * 100 : 0
  const gmPrev = revPrev !== 0 ? (gpPrev / revPrev) * 100 : 0
  const bipsDelta = Math.round((gmCurr - gmPrev) * 100) // bips = 1/100 of 1%

  const opiCurr = valueAt(metricsByCompany, 'CONSOLIDATED', 'operatingIncome', months, currentMonthLabel)
  const hcCurr = valueAt(metricsByCompany, hcKey, 'totalIncome', months, currentMonthLabel)
  const hcPrev = valueAt(metricsByCompany, hcKey, 'totalIncome', months, previousMonthLabel)
  const hcDelta = pctChange(hcCurr, hcPrev)
  const hcShare = revCurr !== 0 ? (hcCurr / revCurr) * 100 : 0

  return {
    revCurr, revPrev, revDelta,
    gpCurr, gmCurr, gmPrev, bipsDelta,
    opiCurr,
    hcCurr, hcPrev, hcDelta, hcShare,
  }
}
