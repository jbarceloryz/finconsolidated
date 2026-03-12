import React, { useState, useEffect } from 'react'
import PaymentTimeline from '../dashboards/cashflow/components/PaymentTimeline'
import SummaryCards from '../dashboards/cashflow/components/SummaryCards'
import InvoiceTable from '../dashboards/cashflow/components/InvoiceTable'
import MonthFilter from '../dashboards/cashflow/components/MonthFilter'
import CashFlowSimulator from '../dashboards/cashflow/components/CashFlowSimulator'

export default function CashflowDashboard() {
  const [data, setData] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())

  const loadCSVData = () => {
    setIsLoading(true)
    setLoadError(null)
    const timestamp = new Date().getTime()
    const r = Math.random().toString(36).slice(2)
    fetch(`/db.csv?t=${timestamp}&r=${r}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load CSV')
        return res.text()
      })
      .then((text) => {
        setData(text)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Error loading CSV:', err)
        setIsLoading(false)
        setLoadError(err.message || 'Failed to load data')
      })
  }

  useEffect(() => {
    loadCSVData()
  }, [])

  if (loadError) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh]">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{loadError}</p>
          <p className="text-slate-500 text-sm mb-4">Ensure <code className="bg-slate-800 px-1 rounded">Cashflow/db.csv</code> exists for dev, or copy it to <code className="bg-slate-800 px-1 rounded">public/db.csv</code> for build.</p>
          <button type="button" onClick={loadCSVData} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-500 disabled:opacity-50">Retry</button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh]">
        <div className="text-slate-500">Loading Cashflow data…</div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-950 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <MonthFilter selectedMonth={selectedMonth} selectedYear={selectedYear} onMonthChange={setSelectedMonth} onYearChange={setSelectedYear} />
            <button
              onClick={loadCSVData}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-emerald-400 bg-slate-800 border border-slate-600 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          <SummaryCards csvData={data} currentMonth={selectedMonth} currentYear={selectedYear} />
          <PaymentTimeline csvData={data} currentMonth={selectedMonth} currentYear={selectedYear} onMonthChange={setSelectedMonth} onYearChange={setSelectedYear} />
          <CashFlowSimulator csvData={data} />
          <InvoiceTable csvData={data} currentMonth={selectedMonth} currentYear={selectedYear} />
        </div>
      </div>
    </div>
  )
}
