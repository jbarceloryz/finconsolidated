import React, { useMemo, useState } from 'react';
import { processCSVData, normalizeStatus } from '../utils/processCSV';

const InvoiceTable = ({ invoices: invoicesProp, csvData, currentMonth = null, currentYear = null }) => {
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('all');

  const allInvoices = invoicesProp ?? (csvData ? processCSVData(csvData) : [])
  const invoices = useMemo(() => {
    if (!allInvoices.length) return [];
    const today = new Date();
    const selectedMonth = currentMonth !== null && currentMonth !== undefined ? currentMonth : today.getMonth();
    const selectedYear = currentYear !== null && currentYear !== undefined ? currentYear : today.getFullYear();
    return allInvoices.filter(invoice => {
      const dueDate = new Date(invoice.dueDate);
      return dueDate.getMonth() === selectedMonth && dueDate.getFullYear() === selectedYear;
    });
  }, [allInvoices, currentMonth, currentYear]);

  const filteredAndSorted = useMemo(() => {
    let filtered = [...invoices];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => {
        const s = normalizeStatus(inv.status);
        if (statusFilter === 'paid') return s === 'PAID';
        if (statusFilter === 'overdue') return s === 'OVERDUE';
        if (statusFilter === 'upcoming') return s !== 'PAID' && s !== 'OVERDUE';
        return true;
      });
    }
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'client': aVal = a.client.toLowerCase(); bVal = b.client.toLowerCase(); break;
        case 'dueDate': aVal = new Date(a.dueDate).getTime(); bVal = new Date(b.dueDate).getTime(); break;
        case 'amount': aVal = a.amount; bVal = b.amount; break;
        case 'status': aVal = a.status; bVal = b.status; break;
        default: return 0;
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [invoices, sortBy, sortOrder, statusFilter]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const getStatusBadge = (status) => {
    const normalized = normalizeStatus(status);
    const statusMap = {
      PAID: { label: 'Paid', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
      OVERDUE: { label: 'Overdue', color: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
      SENT: { label: 'Upcoming', color: 'bg-slate-600/50 text-slate-300 border border-slate-500' },
      DRAFT: { label: 'Draft', color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
    };
    const statusInfo = statusMap[normalized] || { label: status || normalized, color: 'bg-slate-600/50 text-slate-300 border border-slate-500' };
    return <span className={`px-2 py-1 rounded-md text-xs font-medium border ${statusInfo.color}`}>{statusInfo.label}</span>;
  };

  const handleSort = (column) => {
    if (sortBy === column) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortOrder('asc'); }
  };
  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span className="text-slate-500">↕</span>;
    return sortOrder === 'asc' ? <span className="text-slate-400">↑</span> : <span className="text-slate-400">↓</span>;
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-slate-200">Invoices</h2>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-800 text-slate-200">
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="upcoming">Upcoming</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 cursor-pointer hover:bg-slate-800/80" onClick={() => handleSort('client')}><div className="flex items-center gap-2">Client <SortIcon column="client" /></div></th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 cursor-pointer hover:bg-slate-800/80" onClick={() => handleSort('dueDate')}><div className="flex items-center gap-2">Due Date <SortIcon column="dueDate" /></div></th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400 cursor-pointer hover:bg-slate-800/80" onClick={() => handleSort('amount')}><div className="flex items-center justify-end gap-2">Amount <SortIcon column="amount" /></div></th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400 cursor-pointer hover:bg-slate-800/80" onClick={() => handleSort('status')}><div className="flex items-center gap-2">Status <SortIcon column="status" /></div></th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr><td colSpan="4" className="py-8 text-center text-slate-500">No invoices found</td></tr>
            ) : (
              filteredAndSorted.map((invoice, index) => (
                <tr key={index} className="border-b border-slate-700/80 hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 text-sm text-slate-200 font-medium">{invoice.client}</td>
                  <td className="py-3 px-4 text-sm text-slate-400">{formatDate(invoice.dueDate)}</td>
                  <td className="py-3 px-4 text-sm text-slate-200 font-semibold text-right">{formatCurrency(invoice.amount)}</td>
                  <td className="py-3 px-4">{getStatusBadge(invoice.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-sm text-slate-500">Showing {filteredAndSorted.length} of {invoices.length} invoices</div>
    </div>
  );
};

export default InvoiceTable;
