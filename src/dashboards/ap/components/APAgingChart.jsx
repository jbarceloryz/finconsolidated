import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const BUCKET_COLORS = ['#34d399', '#fbbf24', '#fb923c', '#fb7185', '#ef4444']
const BUCKET_LABELS = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days']

const formatCurrency = (value) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-slate-200 mb-1">{label}</p>
      <p className="text-sm text-emerald-400">
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(payload[0].value)}
      </p>
    </div>
  )
}

export default function APAgingChart({ invoices }) {
  const agingData = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0]

    if (!invoices || !invoices.length) {
      return BUCKET_LABELS.map((label, i) => ({ label, amount: 0 }))
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    invoices.forEach((inv) => {
      // Only count unpaid invoices
      if (inv.status === 'PAID' || inv.status === 'VOID') return
      if (!inv.dueDate) return

      const due = new Date(inv.dueDate)
      due.setHours(0, 0, 0, 0)
      const diffMs = today.getTime() - due.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays <= 0) buckets[0] += inv.amount       // Current (not yet due)
      else if (diffDays <= 30) buckets[1] += inv.amount  // 1-30 days
      else if (diffDays <= 60) buckets[2] += inv.amount  // 31-60 days
      else if (diffDays <= 90) buckets[3] += inv.amount  // 61-90 days
      else buckets[4] += inv.amount                       // 90+ days
    })

    return BUCKET_LABELS.map((label, i) => ({ label, amount: buckets[i] }))
  }, [invoices])

  const hasData = agingData.some((d) => d.amount > 0)

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-lg shadow-sm p-6 mb-4">
      <h2 className="font-display text-xl font-semibold text-slate-200 mb-4">Aging Summary</h2>
      {!hasData ? (
        <p className="text-slate-500 text-sm text-center py-8">No outstanding invoices to display</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={agingData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
            <YAxis tickFormatter={formatCurrency} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#475569' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {agingData.map((_, i) => (
                <Cell key={i} fill={BUCKET_COLORS[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
