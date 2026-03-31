import React, { useState, useEffect, useCallback } from 'react'
import PaymentTimeline from '../dashboards/cashflow/components/PaymentTimeline'
import SummaryCards from '../dashboards/cashflow/components/SummaryCards'
import InvoiceTable from '../dashboards/cashflow/components/InvoiceTable'
import MonthFilter from '../dashboards/cashflow/components/MonthFilter'
import CashFlowSimulator from '../dashboards/cashflow/components/CashFlowSimulator'
import { useDataCache } from '../lib/DataCacheContext'
import { processCSVData } from '../dashboards/cashflow/utils/processCSV'

export default function CashflowDashboard() {
  const [invoices, setInvoices] = useState(null)
  const [apOutgoing, setApOutgoing] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const { fetchCashflow, fetchAPCashflow } = useDataCache()

  const loadData = useCallback((forceRefresh = false) => {
    setIsLoading(true)
    setLoadError(null)
    // Load AP outgoing payments in parallel
    fetchAPCashflow(forceRefresh).then((data) => data && setApOutgoing(data)).catch(() => setApOutgoing([]))
    // Prefer Supabase (with cache) when configured
    fetchCashflow(forceRefresh)
      .then((fromSupabase) => {
        if (fromSupabase !== null) {
          setInvoices(fromSupabase)
          setLastUpdated(new Date())
          setIsLoading(false)
          return
        }
        // CSV fallback with its own 10-second timeout
        const controller = new AbortController()
        const tid = setTimeout(() => controller.abort(), 10_000)
        const timestamp = new Date().getTime()
        const r = Math.random().toString(36).slice(2)
        return fetch(`/db.csv?t=${timestamp}&r=${r}`, {
          cache: 'no-store',
          signal: controller.signal,
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        })
          .then((res) => {
            clearTimeout(tid)
            if (!res.ok) throw new Error('Failed to load CSV')
            return res.text()
          })
          .then((text) => {
            setInvoices(processCSVData(text))
            setLastUpdated(new Date())
            setIsLoading(false)
          })
      })
      .catch((err) => {
        console.error('Error loading Cashflow data:', err)
        setIsLoading(false)
        setLoadError(err.name === 'AbortError' ? 'Request timed out. Try again.' : (err.message || 'Failed to load data'))
      })
  }, [fetchCashflow, fetchAPCashflow])

  useEffect(() => {
    loadData(false)
  }, [loadData])

  if (loadError) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh]">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{loadError}</p>
          <p className="text-slate-500 text-sm mb-4">
            If using Supabase, check <code className="bg-slate-800 px-1 rounded">.env</code> (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) and the <code className="bg-slate-800 px-1 rounded">cashflow_invoices</code> table. Otherwise ensure <code className="bg-slate-800 px-1 rounded">Cashflow/db.csv</code> exists.
          </p>
          <button type="button" onClick={() => loadData(true)} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-500 disabled:opacity-50">Retry</button>
        </div>
      </div>
    )
  }

  if (invoices === null) {
    return (
      <div className="min-h-full bg-slate-950 p-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="animate-pulse bg-slate-800 rounded-lg h-12 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="animate-pulse bg-slate-800 rounded-lg h-28" />)}
          </div>
          <div className="animate-pulse bg-slate-800 rounded-lg h-64" />
          <div className="animate-pulse bg-slate-800 rounded-lg h-48" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-950 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MonthFilter selectedMonth={selectedMonth} selectedYear={selectedYear} onMonthChange={setSelectedMonth} onYearChange={setSelectedYear} />
              {lastUpdated && <span className="text-slate-500 text-xs">Last updated: {lastUpdated.toLocaleTimeString()}</span>}
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-emerald-400 bg-slate-800 border border-slate-600 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <SummaryCards invoices={invoices} currentMonth={selectedMonth} currentYear={selectedYear} />
          <PaymentTimeline invoices={invoices} currentMonth={selectedMonth} currentYear={selectedYear} onMonthChange={setSelectedMonth} onYearChange={setSelectedYear} />
          <CashFlowSimulator invoices={invoices} apOutgoing={apOutgoing} />
          <InvoiceTable invoices={invoices} currentMonth={selectedMonth} currentYear={selectedYear} />
        </div>
      </div>
    </div>
  )
}
