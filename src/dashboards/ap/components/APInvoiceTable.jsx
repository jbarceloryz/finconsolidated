import React, { useMemo, useState } from 'react'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

const formatDate = (date) => {
  if (!date) return '—'
  const d = new Date(date)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const y = d.getFullYear()
  return `${m}/${day}/${y}`
}

const STATUS_BADGES = {
  PENDING: { label: 'Pending', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  APPROVED: { label: 'Approved', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  PAID: { label: 'Paid', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  OVERDUE: { label: 'Overdue', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  VOID: { label: 'Void', color: 'bg-slate-600/50 text-slate-400 border-slate-500' },
}

export default function APInvoiceTable({ invoices, onEdit, onDelete, onMarkPaid }) {
  const [sortBy, setSortBy] = useState('dueDate')
  const [sortOrder, setSortOrder] = useState('asc')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredAndSorted = useMemo(() => {
    if (!invoices || !invoices.length) return []

    let filtered = [...invoices]

    if (statusFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.status === statusFilter)
    }

    filtered.sort((a, b) => {
      let aVal, bVal
      switch (sortBy) {
        case 'company': aVal = a.company.toLowerCase(); bVal = b.company.toLowerCase(); break
        case 'vendor': aVal = a.vendor.toLowerCase(); bVal = b.vendor.toLowerCase(); break
        case 'amount': aVal = a.amount; bVal = b.amount; break
        case 'dueDate': aVal = a.dueDate ? a.dueDate.getTime() : 0; bVal = b.dueDate ? b.dueDate.getTime() : 0; break
        case 'status': aVal = a.status; bVal = b.status; break
        default: return 0
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [invoices, sortBy, sortOrder, statusFilter])

  const handleSort = (column) => {
    if (sortBy === column) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    else { setSortBy(column); setSortOrder('asc') }
  }

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span className="text-slate-500">&#x21C5;</span>
    return sortOrder === 'asc' ? <span className="text-slate-400">&#x2191;</span> : <span className="text-slate-400">&#x2193;</span>
  }

  const getStatusBadge = (status) => {
    const info = STATUS_BADGES[status] || { label: status, color: 'bg-slate-600/50 text-slate-300 border-slate-500' }
    return <span className={`px-2 py-1 rounded-md text-xs font-medium border ${info.color}`}>{info.label}</span>
  }

  const isPastDue = (inv) => {
    if (inv.status === 'PAID' || inv.status === 'VOID' || inv.status === 'OVERDUE') return false
    if (!inv.dueDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return inv.dueDate < today
  }

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-slate-200">AP Invoices</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-800 text-slate-200"
        >
          <option value="all">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="VOID">Void</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-3 text-sm font-semibold text-slate-400 cursor-pointer hover:bg-slate-800/80" onClick={() => handleSort('company')}>
                <div className="flex items-center gap-1">Co. <SortIcon column="company" /></div>
              </th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-slate-400 cursor-pointer hover:bg-slate-800/80" onClick={() => handleSort('vendor')}>
                <div className="flex items-center gap-1">Vendor <SortIcon column="vendor" /></div>
              </th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-slate-400">Inv #</th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-slate-400">Description</th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-slate-400">Category</th>
              <th className="text-right py-3 px-3 text-sm font-semibold text-slate-400 cursor-pointer hover:bg-slate-800/80" onClick={() => handleSort('amount')}>
                <div className="flex items-center justify-end gap-1">Amount <SortIcon column="amount" /></div>
              </th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-slate-400 cursor-pointer hover:bg-slate-800/80" onClick={() => handleSort('dueDate')}>
                <div className="flex items-center gap-1">Due Date <SortIcon column="dueDate" /></div>
              </th>
              <th className="text-left py-3 px-3 text-sm font-semibold text-slate-400 cursor-pointer hover:bg-slate-800/80" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
              </th>
              <th className="text-center py-3 px-3 text-sm font-semibold text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-slate-500">No invoices found</td>
              </tr>
            ) : (
              filteredAndSorted.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-700/80 hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3 text-sm text-slate-300">{inv.company}</td>
                  <td className="py-3 px-3 text-sm text-slate-200 font-medium">{inv.vendor}</td>
                  <td className="py-3 px-3 text-sm text-slate-400">{inv.invoiceNumber || '—'}</td>
                  <td className="py-3 px-3 text-sm text-slate-400 max-w-[200px] truncate">{inv.description || '—'}</td>
                  <td className="py-3 px-3 text-sm text-slate-400">{inv.category || '—'}</td>
                  <td className="py-3 px-3 text-sm text-slate-200 font-semibold text-right">{formatCurrency(inv.amount)}</td>
                  <td className="py-3 px-3 text-sm text-slate-400">{formatDate(inv.dueDate)}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(inv.status)}
                      {isPastDue(inv) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20">PAST DUE</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(inv)}
                        className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {(inv.status === 'PENDING' || inv.status === 'APPROVED') && (
                        <button
                          onClick={() => onMarkPaid(inv)}
                          className="p-1.5 rounded hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Mark as Paid"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete invoice from ${inv.vendor}?`)) onDelete(inv.id)
                        }}
                        className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-slate-500">
        Showing {filteredAndSorted.length} of {invoices?.length || 0} invoices
      </div>
    </div>
  )
}
