/**
 * Mock / demo data for all dashboards.
 * Used when VITE_DEMO_MODE=true — no Supabase connection needed.
 * All companies, names, and numbers are completely fabricated.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────
function d(y, m, day) { return new Date(y, m - 1, day) }
const today = new Date()
const Y = today.getFullYear()
const M = today.getMonth() // 0-indexed

// ─── Demo companies ──────────────────────────────────────────────────────────
export const DEMO_COMPANIES = ['Acme Corp', 'TechFlow Inc', 'NovaStar LLC', 'BrightPath Co', 'Zenith Labs']

// ─── 1. Cashflow invoices ────────────────────────────────────────────────────
export function getDemoCashflowInvoices() {
  const clients = ['Alpha Solutions', 'Beta Digital', 'Gamma Partners', 'Delta Services', 'Epsilon Group', 'Zeta Consulting', 'Eta Systems', 'Theta Corp']
  const statuses = ['PAID', 'PAID', 'PAID', 'UPCOMING', 'UPCOMING', 'OVERDUE', 'UPCOMING', 'PAID']

  const invoices = []
  // Generate ~40 invoices spread across previous, current, and next month
  for (let offset = -1; offset <= 1; offset++) {
    const mDate = new Date(Y, M + offset, 1)
    const mY = mDate.getFullYear()
    const mM = mDate.getMonth()
    const daysInMonth = new Date(mY, mM + 1, 0).getDate()

    for (let i = 0; i < 14; i++) {
      const clientIdx = (i + offset + 10) % clients.length
      const statusIdx = (i + offset + 10) % statuses.length
      const day = Math.min((i * 2) + 1, daysInMonth)
      const amount = Math.round((3000 + Math.sin(i * 1.7 + offset) * 2500 + i * 500) * 100) / 100
      const status = offset < 0 ? 'PAID' : statuses[statusIdx]

      invoices.push({
        client: clients[clientIdx],
        dueDate: d(mY, mM + 1, day),
        amount: Math.abs(amount),
        originalAmount: amount,
        status,
        statusCategory: status === 'PAID' ? 'paid' : status === 'OVERDUE' ? 'overdue' : 'upcoming',
      })
    }
  }
  return invoices
}

// ─── 2. Net Income data ──────────────────────────────────────────────────────
export function getDemoNetIncomeData() {
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const yr = String(Y).slice(-2)
  const prevYr = String(Y - 1).slice(-2)

  // Build 6 months of data ending at current month
  const months = []
  for (let i = -5; i <= 0; i++) {
    const dt = new Date(Y, M + i, 1)
    const name = MONTH_NAMES[dt.getMonth()]
    const suffix = String(dt.getFullYear()).slice(-2)
    months.push(`${name}-${suffix}`)
  }

  const companies = ['Acme Corp', 'TechFlow Inc', 'NovaStar LLC', 'BrightPath Co', 'Zenith Labs', 'CONSOLIDATED']

  const byCompany = {}
  const metricsByCompany = {}

  companies.forEach((co, coIdx) => {
    const isTotal = co === 'CONSOLIDATED'
    const base = isTotal ? 0 : (coIdx + 1) * 15000

    const income = months.map((_, i) => Math.round(base * (1 + i * 0.05) + (Math.sin(i + coIdx) * 3000)))
    const cogs = income.map((v) => Math.round(v * (0.3 + coIdx * 0.02)))
    const gp = income.map((v, i) => v - cogs[i])
    const expenses = income.map((v) => Math.round(v * (0.15 + coIdx * 0.01)))
    const opIncome = gp.map((v, i) => v - expenses[i])

    metricsByCompany[co] = {
      totalIncome: isTotal ? new Array(months.length).fill(0) : income,
      cogs: isTotal ? new Array(months.length).fill(0) : cogs,
      grossProfit: isTotal ? new Array(months.length).fill(0) : gp,
      totalExpenses: isTotal ? new Array(months.length).fill(0) : expenses,
      operatingIncome: isTotal ? new Array(months.length).fill(0) : opIncome,
    }
    byCompany[co] = isTotal ? new Array(months.length).fill(0) : opIncome
  })

  // Sum up CONSOLIDATED
  companies.filter(c => c !== 'CONSOLIDATED').forEach(co => {
    months.forEach((_, i) => {
      metricsByCompany['CONSOLIDATED'].totalIncome[i] += metricsByCompany[co].totalIncome[i]
      metricsByCompany['CONSOLIDATED'].cogs[i] += metricsByCompany[co].cogs[i]
      metricsByCompany['CONSOLIDATED'].grossProfit[i] += metricsByCompany[co].grossProfit[i]
      metricsByCompany['CONSOLIDATED'].totalExpenses[i] += metricsByCompany[co].totalExpenses[i]
      metricsByCompany['CONSOLIDATED'].operatingIncome[i] += metricsByCompany[co].operatingIncome[i]
      byCompany['CONSOLIDATED'][i] += byCompany[co][i]
    })
  })

  const hcProjectedSales = months.map((_, i) => Math.round(50000 + i * 5000 + Math.sin(i) * 8000))
  const varianceVsProjected = months.map((_, i) => Math.round(-2000 + i * 800 + Math.cos(i) * 3000))

  return { months, byCompany, metricsByCompany, hcProjectedSales, varianceVsProjected }
}

// ─── 3. AP invoices ──────────────────────────────────────────────────────────
let _demoAPNextId = 100

export function getDemoAPInvoices() {
  const vendors = ['CloudServe Pro', 'DataLink Inc', 'PrintPlus', 'OfficeHub', 'SecurePay', 'TravelNow', 'NetOps Ltd', 'Creative Studio']
  const categories = ['Software', 'Services', 'Office Supplies', 'Travel', 'Marketing', 'Infrastructure', 'Legal', 'Other']
  const data = []

  for (let i = 0; i < 20; i++) {
    const coIdx = i % DEMO_COMPANIES.length
    const vIdx = i % vendors.length
    const catIdx = i % categories.length
    const dayOffset = i * 3 - 15
    const dueDate = d(Y, M + 1, Math.max(1, Math.min(28, 15 + dayOffset)))
    const recDate = d(Y, M + 1, Math.max(1, Math.min(28, 10 + dayOffset)))
    const amount = Math.round((1500 + i * 800 + Math.sin(i * 2.3) * 1200) * 100) / 100

    let status
    if (i < 5) status = 'PAID'
    else if (i < 10) status = 'APPROVED'
    else if (i < 14) status = 'PENDING'
    else if (i < 17) status = 'OVERDUE'
    else status = 'VOID'

    data.push({
      id: _demoAPNextId++,
      company: DEMO_COMPANIES[coIdx],
      vendor: vendors[vIdx],
      invoiceNumber: `INV-${String(2000 + i).padStart(4, '0')}`,
      description: `${categories[catIdx]} — ${vendors[vIdx]} services`,
      category: categories[catIdx],
      amount: Math.abs(amount),
      recordingDate: recDate,
      dueDate,
      paidDate: status === 'PAID' ? d(Y, M + 1, Math.max(1, 12 + dayOffset)) : null,
      status,
      paymentMethod: status === 'PAID' ? 'Wire Transfer' : '',
      notes: '',
      createdAt: recDate.toISOString(),
      updatedAt: recDate.toISOString(),
    })
  }
  return data
}

export function getDemoAPForCashflow() {
  return getDemoAPInvoices()
    .filter(inv => inv.status === 'APPROVED' || inv.status === 'OVERDUE')
    .map(inv => ({
      id: inv.id,
      amount: inv.amount,
      date: `${inv.dueDate.getFullYear()}-${String(inv.dueDate.getMonth() + 1).padStart(2, '0')}-${String(inv.dueDate.getDate()).padStart(2, '0')}`,
      description: `AP: ${inv.vendor} — ${inv.description}`,
      status: inv.status,
      source: 'ap',
    }))
}

// ─── 4. GP Analysis / Talent Pool (CSV text) ────────────────────────────────
export function getDemoTalentPoolCSV() {
  const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const names = [
    'Alex Rivera', 'Sam Chen', 'Jordan Blake', 'Morgan Lee', 'Casey Patel',
    'Taylor Quinn', 'Avery Simmons', 'Riley Torres', 'Jamie Nakamura', 'Drew Fischer',
    'Pat Costa', 'Robin Andersen', 'Harper Wells', 'Sage Kim', 'Quinn Douglas',
  ]
  const roles = [
    'Senior Engineer', 'Product Manager', 'Data Analyst', 'UX Designer', 'DevOps Engineer',
    'QA Lead', 'Full-Stack Dev', 'ML Engineer', 'Tech Lead', 'Backend Engineer',
    'Frontend Developer', 'Solutions Architect', 'Scrum Master', 'Cloud Engineer', 'Security Analyst',
  ]

  const cols = ['Candidate Name','Role','Company','Rate','Actual Cost','Net Margin','Rate Type','Start Date','Hire Date','End Date','Status','Month']
  const lines = [cols.join(',')]

  const fmt = (dt) => {
    const mn = MONTH_NAMES_SHORT[dt.getMonth()]
    return `${mn} ${String(dt.getDate()).padStart(2, '0')}, ${dt.getFullYear()}`
  }

  for (let mi = -3; mi <= 0; mi++) {
    const dt = new Date(Y, M + mi, 1)
    const monthLabel = `${dt.getMonth() + 1}/${String(dt.getFullYear()).slice(-2)}`
    for (let j = 0; j < 5; j++) {
      const idx = ((mi + 3) * 5 + j) % names.length
      const rate = 80 + j * 10 + (mi + 3) * 5
      const cost = rate * 0.6
      const margin = rate - cost
      const startDate = d(Y, M + mi, 1 + j * 2)
      const hireDate = d(Y, M + mi, 3 + j * 2)
      const isOffboarded = mi < 0 && j === 0
      const endDate = isOffboarded ? d(Y, M + mi, 28) : null
      const status = isOffboarded ? 'Offboarded' : 'Onboarded'
      const co = DEMO_COMPANIES[j % DEMO_COMPANIES.length]

      const vals = [
        names[idx], roles[idx], co, rate, cost.toFixed(2), margin.toFixed(2),
        'Hourly', fmt(startDate), fmt(hireDate),
        endDate ? fmt(endDate) : 'N/A', status, monthLabel,
      ].map(v => { const s = String(v); return s.includes(',') ? `"${s}"` : s })
      lines.push(vals.join(','))
    }
  }
  return lines.join('\n')
}
