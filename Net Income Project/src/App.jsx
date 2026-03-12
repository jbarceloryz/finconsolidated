import { useState, useMemo, useRef, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { parseFinancialCsv, getChartData } from './utils/parseFinancialCsv'
import './index.css'

import csvContent from './assets/data.csv?raw'

function formatCurrency(value) {
  if (value == null || value === 0) return '$0'
  const sign = value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

const { months: INITIAL_MONTHS, byCompany: INITIAL_BY_COMPANY, metricsByCompany: INITIAL_METRICS, hcProjectedSales: INITIAL_HC_PROJECTED, varianceVsProjected: INITIAL_VARIANCE } = parseFinancialCsv(csvContent)

const TABLE_COLUMNS = [
  { key: 'Ryz Labs LLC', label: 'Ryz Labs LLC' },
  { key: 'Ryz Labs HC LLC', label: 'HC' },
  { key: 'Hip Train Inc', label: 'Hiptrain' },
  { key: 'Offsiteio Inc', label: 'Offsiteio' },
  { key: 'Ryz Labs Studio LLC', label: 'Studio' },
  { key: 'Ntrvsta', label: 'Ntrvsta' },
  { key: 'CONSOLIDATED', label: 'Total' },
]

const TABLE_ROWS = [
  { key: 'totalIncome', label: 'Total Income' },
  { key: 'cogs', label: 'Total COGS' },
  { key: 'grossProfit', label: 'Gross Profit' },
  { key: 'totalExpenses', label: 'Total Expenses' },
  { key: 'operatingIncome', label: 'Operating Income' },
]

const MONTH_SHORT = { January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr', May: 'May', June: 'Jun', July: 'Jul', August: 'Aug', September: 'Sep', October: 'Oct', November: 'Nov', December: 'Dec' }
const DASHBOARD_PASSWORD = '!accounting123$'
const DASHBOARD_AUTH_KEY = 'net-income-dashboard-authenticated'

function sum2026(arr, months) {
  if (!arr || !months) return 0
  return months.reduce((acc, m, i) => (String(m).includes('-26') && arr[i] !== undefined ? acc + Number(arr[i]) : acc), 0)
}

function getMonthIndex(months, monthLabel) {
  if (!months) return -1
  const i = months.findIndex((m) => String(m) === monthLabel)
  return i
}

function getValueAtMonth(metricsByCompany, companyKey, metricKey, months, monthLabel) {
  const m = metricsByCompany[companyKey]
  if (!m || !m[metricKey]) return 0
  const i = getMonthIndex(months, monthLabel)
  if (i < 0) return 0
  const v = m[metricKey][i]
  return v !== undefined ? Number(v) : 0
}

function pctChange(curr, prev) {
  if (prev === 0) return curr !== 0 ? (curr > 0 ? 100 : -100) : 0
  return ((curr - prev) / Math.abs(prev)) * 100
}

function App() {
  const [months] = useState(() => INITIAL_MONTHS)
  const [byCompany] = useState(() => INITIAL_BY_COMPANY)
  const [metricsByCompany] = useState(() => INITIAL_METRICS || {})
  const [hcProjectedSales] = useState(() => INITIAL_HC_PROJECTED || [])
  const [varianceVsProjected] = useState(() => INITIAL_VARIANCE || [])
  const [selectedCompanies, setSelectedCompanies] = useState(['CONSOLIDATED'])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.sessionStorage.getItem(DASHBOARD_AUTH_KEY) === 'true'
  })
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  function handleUnlock(e) {
    e.preventDefault()
    if (password === DASHBOARD_PASSWORD) {
      window.sessionStorage.setItem(DASHBOARD_AUTH_KEY, 'true')
      setIsAuthenticated(true)
      setAuthError('')
      setPassword('')
      return
    }
    setAuthError('Incorrect password.')
  }

  const companyNames = useMemo(() => Object.keys(byCompany), [byCompany])
  const dropdownLabel =
    selectedCompanies.length === 0
      ? 'Select entities'
      : selectedCompanies.length === 1
        ? (selectedCompanies[0] === 'CONSOLIDATED' ? 'Consolidated' : selectedCompanies[0])
        : `${selectedCompanies.length} entities`
  const chartData = useMemo(
    () => getChartData(months, byCompany, selectedCompanies),
    [months, byCompany, selectedCompanies]
  )
  const chartData2026 = useMemo(
    () => chartData.filter((d) => String(d.month).includes('-26')),
    [chartData]
  )

  const displayLabel =
    selectedCompanies.length === 0
      ? 'Operating Income'
      : selectedCompanies.length === 1 && selectedCompanies[0] === 'CONSOLIDATED'
        ? 'Consolidated Operating Income'
        : selectedCompanies.length === 1
          ? `Operating Income — ${selectedCompanies[0]}`
          : `Operating Income — ${selectedCompanies.length} entities`

  const tablaConsolidado2026 = useMemo(() => {
    const cols = TABLE_COLUMNS.filter((col) => metricsByCompany[col.key])
    return TABLE_ROWS.map((row) => {
      const cells = { metric: row.label }
      cols.forEach((col) => {
        const m = metricsByCompany[col.key]
        cells[col.key] = m && m[row.key] ? sum2026(m[row.key], months) : 0
      })
      return cells
    })
  }, [metricsByCompany, months])

  const months2026 = useMemo(() => months.filter((m) => String(m).includes('-26')), [months])
  const hcProjectedVsActual = useMemo(() => {
    const hc = metricsByCompany['Ryz Labs HC LLC']
    if (!hc || !hc.totalIncome || months2026.length === 0) return []
    const actual = hc.totalIncome
    return months2026.map((month, i) => {
      const proj = hcProjectedSales[i] ?? 0
      const act = actual[i] ?? 0
      const variance = varianceVsProjected[i] !== undefined ? varianceVsProjected[i] : act - proj
      const variancePct = proj !== 0 ? (variance / proj) * 100 : 0
      return { month, projected: proj, actual: act, variance, variancePct }
    })
  }, [metricsByCompany, months2026, hcProjectedSales, varianceVsProjected])
  const hcProjectedYtd = useMemo(() => {
    const totalProj = hcProjectedVsActual.reduce((s, r) => s + r.projected, 0)
    const totalAct = hcProjectedVsActual.reduce((s, r) => s + r.actual, 0)
    const variance = totalAct - totalProj
    const variancePct = totalProj !== 0 ? (variance / totalProj) * 100 : 0
    return { projected: totalProj, actual: totalAct, variance, variancePct }
  }, [hcProjectedVsActual])

  const HC_CURRENT_MONTH_INDEX = 2
  const hcProjectedThroughCurrentMonth = useMemo(
    () => hcProjectedVsActual.slice(0, HC_CURRENT_MONTH_INDEX + 1),
    [hcProjectedVsActual]
  )
  const hcProjectedYtdThroughCurrentMonth = useMemo(() => {
    const rows = hcProjectedThroughCurrentMonth
    const totalProj = rows.reduce((s, r) => s + r.projected, 0)
    const totalAct = rows.reduce((s, r) => s + r.actual, 0)
    const variance = totalAct - totalProj
    const variancePct = totalProj !== 0 ? (variance / totalProj) * 100 : 0
    return { projected: totalProj, actual: totalAct, variance, variancePct }
  }, [hcProjectedThroughCurrentMonth])

  const tablaFebrero = useMemo(() => {
    const cols = TABLE_COLUMNS.filter((col) => metricsByCompany[col.key])
    return TABLE_ROWS.map((row) => {
      const cells = { metric: row.label }
      cols.forEach((col) => {
        cells[col.key] = getValueAtMonth(metricsByCompany, col.key, row.key, months, 'February-26')
      })
      const valFeb = getValueAtMonth(metricsByCompany, 'CONSOLIDATED', row.key, months, 'February-26')
      const valEne = getValueAtMonth(metricsByCompany, 'CONSOLIDATED', row.key, months, 'January-26')
      cells.pctChange = pctChange(valFeb, valEne)
      return cells
    })
  }, [metricsByCompany, months])

  const tablaMarzo = useMemo(() => {
    const cols = TABLE_COLUMNS.filter((col) => metricsByCompany[col.key])
    return TABLE_ROWS.map((row) => {
      const cells = { metric: row.label }
      cols.forEach((col) => {
        cells[col.key] = getValueAtMonth(metricsByCompany, col.key, row.key, months, 'March-26')
      })
      const valMar = getValueAtMonth(metricsByCompany, 'CONSOLIDATED', row.key, months, 'March-26')
      const valFeb = getValueAtMonth(metricsByCompany, 'CONSOLIDATED', row.key, months, 'February-26')
      cells.pctChange = pctChange(valMar, valFeb)
      return cells
    })
  }, [metricsByCompany, months])

  const momAnalysisMarVsFeb = useMemo(() => {
    const get = (company, metric) => ({
      feb: getValueAtMonth(metricsByCompany, company, metric, months, 'February-26'),
      mar: getValueAtMonth(metricsByCompany, company, metric, months, 'March-26'),
    })
    const bullet = (feb, mar, label) => {
      const delta = mar - feb
      const pct = feb !== 0 ? (delta / Math.abs(feb)) * 100 : (mar !== 0 ? 100 : 0)
      // For expenses (negative values), less negative = decrease, more negative = increase
      const direction =
        label === 'Total Expenses'
          ? delta <= 0 ? 'increased' : 'decreased'
          : delta >= 0 ? 'increased' : 'decreased'
      const absDelta = Math.abs(delta)
      const pctStr = pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`
      return { label, direction, absDelta, pctStr, feb, mar }
    }
    const totalRev = get('CONSOLIDATED', 'totalIncome')
    const hcRev = get('Ryz Labs HC LLC', 'totalIncome')
    const grossProfit = get('CONSOLIDATED', 'grossProfit')
    const totalExp = get('CONSOLIDATED', 'totalExpenses')
    const operatingInc = get('CONSOLIDATED', 'operatingIncome')
    const offsiteioRev = get('Offsiteio Inc', 'totalIncome')
    return [
      bullet(totalRev.feb, totalRev.mar, 'Total Revenue'),
      bullet(hcRev.feb, hcRev.mar, 'HC Revenue'),
      bullet(grossProfit.feb, grossProfit.mar, 'Gross Profit'),
      bullet(totalExp.feb, totalExp.mar, 'Total Expenses'),
      bullet(operatingInc.feb, operatingInc.mar, 'Operating Income'),
      bullet(offsiteioRev.feb, offsiteioRev.mar, 'Offsiteio revenue'),
    ]
  }, [metricsByCompany, months])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
            <h1 className="font-display text-2xl font-semibold text-white">Net Income Dashboard</h1>
            <p className="mt-2 text-sm text-slate-400">
              Enter the password to view the dashboard.
            </p>
            <form className="mt-6 space-y-4" onSubmit={handleUnlock}>
              <div>
                <label htmlFor="dashboard-password" className="mb-2 block text-sm font-medium text-slate-300">
                  Password
                </label>
                <input
                  id="dashboard-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (authError) setAuthError('')
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="Enter password"
                />
              </div>
              {authError && <p className="text-sm text-rose-400">{authError}</p>}
              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Unlock dashboard
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="font-display font-semibold text-xl text-white tracking-tight">
            Net Income Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Ryz Holding — Operating Income by period
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <label htmlFor="entity-dropdown" className="text-slate-400 text-sm font-medium">
            Entity
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              id="entity-dropdown"
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center justify-between gap-2 min-w-[220px] rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-left text-sm font-medium text-slate-200 hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              aria-expanded={dropdownOpen}
              aria-haspopup="listbox"
            >
              <span>{dropdownLabel}</span>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div
                className="absolute top-full left-0 z-10 mt-1 w-64 rounded-lg border border-slate-700 bg-slate-800 shadow-xl py-1 max-h-60 overflow-y-auto"
                role="listbox"
              >
                {companyNames.map((name) => {
                  const checked = selectedCompanies.includes(name)
                  return (
                    <label
                      key={name}
                      role="option"
                      aria-selected={checked}
                      className="flex items-center gap-2 cursor-pointer px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedCompanies((prev) =>
                            checked ? prev.filter((c) => c !== name) : [...prev, name]
                          )
                        }}
                        className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      {name === 'CONSOLIDATED' ? 'Consolidated' : name}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="font-display font-medium text-slate-200 text-base">
              {displayLabel} — 2026
            </h2>
            {selectedCompanies.length === 1 && selectedCompanies[0] === 'CONSOLIDATED' && (
              <p className="text-slate-500 text-sm mt-1">
                Ryz Holding · Consolidated P&amp;L (monthly)
              </p>
            )}
          </div>
          <div className="h-[380px] w-full">
            {chartData2026.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                No data to display.
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData2026}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="incomeGradientNegative" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={{ stroke: '#475569' }}
                  interval={0}
                  tickFormatter={(m) => {
                    const short = { January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr', May: 'May', June: 'Jun', July: 'Jul', August: 'Aug', September: 'Sep', October: 'Oct', November: 'Nov', December: 'Dec' }
                    const name = String(m).replace(/-26$/, '')
                    return short[name] || name
                  }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#475569' }}
                  tickLine={{ stroke: '#475569' }}
                  tickFormatter={(v) => formatCurrency(v)}
                  width={80}
                  label={{ value: 'Monthly operating income ($)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11 } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value, name) => [formatCurrency(value), name === 'value' ? displayLabel : name]}
                  labelFormatter={(label) => label}
                />
                <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
                {selectedCompanies.length === 1 ? (
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#incomeGradient)"
                    name={displayLabel}
                  />
                ) : (
                  selectedCompanies.map((company, idx) => {
                    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
                    const color = colors[idx % colors.length]
                    return (
                      <Area
                        key={company}
                        type="monotone"
                        dataKey={company}
                        stroke={color}
                        strokeWidth={2}
                        fill={color}
                        fillOpacity={0.2}
                        name={company === 'CONSOLIDATED' ? 'Consolidated' : company}
                      />
                    )
                  })
                )}
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {hcProjectedVsActual.length > 0 && hcProjectedSales.length > 0 && (
          <div className="mt-8 rounded-xl border border-slate-600 bg-slate-800/40 p-5 shadow-lg">
            <h2 className="font-display text-lg font-bold text-slate-100">
              HC Revenue vs Projected
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-300">
              HC revenue growth forecast — actual vs projected (through current month)
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg bg-slate-700/50 border border-slate-600 p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">YTD Projected</p>
                <p className="text-xl font-semibold text-slate-100 mt-0.5">{formatCurrency(hcProjectedYtdThroughCurrentMonth.projected)}</p>
              </div>
              <div className="rounded-lg bg-slate-700/50 border border-slate-600 p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">YTD Actual</p>
                <p className="text-xl font-semibold text-slate-100 mt-0.5">{formatCurrency(hcProjectedYtdThroughCurrentMonth.actual)}</p>
              </div>
              <div className="rounded-lg bg-slate-700/50 border border-slate-600 p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">YTD Variance vs Projected</p>
                <p className={`text-xl font-semibold mt-0.5 ${hcProjectedYtdThroughCurrentMonth.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(hcProjectedYtdThroughCurrentMonth.variance)} ({hcProjectedYtdThroughCurrentMonth.variancePct >= 0 ? '+' : ''}{hcProjectedYtdThroughCurrentMonth.variancePct.toFixed(1)}%)
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-600/80">
                    <th className="py-2.5 px-3 text-left font-bold uppercase tracking-wide text-slate-200">Month</th>
                    <th className="py-2.5 px-3 text-right font-bold uppercase tracking-wide text-slate-200">Projected</th>
                    <th className="py-2.5 px-3 text-right font-bold uppercase tracking-wide text-slate-200">Actual</th>
                    <th className="py-2.5 px-3 text-right font-bold uppercase tracking-wide text-slate-200">Variance ($)</th>
                    <th className="py-2.5 px-3 text-right font-bold uppercase tracking-wide text-slate-200">Variance %</th>
                  </tr>
                </thead>
                <tbody>
                  {hcProjectedThroughCurrentMonth.map((row, idx) => (
                    <tr key={row.month} className={`border-b border-slate-600/80 ${idx % 2 === 1 ? 'bg-slate-700/30' : ''}`}>
                      <td className="py-2 px-3 text-left font-medium text-slate-300">
                        {MONTH_SHORT[String(row.month).replace(/-26$/, '')] || row.month}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-300">{formatCurrency(row.projected)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-200">{formatCurrency(row.actual)}</td>
                      <td className={`py-2 px-3 text-right tabular-nums ${row.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(row.variance)}</td>
                      <td className={`py-2 px-3 text-right tabular-nums ${row.variancePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {row.variancePct >= 0 ? '+' : ''}{row.variancePct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-slate-600 bg-slate-800/40 p-5 shadow-lg">
          <h2 className="font-display text-lg font-bold text-slate-100">
            Financial Dashboard
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-300">
            February 2026 — Current Month
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-600/80">
                  <th className="py-3 px-3 text-left font-bold uppercase tracking-wide text-slate-200">Metric</th>
                  {TABLE_COLUMNS.filter((col) => metricsByCompany[col.key]).map((col) => (
                    <th key={col.key} className="py-3 px-3 text-center font-bold uppercase tracking-wide text-slate-200 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right font-bold uppercase tracking-wide text-slate-200 whitespace-nowrap">vs Jan %</th>
                </tr>
              </thead>
              <tbody>
                {tablaFebrero.map((row, rowIdx) => (
                  <tr
                    key={row.metric}
                    className={`border-b border-slate-600/80 ${rowIdx % 2 === 1 ? 'bg-slate-700/30' : ''} ${row.metric === 'Operating Income' ? 'bg-slate-700/50' : ''}`}
                  >
                    <td className="py-2.5 px-3 text-left font-medium text-slate-300">{row.metric}</td>
                    {TABLE_COLUMNS.filter((col) => metricsByCompany[col.key]).map((col) => {
                      const v = row[col.key]
                      return (
                        <td key={col.key} className="py-2.5 px-3 text-right tabular-nums">
                          <span className={v >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {formatCurrency(v)}
                          </span>
                        </td>
                      )
                    })}
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <span className={row.pctChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {row.pctChange >= 0 ? '+' : ''}{row.pctChange.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-600 bg-slate-800/40 p-5 shadow-lg">
          <h2 className="font-display text-lg font-bold text-slate-100">
            Financial Dashboard
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-300">
            March 2026 — Current Month
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-600/80">
                  <th className="py-3 px-3 text-left font-bold uppercase tracking-wide text-slate-200">Metric</th>
                  {TABLE_COLUMNS.filter((col) => metricsByCompany[col.key]).map((col) => (
                    <th key={col.key} className="py-3 px-3 text-center font-bold uppercase tracking-wide text-slate-200 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right font-bold uppercase tracking-wide text-slate-200 whitespace-nowrap">vs Feb %</th>
                </tr>
              </thead>
              <tbody>
                {tablaMarzo.map((row, rowIdx) => (
                  <tr
                    key={row.metric}
                    className={`border-b border-slate-600/80 ${rowIdx % 2 === 1 ? 'bg-slate-700/30' : ''} ${row.metric === 'Operating Income' ? 'bg-slate-700/50' : ''}`}
                  >
                    <td className="py-2.5 px-3 text-left font-medium text-slate-300">{row.metric}</td>
                    {TABLE_COLUMNS.filter((col) => metricsByCompany[col.key]).map((col) => {
                      const v = row[col.key]
                      return (
                        <td key={col.key} className="py-2.5 px-3 text-right tabular-nums">
                          <span className={v >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {formatCurrency(v)}
                          </span>
                        </td>
                      )
                    })}
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <span className={row.pctChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {row.pctChange >= 0 ? '+' : ''}{row.pctChange.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-slate-600 bg-slate-800/40 p-5 shadow-lg">
          <h2 className="font-display text-lg font-bold text-slate-100">
            Month-over-Month Analysis
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-300">
            March 2026 vs February 2026 — Projections
          </p>
          <ul className="mt-4 list-disc list-inside space-y-2 text-sm text-slate-300">
            {momAnalysisMarVsFeb.map((item) => (
              <li key={item.label}>
                <span className="font-medium text-slate-200">{item.label}:</span>{' '}
                {item.direction} by {formatCurrency(item.absDelta)} ({item.pctStr}) from {formatCurrency(item.feb)} to {formatCurrency(item.mar)}.
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 rounded-xl border border-slate-600 bg-slate-800/40 p-5 shadow-lg">
          <h2 className="font-display text-lg font-bold text-slate-100">
            Financial Dashboard
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-300">
            P&amp;L by entity — 2026 (consolidated, full year total)
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-600/80">
                  <th className="py-3 px-3 text-left font-bold uppercase tracking-wide text-slate-200">Metric</th>
                  {TABLE_COLUMNS.filter((col) => metricsByCompany[col.key]).map((col) => (
                    <th key={col.key} className="py-3 px-3 text-center font-bold uppercase tracking-wide text-slate-200 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tablaConsolidado2026.map((row, rowIdx) => (
                  <tr
                    key={row.metric}
                    className={`border-b border-slate-600/80 ${rowIdx % 2 === 1 ? 'bg-slate-700/30' : ''} ${row.metric === 'Operating Income' ? 'bg-slate-700/50' : ''}`}
                  >
                    <td className="py-2.5 px-3 text-left font-medium text-slate-300">{row.metric}</td>
                    {TABLE_COLUMNS.filter((col) => metricsByCompany[col.key]).map((col) => {
                      const v = row[col.key]
                      return (
                        <td key={col.key} className="py-2.5 px-3 text-right tabular-nums">
                          <span className={v >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {formatCurrency(v)}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
