import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
import { parseFinancialCsv, getChartData } from '../dashboards/netincome/utils/parseFinancialCsv'
import { useDataCache } from '../lib/DataCacheContext'
import ReportModal from '../dashboards/netincome/reports/ReportModal'
import MBRReport from '../dashboards/netincome/reports/MBRReport'
import WBRReport from '../dashboards/netincome/reports/WBRReport'
import { deriveCurrentMonthLabel, chronologicalMonths, formatMonthLong } from '../dashboards/netincome/reports/reportUtils'

const _IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

const TABLE_COLUMNS_REAL = [
  { key: 'Ryz Labs LLC', label: 'Ryz Labs LLC' },
  { key: 'Ryz Labs HC LLC', label: 'HC' },
  { key: 'Hip Train Inc', label: 'Hiptrain' },
  { key: 'Offsiteio Inc', label: 'Offsiteio' },
  { key: 'Ryz Labs Studio LLC', label: 'Studio' },
  { key: 'Studio INC (Ntrvsta)', label: 'Ntrvsta' },
  { key: 'CONSOLIDATED', label: 'Total' },
]

function deriveTableColumns(metricsByCompany) {
  if (!_IS_DEMO) return TABLE_COLUMNS_REAL
  const companies = Object.keys(metricsByCompany || {}).filter(c => c !== 'CONSOLIDATED')
  const cols = companies.map(c => ({ key: c, label: c }))
  cols.push({ key: 'CONSOLIDATED', label: 'Total' })
  return cols
}
const TABLE_ROWS = [
  { key: 'totalIncome', label: 'Total Income' },
  { key: 'cogs', label: 'Total COGS' },
  { key: 'grossProfit', label: 'Gross Profit' },
  { key: 'totalExpenses', label: 'Total Expenses' },
  { key: 'operatingIncome', label: 'Operating Income' },
]
const MONTH_SHORT = { January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr', May: 'May', June: 'Jun', July: 'Jul', August: 'Aug', September: 'Sep', October: 'Oct', November: 'Nov', December: 'Dec' }

function formatCurrency(value) {
  if (value == null || value === 0) return '$0'
  const sign = value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function sumAll(arr) {
  if (!arr) return 0
  return arr.reduce((acc, v) => (v !== undefined ? acc + Number(v) : acc), 0)
}

const MONTH_NAMES_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_ABBR_LIST = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function deriveCurrentMonthIndex(months) {
  const now = new Date()
  const yearSuffix = String(now.getFullYear()).slice(-2)
  // Try abbreviated first (e.g. 'Apr-26'), then full name (e.g. 'April-26')
  const abbr = MONTH_ABBR_LIST[now.getMonth()] + '-' + yearSuffix
  const full = MONTH_NAMES_FULL[now.getMonth()] + '-' + yearSuffix
  const idx = months.indexOf(abbr)
  if (idx >= 0) return idx
  const idx2 = months.indexOf(full)
  if (idx2 >= 0) return idx2
  return Math.min(months.length - 1, 2)
}

function formatMonthTitle(label) {
  if (!label) return ''
  const [name, yr] = label.split('-')
  // Expand abbreviated month name for display (Apr → April)
  const fullIdx = MONTH_ABBR_LIST.indexOf(name)
  const displayName = fullIdx >= 0 ? MONTH_NAMES_FULL[fullIdx] : name
  return `${displayName} 20${yr}`
}

function getMonthIndex(months, monthLabel) {
  if (!months) return -1
  return months.findIndex((m) => String(m) === monthLabel)
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

export default function NetIncomeDashboard() {
  const [parsed, setParsed] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [invoices, setInvoices] = useState([])
  const { fetchNetIncome, fetchCashflow } = useDataCache()

  // Preload cashflow invoices so the WBR report can include overdue AR without delay.
  useEffect(() => {
    fetchCashflow(false).then((data) => {
      if (Array.isArray(data)) setInvoices(data)
    }).catch(() => {})
  }, [fetchCashflow])

  const loadData = useCallback((forceRefresh = false) => {
    setIsLoading(true)
    setLoadError(null)
    fetchNetIncome(forceRefresh)
      .then((fromSupabase) => {
        if (fromSupabase !== null) {
          setParsed(fromSupabase)
          setLastUpdated(new Date())
          setIsLoading(false)
          return
        }
        return fetch('/net-income-data.csv', { cache: 'no-store' })
          .then((r) => {
            if (!r.ok) throw new Error('Failed to load Net Income data')
            return r.text()
          })
          .then((text) => {
            try {
              setParsed(parseFinancialCsv(text))
              setLastUpdated(new Date())
            } catch (e) {
              setLoadError('Failed to parse CSV')
            }
            setIsLoading(false)
          })
      })
      .catch((err) => {
        setLoadError(err?.message || 'Failed to load data')
        setIsLoading(false)
      })
  }, [fetchNetIncome])

  useEffect(() => { loadData(false) }, [loadData])

  if (loadError) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh]">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{loadError}</p>
          <p className="text-slate-500 text-sm mb-4">If using Supabase, check <code className="bg-slate-800 px-1 rounded">.env</code> and tables <code className="bg-slate-800 px-1 rounded">net_income_metrics</code>, <code className="bg-slate-800 px-1 rounded">net_income_hc_projected</code>, <code className="bg-slate-800 px-1 rounded">net_income_variance</code>. Otherwise ensure Net Income CSV is available at <code className="bg-slate-800 px-1 rounded">/net-income-data.csv</code>.</p>
          <button type="button" onClick={() => loadData(true)} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-500 disabled:opacity-50">Retry</button>
        </div>
      </div>
    )
  }

  if (isLoading || !parsed) {
    return (
      <div className="min-h-full bg-slate-950 text-slate-100 font-sans">
        <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="animate-pulse bg-slate-800 rounded h-6 w-48" />
            <div className="animate-pulse bg-slate-800 rounded h-4 w-72 mt-2" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="animate-pulse bg-slate-800 rounded-xl h-[420px]" />
          <div className="animate-pulse bg-slate-800 rounded-xl h-64" />
          <div className="animate-pulse bg-slate-800 rounded-xl h-64" />
        </main>
      </div>
    )
  }

  const { months, byCompany, metricsByCompany, hcProjectedSales, varianceVsProjected } = parsed

  return (
    <NetIncomeContent
      months={months}
      byCompany={byCompany}
      metricsByCompany={metricsByCompany}
      hcProjectedSales={hcProjectedSales || []}
      varianceVsProjected={varianceVsProjected || []}
      TABLE_COLUMNS={deriveTableColumns(metricsByCompany)}
      TABLE_ROWS={TABLE_ROWS}
      MONTH_SHORT={MONTH_SHORT}
      formatCurrency={formatCurrency}
      sumAll={sumAll}
      getValueAtMonth={getValueAtMonth}
      pctChange={pctChange}
      getChartData={getChartData}
      lastUpdated={lastUpdated}
      invoices={invoices}
    />
  )
}

function NetIncomeContent({
  months,
  byCompany,
  metricsByCompany,
  hcProjectedSales,
  varianceVsProjected,
  TABLE_COLUMNS,
  TABLE_ROWS,
  MONTH_SHORT,
  formatCurrency,
  sumAll,
  getValueAtMonth,
  pctChange,
  getChartData,
  lastUpdated,
  invoices,
}) {
  const [selectedCompanies, setSelectedCompanies] = useState(['CONSOLIDATED'])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [periodFilter, setPeriodFilter] = useState('yearly') // 'yearly' | 'Q1' | 'Q2' | 'Q3' | 'Q4'
  const [activeReport, setActiveReport] = useState(null) // null | 'wbr' | 'mbr'
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

  const companyNames = useMemo(() => Object.keys(byCompany), [byCompany])
  const dropdownLabel =
    selectedCompanies.length === 0 ? 'Select entities'
      : selectedCompanies.length === 1
        ? (selectedCompanies[0] === 'CONSOLIDATED' ? 'Consolidated' : selectedCompanies[0])
        : `${selectedCompanies.length} entities`

  const yearSuffix = useMemo(() => months.length > 0 ? String(months[0]).split('-').pop() : '26', [months])
  const chartData = useMemo(() => getChartData(months, byCompany, selectedCompanies), [months, byCompany, selectedCompanies])
  const chartDataYear = useMemo(() => chartData.filter((d) => String(d.month).endsWith('-' + yearSuffix)), [chartData, yearSuffix])

  const displayLabel =
    selectedCompanies.length === 0 ? 'Operating Income'
      : selectedCompanies.length === 1 && selectedCompanies[0] === 'CONSOLIDATED'
        ? 'Consolidated Operating Income'
        : selectedCompanies.length === 1
          ? `Operating Income — ${selectedCompanies[0]}`
          : `Operating Income — ${selectedCompanies.length} entities`

  const monthsYear = useMemo(() => months.filter((m) => String(m).endsWith('-' + yearSuffix)), [months, yearSuffix])

  // Quarter filtering helpers
  const QUARTER_MONTHS = { Q1: [0, 1, 2], Q2: [3, 4, 5], Q3: [6, 7, 8], Q4: [9, 10, 11] }
  const filterMonthsByPeriod = useMemo(() => {
    if (periodFilter === 'yearly') return monthsYear
    const qMonthIndices = QUARTER_MONTHS[periodFilter] || []
    return monthsYear.filter((m) => {
      const name = String(m).replace(/-\d{2}$/, '')
      // Support both abbreviated (Jan) and full (January) month labels
      let idx = MONTH_ABBR_LIST.indexOf(name)
      if (idx < 0) idx = MONTH_NAMES_FULL.indexOf(name)
      return qMonthIndices.includes(idx)
    })
  }, [monthsYear, periodFilter])

  const tablaConsolidado2026 = useMemo(() => {
    const cols = TABLE_COLUMNS.filter((col) => metricsByCompany[col.key])
    // Get indices of the filtered months within the full monthsYear array
    const filteredSet = new Set(filterMonthsByPeriod)
    const indices = monthsYear.map((m, i) => filteredSet.has(m) ? i : -1).filter((i) => i >= 0)

    return TABLE_ROWS.map((row) => {
      const cells = { metric: row.label }
      cols.forEach((col) => {
        const m = metricsByCompany[col.key]
        if (!m || !m[row.key]) {
          cells[col.key] = 0
        } else {
          cells[col.key] = indices.reduce((sum, i) => sum + (m[row.key][i] !== undefined ? Number(m[row.key][i]) : 0), 0)
        }
      })
      return cells
    })
  }, [metricsByCompany, monthsYear, filterMonthsByPeriod, TABLE_COLUMNS, TABLE_ROWS])

  const _hcKey = _IS_DEMO ? (TABLE_COLUMNS.find(c => c.key !== 'CONSOLIDATED') || {}).key : 'Ryz Labs HC LLC'
  const _secondKey = _IS_DEMO ? (TABLE_COLUMNS.filter(c => c.key !== 'CONSOLIDATED')[1] || {}).key : 'Offsiteio Inc'

  const hcProjectedVsActualAll = useMemo(() => {
    const hc = metricsByCompany[_hcKey]
    if (!hc || !hc.totalIncome || monthsYear.length === 0) return []
    const actual = hc.totalIncome
    return monthsYear.map((month, i) => {
      const proj = hcProjectedSales[i] ?? 0
      const act = actual[i] ?? 0
      const variance = varianceVsProjected[i] !== undefined ? varianceVsProjected[i] : act - proj
      const variancePct = proj !== 0 ? (variance / proj) * 100 : 0
      return { month, projected: proj, actual: act, variance, variancePct }
    })
  }, [metricsByCompany, monthsYear, hcProjectedSales, varianceVsProjected])

  const hcProjectedVsActual = useMemo(() => {
    if (periodFilter === 'yearly') return hcProjectedVsActualAll
    const filteredLabels = new Set(filterMonthsByPeriod)
    return hcProjectedVsActualAll.filter((row) => filteredLabels.has(row.month))
  }, [hcProjectedVsActualAll, periodFilter, filterMonthsByPeriod])

  const currentMonthIndex = useMemo(() => deriveCurrentMonthIndex(monthsYear), [monthsYear])
  const previousMonthLabel = monthsYear[currentMonthIndex - 1] || monthsYear[0]
  const currentMonthLabel = monthsYear[currentMonthIndex] || monthsYear[monthsYear.length - 1]
  const nextMonthLabel = monthsYear[currentMonthIndex + 1] || monthsYear[Math.min(currentMonthIndex + 1, monthsYear.length - 1)]
  const beforePreviousLabel = monthsYear[currentMonthIndex - 2] || monthsYear[0]

  const hcProjectedThroughCurrentMonth = useMemo(() => {
    // For quarterly view, show all months in that quarter; for yearly, up to current month
    if (periodFilter !== 'yearly') return hcProjectedVsActual
    return hcProjectedVsActual.slice(0, currentMonthIndex + 1)
  }, [hcProjectedVsActual, currentMonthIndex, periodFilter])
  const hcProjectedYtdThroughCurrentMonth = useMemo(() => {
    const rows = hcProjectedThroughCurrentMonth
    const totalProj = rows.reduce((s, r) => s + r.projected, 0)
    const totalAct = rows.reduce((s, r) => s + r.actual, 0)
    const variance = totalAct - totalProj
    const variancePct = totalProj !== 0 ? (variance / totalProj) * 100 : 0
    return { projected: totalProj, actual: totalAct, variance, variancePct }
  }, [hcProjectedThroughCurrentMonth])

  const buildMonthTable = (monthLabel, vsMonthLabel) => {
    const cols = TABLE_COLUMNS.filter((col) => metricsByCompany[col.key])
    return TABLE_ROWS.map((row) => {
      const cells = { metric: row.label }
      cols.forEach((col) => {
        cells[col.key] = getValueAtMonth(metricsByCompany, col.key, row.key, months, monthLabel)
      })
      const valCurr = getValueAtMonth(metricsByCompany, 'CONSOLIDATED', row.key, months, monthLabel)
      const valPrev = getValueAtMonth(metricsByCompany, 'CONSOLIDATED', row.key, months, vsMonthLabel)
      cells.pctChange = pctChange(valCurr, valPrev)
      return cells
    })
  }

  const tablaPrevious = useMemo(() => buildMonthTable(previousMonthLabel, beforePreviousLabel), [metricsByCompany, months, previousMonthLabel, beforePreviousLabel])
  const tablaCurrent = useMemo(() => buildMonthTable(currentMonthLabel, previousMonthLabel), [metricsByCompany, months, currentMonthLabel, previousMonthLabel])
  const tablaNext = useMemo(() => buildMonthTable(nextMonthLabel, currentMonthLabel), [metricsByCompany, months, nextMonthLabel, currentMonthLabel])

  const momAnalysis = useMemo(() => {
    const get = (company, metric) => ({
      prev: getValueAtMonth(metricsByCompany, company, metric, months, previousMonthLabel),
      curr: getValueAtMonth(metricsByCompany, company, metric, months, currentMonthLabel),
    })
    const bullet = (prev, curr, label) => {
      const delta = curr - prev
      const pct = prev !== 0 ? (delta / Math.abs(prev)) * 100 : (curr !== 0 ? 100 : 0)
      const direction = label === 'Total Expenses' ? (delta <= 0 ? 'increased' : 'decreased') : (delta >= 0 ? 'increased' : 'decreased')
      const absDelta = Math.abs(delta)
      const pctStr = pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`
      return { label, direction, absDelta, pctStr, prev, curr }
    }
    return [
      bullet(get('CONSOLIDATED', 'totalIncome').prev, get('CONSOLIDATED', 'totalIncome').curr, 'Total Revenue'),
      bullet(get(_hcKey, 'totalIncome').prev, get(_hcKey, 'totalIncome').curr, `${_IS_DEMO ? _hcKey : 'HC'} Revenue`),
      bullet(get('CONSOLIDATED', 'grossProfit').prev, get('CONSOLIDATED', 'grossProfit').curr, 'Gross Profit'),
      bullet(get('CONSOLIDATED', 'totalExpenses').prev, get('CONSOLIDATED', 'totalExpenses').curr, 'Total Expenses'),
      bullet(get('CONSOLIDATED', 'operatingIncome').prev, get('CONSOLIDATED', 'operatingIncome').curr, 'Operating Income'),
      bullet(get(_secondKey, 'totalIncome').prev, get(_secondKey, 'totalIncome').curr, `${_IS_DEMO ? _secondKey : 'Offsiteio'} revenue`),
    ]
  }, [metricsByCompany, months, previousMonthLabel, currentMonthLabel])

  return (
    <div className="min-h-full bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="font-semibold text-xl text-white tracking-tight">Net Income Dashboard</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-slate-400 text-sm">{_IS_DEMO ? 'Demo Company' : 'Ryz Holding'} — Operating Income by period</p>
            {lastUpdated && <span className="text-slate-500 text-xs">Last updated: {lastUpdated.toLocaleTimeString()}</span>}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <label htmlFor="entity-dropdown" className="text-slate-400 text-sm font-medium">Entity</label>
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
              <svg className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 z-10 mt-1 w-64 rounded-lg border border-slate-700 bg-slate-800 shadow-xl py-1 max-h-60 overflow-y-auto" role="listbox">
                {companyNames.map((name) => {
                  const checked = selectedCompanies.includes(name)
                  return (
                    <label key={name} role="option" aria-selected={checked} className="flex items-center gap-2 cursor-pointer px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setSelectedCompanies((prev) => (checked ? prev.filter((c) => c !== name) : [...prev, name]))}
                        className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      {name === 'CONSOLIDATED' ? 'Consolidated' : name}
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-700 hidden sm:block" />

          <label className="text-slate-400 text-sm font-medium">Period</label>
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            {['yearly', 'Q1', 'Q2', 'Q3', 'Q4'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodFilter(p)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  periodFilter === p
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
                } ${p !== 'yearly' ? 'border-l border-slate-700' : ''}`}
              >
                {p === 'yearly' ? 'Year' : p}
              </button>
            ))}
          </div>

          <div className="flex-1 hidden md:block" />

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setActiveReport('wbr')}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300"
              title="Generate Weekly Business Review"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              Generate WBR
            </button>
            <button
              type="button"
              onClick={() => setActiveReport('mbr')}
              className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-300"
              title="Generate Monthly Business Review"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Generate MBR
            </button>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="font-medium text-slate-200 text-base">{displayLabel} — 20{yearSuffix}</h2>
            {selectedCompanies.length === 1 && selectedCompanies[0] === 'CONSOLIDATED' && (
              <p className="text-slate-500 text-sm mt-1">Ryz Holding · Consolidated P&L (monthly)</p>
            )}
          </div>
          <div className="h-[380px] w-full">
            {chartDataYear.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">No data to display.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataYear} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
                      const name = String(m).replace(/-\d{2}$/, '')
                      return MONTH_SHORT[name] || name
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
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                    formatter={(value, name) => [formatCurrency(value), name === 'value' ? displayLabel : name]}
                    labelFormatter={(label) => label}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
                  {selectedCompanies.length === 1 ? (
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#incomeGradient)" name={displayLabel} />
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
            <h2 className="font-bold text-lg text-slate-100">HC Revenue vs Projected</h2>
            <p className="mt-1 text-sm font-semibold text-slate-300">HC revenue growth forecast — actual vs projected {periodFilter === 'yearly' ? '(through current month)' : `(${periodFilter} 20${yearSuffix})`}</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg bg-slate-700/50 border border-slate-600 p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{periodFilter === 'yearly' ? 'YTD' : periodFilter} Projected</p>
                <p className="text-xl font-semibold text-slate-100 mt-0.5">{formatCurrency(hcProjectedYtdThroughCurrentMonth.projected)}</p>
              </div>
              <div className="rounded-lg bg-slate-700/50 border border-slate-600 p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{periodFilter === 'yearly' ? 'YTD' : periodFilter} Actual</p>
                <p className="text-xl font-semibold text-slate-100 mt-0.5">{formatCurrency(hcProjectedYtdThroughCurrentMonth.actual)}</p>
              </div>
              <div className="rounded-lg bg-slate-700/50 border border-slate-600 p-4">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{periodFilter === 'yearly' ? 'YTD' : periodFilter} Variance vs Projected</p>
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
                      <td className="py-2 px-3 text-left font-medium text-slate-300">{MONTH_SHORT[String(row.month).replace(/-\d{2}$/, '')] || row.month}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-300">{formatCurrency(row.projected)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-200">{formatCurrency(row.actual)}</td>
                      <td className={`py-2 px-3 text-right tabular-nums ${row.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(row.variance)}</td>
                      <td className={`py-2 px-3 text-right tabular-nums ${row.variancePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{row.variancePct >= 0 ? '+' : ''}{row.variancePct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {[
          { title: `${formatMonthTitle(previousMonthLabel)} — Previous Month`, data: tablaPrevious, pctLabel: `vs ${MONTH_SHORT[beforePreviousLabel?.split('-')[0]] || ''} %` },
          { title: `${formatMonthTitle(currentMonthLabel)} — Current Month`, data: tablaCurrent, pctLabel: `vs ${MONTH_SHORT[previousMonthLabel?.split('-')[0]] || ''} %` },
          { title: `${formatMonthTitle(nextMonthLabel)} — Next Month Projection`, data: tablaNext, pctLabel: `vs ${MONTH_SHORT[currentMonthLabel?.split('-')[0]] || ''} %`, isProjection: true },
        ].map((block) => (
          <div key={block.title} className={`mt-8 rounded-xl border p-5 shadow-lg ${block.isProjection ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-600 bg-slate-800/40'}`}>
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-lg text-slate-100">Financial Dashboard</h2>
              {block.isProjection && (
                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-semibold text-amber-300 tracking-wide">PROJECTION</span>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-300">{block.title}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-600/80">
                    <th className="py-3 px-3 text-left font-bold uppercase tracking-wide text-slate-200">Metric</th>
                    {TABLE_COLUMNS.filter((col) => metricsByCompany[col.key]).map((col) => (
                      <th key={col.key} className="py-3 px-3 text-center font-bold uppercase tracking-wide text-slate-200 whitespace-nowrap">{col.label}</th>
                    ))}
                    <th className="py-3 px-3 text-right font-bold uppercase tracking-wide text-slate-200 whitespace-nowrap">{block.pctLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {block.data.map((row, rowIdx) => (
                    <tr key={row.metric} className={`border-b border-slate-600/80 ${rowIdx % 2 === 1 ? 'bg-slate-700/30' : ''} ${row.metric === 'Operating Income' ? 'bg-slate-700/50' : ''}`}>
                      <td className="py-2.5 px-3 text-left font-medium text-slate-300">{row.metric}</td>
                      {TABLE_COLUMNS.filter((col) => metricsByCompany[col.key]).map((col) => {
                        const v = row[col.key]
                        return (
                          <td key={col.key} className="py-2.5 px-3 text-right tabular-nums">
                            <span className={v >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(v)}</span>
                          </td>
                        )
                      })}
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        <span className={row.pctChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{row.pctChange >= 0 ? '+' : ''}{row.pctChange.toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="mt-8 rounded-xl border border-slate-600 bg-slate-800/40 p-5 shadow-lg">
          <h2 className="font-bold text-lg text-slate-100">Month-over-Month Analysis</h2>
          <p className="mt-1 text-sm font-semibold text-slate-300">{formatMonthTitle(currentMonthLabel)} vs {formatMonthTitle(previousMonthLabel)}</p>
          <ul className="mt-4 list-disc list-inside space-y-2 text-sm text-slate-300">
            {momAnalysis.map((item) => (
              <li key={item.label}>
                <span className="font-medium text-slate-200">{item.label}:</span> {item.direction} by {formatCurrency(item.absDelta)} ({item.pctStr}) from {formatCurrency(item.prev)} to {formatCurrency(item.curr)}.
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 rounded-xl border border-slate-600 bg-slate-800/40 p-5 shadow-lg">
          <h2 className="font-bold text-lg text-slate-100">Financial Dashboard</h2>
          <p className="mt-1 text-sm font-semibold text-slate-300">P&L by entity — {periodFilter === 'yearly' ? `20${yearSuffix} (consolidated, full year total)` : `${periodFilter} 20${yearSuffix}`}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-600/80">
                  <th className="py-3 px-3 text-left font-bold uppercase tracking-wide text-slate-200">Metric</th>
                  {TABLE_COLUMNS.filter((col) => metricsByCompany[col.key]).map((col) => (
                    <th key={col.key} className="py-3 px-3 text-center font-bold uppercase tracking-wide text-slate-200 whitespace-nowrap">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tablaConsolidado2026.map((row, rowIdx) => (
                  <tr key={row.metric} className={`border-b border-slate-600/80 ${rowIdx % 2 === 1 ? 'bg-slate-700/30' : ''} ${row.metric === 'Operating Income' ? 'bg-slate-700/50' : ''}`}>
                    <td className="py-2.5 px-3 text-left font-medium text-slate-300">{row.metric}</td>
                    {TABLE_COLUMNS.filter((col) => metricsByCompany[col.key]).map((col) => {
                      const v = row[col.key]
                      return (
                        <td key={col.key} className="py-2.5 px-3 text-right tabular-nums">
                          <span className={v >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(v)}</span>
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

      {/* Report modals */}
      {activeReport === 'wbr' && (() => {
        const ys = yearSuffix
        const curLbl = deriveCurrentMonthLabel(months, ys)
        const chrono = chronologicalMonths(months, ys)
        const curIdx = chrono.indexOf(curLbl)
        const prevLbl = curIdx > 0 ? chrono[curIdx - 1] : chrono[0]
        const nextLbl = curIdx >= 0 && curIdx < chrono.length - 1 ? chrono[curIdx + 1] : null
        const reportEntities = TABLE_COLUMNS.filter((c) => metricsByCompany[c.key])
        const hcKey = _IS_DEMO ? (TABLE_COLUMNS.find(c => c.key !== 'CONSOLIDATED') || {}).key : 'Ryz Labs HC LLC'
        return (
          <ReportModal
            title={`Weekly Business Review — ${formatMonthLong(curLbl)}`}
            onClose={() => setActiveReport(null)}
            filename={`WBR_${curLbl}.pdf`}
          >
            <WBRReport
              months={months}
              metricsByCompany={metricsByCompany}
              entities={reportEntities}
              hcKey={hcKey}
              currentMonthLabel={curLbl}
              previousMonthLabel={prevLbl}
              nextMonthLabel={nextLbl}
              invoices={invoices}
            />
          </ReportModal>
        )
      })()}

      {activeReport === 'mbr' && (() => {
        const ys = yearSuffix
        const curLbl = deriveCurrentMonthLabel(months, ys)
        const chrono = chronologicalMonths(months, ys)
        const curIdx = chrono.indexOf(curLbl)
        const prevLbl = curIdx > 0 ? chrono[curIdx - 1] : chrono[0]
        const nextLbl = curIdx >= 0 && curIdx < chrono.length - 1 ? chrono[curIdx + 1] : null
        const reportEntities = TABLE_COLUMNS.filter((c) => metricsByCompany[c.key])
        const hcKey = _IS_DEMO ? (TABLE_COLUMNS.find(c => c.key !== 'CONSOLIDATED') || {}).key : 'Ryz Labs HC LLC'
        return (
          <ReportModal
            title={`Monthly Business Review — ${formatMonthLong(curLbl)}`}
            onClose={() => setActiveReport(null)}
            filename={`MBR_${curLbl}.pdf`}
          >
            <MBRReport
              months={months}
              metricsByCompany={metricsByCompany}
              entities={reportEntities}
              hcKey={hcKey}
              currentMonthLabel={curLbl}
              previousMonthLabel={prevLbl}
              nextMonthLabel={nextLbl}
              yearSuffix={ys}
            />
          </ReportModal>
        )
      })()}
    </div>
  )
}
