import React, { useState, useEffect, useCallback } from 'react'
import { fetchAllAnalytics } from '../lib/analyticsData'

// ── Formatting helpers ───────────────────────────────────────────────────────
function fmtCurrency(v) {
  if (v == null) return '$0'
  const sign = v < 0 ? '-' : ''
  return `${sign}$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
function fmtNum(v, decimals = 1) {
  if (v == null) return '—'
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Reusable components ──────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children, accent = 'emerald' }) {
  const accentMap = {
    emerald: 'border-emerald-500/30',
    amber: 'border-amber-500/30',
    sky: 'border-sky-500/30',
    rose: 'border-rose-500/30',
  }
  return (
    <div className={`bg-slate-900/60 border border-slate-800 rounded-lg shadow-sm overflow-hidden ${accentMap[accent] || ''}`}>
      <div className="px-5 py-4 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function DataTable({ columns, rows, emptyMessage = 'No data available' }) {
  if (!rows || rows.length === 0) {
    return <div className="p-6 text-center text-slate-500 text-sm">{emptyMessage}</div>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-800">
          {columns.map((col) => (
            <th
              key={col.key}
              className={`px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider ${col.align === 'right' ? 'text-right' : 'text-left'}`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
            {columns.map((col) => (
              <td
                key={col.key}
                className={`px-4 py-2.5 ${col.align === 'right' ? 'text-right tabular-nums' : ''} ${col.className?.(row) || 'text-slate-300'}`}
              >
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function KPIRow({ items }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {items.map((item) => (
        <div key={item.label} className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-500 mb-1">{item.label}</p>
          <p className={`text-lg font-semibold tabular-nums ${item.color || 'text-slate-100'}`}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Simple horizontal bar (inline) ──────────────────────────────────────────
function InlineBar({ value, max, color = 'bg-emerald-500' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
export default function AnalyticsDashboard() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadData = useCallback(() => {
    setIsLoading(true)
    setLoadError(null)
    fetchAllAnalytics()
      .then((result) => {
        setData(result)
        setLastUpdated(new Date())
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Analytics fetch error:', err)
        setLoadError(err.message || 'Failed to load analytics')
        setIsLoading(false)
      })
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Error state
  if (loadError) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh]">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{loadError}</p>
          <p className="text-slate-500 text-sm mb-4">
            Ensure the analytics RPC functions are created in Supabase. See <code className="bg-slate-800 px-1 rounded">supabase-analytics-functions.sql</code>.
          </p>
          <button type="button" onClick={loadData} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-500 disabled:opacity-50">Retry</button>
        </div>
      </div>
    )
  }

  // Loading skeleton
  if (!data) {
    return (
      <div className="min-h-full bg-slate-950 p-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="animate-pulse bg-slate-800 rounded-lg h-12 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="animate-pulse bg-slate-800 rounded-lg h-24" />)}
          </div>
          <div className="animate-pulse bg-slate-800 rounded-lg h-64" />
          <div className="animate-pulse bg-slate-800 rounded-lg h-48" />
        </div>
      </div>
    )
  }

  const { clientRevenue, paymentTerms, overdueAging } = data
  const maxBilled = Math.max(...clientRevenue.map((r) => r.total_billed || 0), 1)

  // KPI summaries
  const totalAR = clientRevenue.reduce((s, r) => s + (r.total_billed || 0), 0)
  const totalOutstanding = paymentTerms.reduce((s, r) => s + (r.outstanding_balance || 0), 0)
  const totalOverdue = overdueAging.reduce((s, r) => s + (r.amount || 0), 0)
  const activeClients = clientRevenue.length

  return (
    <div className="min-h-full bg-slate-950 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Toolbar */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-300">Cross-Dashboard Analytics</span>
              {lastUpdated && <span className="text-slate-500 text-xs">Last updated: {lastUpdated.toLocaleTimeString()}</span>}
            </div>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-emerald-400 bg-slate-800 border border-slate-600 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <KPIRow items={[
          { label: 'Total Billed (AR)', value: fmtCurrency(totalAR), color: 'text-emerald-400' },
          { label: 'Outstanding Balance', value: fmtCurrency(totalOutstanding), color: 'text-amber-400' },
          { label: 'Active Clients', value: String(activeClients), color: 'text-sky-400' },
          { label: 'Total Overdue', value: fmtCurrency(totalOverdue), color: 'text-rose-400' },
        ]} />

        <div className="space-y-5">

          {/* ─── 1. Client Revenue Breakdown ─────────────────────────── */}
          <SectionCard title="Client Revenue Breakdown" subtitle="Active clients (billed in the last 2 months)" accent="emerald">
            <DataTable
              columns={[
                { key: 'client', label: 'Client' },
                { key: 'invoice_count', label: 'Invoices', align: 'right', render: (v) => v },
                { key: 'total_billed', label: 'Total Billed', align: 'right', render: (v) => fmtCurrency(v) },
                { key: 'avg_invoice_size', label: 'Avg Size', align: 'right', render: (v) => fmtCurrency(v) },
                { key: 'largest_invoice', label: 'Largest', align: 'right', render: (v) => fmtCurrency(v) },
                { key: '_bar', label: '', render: (_, row) => <InlineBar value={row.total_billed} max={maxBilled} /> },
              ]}
              rows={clientRevenue}
            />
          </SectionCard>

          {/* ─── 7. Overdue Invoices Aging ────────────────────────────── */}
          <SectionCard title="Overdue Invoices Aging" subtitle="Invoices past due date, sorted by days overdue" accent="rose">
            <DataTable
              columns={[
                { key: 'client', label: 'Client' },
                { key: 'invoice_number', label: 'Invoice #' },
                { key: 'amount', label: 'Amount', align: 'right', render: (v) => fmtCurrency(v) },
                { key: 'due_date', label: 'Due Date', render: (v) => fmtDate(v) },
                { key: 'days_overdue', label: 'Days Overdue', align: 'right',
                  className: (row) => {
                    if (row.days_overdue > 30) return 'text-rose-400 font-semibold'
                    if (row.days_overdue > 14) return 'text-amber-400'
                    return 'text-slate-300'
                  },
                  render: (v) => `${v} days`
                },
              ]}
              rows={overdueAging}
              emptyMessage="No overdue invoices — great!"
            />
          </SectionCard>

          {/* ─── 2. Payment Terms & Outstanding ──────────────────────── */}
          <SectionCard title="Payment Terms & Outstanding Balance" subtitle="Agreed terms vs actual, outstanding by client" accent="amber">
            <DataTable
              columns={[
                { key: 'client', label: 'Client' },
                { key: 'agreed_terms_days', label: 'Agreed Terms', align: 'right', render: (v) => v ? `${fmtNum(v, 0)} days` : '—' },
                { key: 'actual_days_to_due', label: 'Actual Avg', align: 'right', render: (v) => v ? `${fmtNum(v)} days` : '—' },
                { key: 'still_outstanding', label: 'Outstanding', align: 'right' },
                { key: 'outstanding_balance', label: 'Balance', align: 'right',
                  className: (row) => row.outstanding_balance > 0 ? 'text-amber-400 font-semibold' : 'text-slate-300',
                  render: (v) => fmtCurrency(v)
                },
              ]}
              rows={paymentTerms}
            />
          </SectionCard>

        </div>
      </div>
    </div>
  )
}
