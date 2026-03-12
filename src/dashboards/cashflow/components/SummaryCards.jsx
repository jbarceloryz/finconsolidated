import React, { useMemo } from 'react';
import { processCSVData, normalizeStatus } from '../utils/processCSV';

const SummaryCards = ({ csvData, currentMonth = null, currentYear = null }) => {
  const summary = useMemo(() => {
    if (!csvData) return { paid: 0, overdue: 0, upcoming: 0, total: 0 };
    const invoices = processCSVData(csvData);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedMonth = currentMonth !== null && currentMonth !== undefined ? currentMonth : today.getMonth();
    const selectedYear = currentYear !== null && currentYear !== undefined ? currentYear : today.getFullYear();
    let paid = 0, overdue = 0, upcoming = 0;
    invoices.forEach(invoice => {
      const normalizedStatus = normalizeStatus(invoice.status);
      const isPaid = normalizedStatus === 'PAID' || invoice.statusCategory === 'paid';
      if (isPaid) {
        const dueDate = new Date(invoice.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate.getMonth() === selectedMonth && dueDate.getFullYear() === selectedYear) paid += invoice.amount;
        return;
      }
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const isOverdue = normalizedStatus === 'OVERDUE' || normalizedStatus.replace(/\s+/g, '') === 'OVERDUE' || invoice.statusCategory === 'overdue';
      if (isOverdue) { overdue += invoice.amount; return; }
      if (dueDate.getMonth() !== selectedMonth || dueDate.getFullYear() !== selectedYear) return;
      upcoming += invoice.amount;
    });
    return { paid, overdue, upcoming, total: paid + overdue + upcoming };
  }, [csvData, currentMonth, currentYear]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const cards = [
    { label: 'Total Paid', value: summary.paid, color: 'bg-slate-800/60 border-emerald-500/30', textColor: 'text-slate-400', valueColor: 'text-emerald-400' },
    { label: 'Overdue', value: summary.overdue, color: 'bg-slate-800/60 border-rose-500/30', textColor: 'text-slate-400', valueColor: 'text-rose-400' },
    { label: 'Upcoming', value: summary.upcoming, color: 'bg-slate-800/60 border-slate-600', textColor: 'text-slate-400', valueColor: 'text-slate-200' },
    { label: 'Total', value: summary.total, color: 'bg-slate-800/60 border-sky-500/30', textColor: 'text-slate-400', valueColor: 'text-sky-300' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div key={index} className={`${card.color} border rounded-lg p-4 shadow-sm`}>
          <div className={`text-sm font-medium ${card.textColor} mb-1`}>{card.label}</div>
          <div className={`text-2xl font-semibold ${card.valueColor}`}>{formatCurrency(card.value)}</div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
