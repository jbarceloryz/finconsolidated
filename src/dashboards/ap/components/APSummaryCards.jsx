import React, { useMemo } from 'react'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

export default function APSummaryCards({ invoices }) {
  const summary = useMemo(() => {
    if (!invoices || !invoices.length) return { outstanding: 0, overdue: 0, paidThisMonth: 0, dueSoon: 0 }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const in7Days = new Date(today)
    in7Days.setDate(in7Days.getDate() + 7)

    let outstanding = 0
    let overdue = 0
    let paidThisMonth = 0
    let dueSoon = 0

    invoices.forEach((inv) => {
      const isPending = inv.status === 'PENDING' || inv.status === 'APPROVED'
      const isOverdue = inv.status === 'OVERDUE' || (isPending && inv.dueDate && inv.dueDate < today)

      if (isOverdue) {
        overdue += inv.amount
        outstanding += inv.amount
      } else if (isPending) {
        outstanding += inv.amount
        if (inv.dueDate && inv.dueDate <= in7Days) {
          dueSoon += inv.amount
        }
      }

      if (inv.status === 'PAID' && inv.paidDate) {
        if (inv.paidDate.getMonth() === currentMonth && inv.paidDate.getFullYear() === currentYear) {
          paidThisMonth += inv.amount
        }
      }
    })

    return { outstanding, overdue, paidThisMonth, dueSoon }
  }, [invoices])

  const cards = [
    { label: 'Total Outstanding', value: summary.outstanding, color: 'border-sky-500/30', valueColor: 'text-sky-300' },
    { label: 'Overdue', value: summary.overdue, color: 'border-rose-500/30', valueColor: 'text-rose-400' },
    { label: 'Paid This Month', value: summary.paidThisMonth, color: 'border-emerald-500/30', valueColor: 'text-emerald-400' },
    { label: 'Due Next 7 Days', value: summary.dueSoon, color: 'border-amber-500/30', valueColor: 'text-amber-400' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => (
        <div key={i} className={`bg-slate-800/60 ${card.color} border rounded-lg p-4 shadow-sm`}>
          <div className="text-sm font-medium text-slate-400 mb-1">{card.label}</div>
          <div className={`text-2xl font-semibold ${card.valueColor}`}>{formatCurrency(card.value)}</div>
        </div>
      ))}
    </div>
  )
}
