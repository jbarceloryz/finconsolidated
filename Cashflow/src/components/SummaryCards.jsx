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
    
    let paid = 0;
    let overdue = 0;
    let upcoming = 0;
    
    invoices.forEach(invoice => {
      // Use shared normalizer so CSV PAID/OVERDUE with BOM or invisible chars always match
      const normalizedStatus = normalizeStatus(invoice.status);
      const isPaid = normalizedStatus === 'PAID' || invoice.statusCategory === 'paid';
      
      // PAID invoices should ONLY be counted as paid, never as overdue or upcoming
      if (isPaid) {
        const dueDate = new Date(invoice.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate.getMonth() === selectedMonth && dueDate.getFullYear() === selectedYear) {
          paid += invoice.amount;
        }
        return; // Skip further processing - PAID invoices can NEVER be overdue or upcoming
      }
      
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      // Trust CSV OVERDUE only - do not infer overdue from due date; CSV status is source of truth
      const isOverdue = normalizedStatus === 'OVERDUE' || normalizedStatus.replace(/\s+/g, '') === 'OVERDUE' || invoice.statusCategory === 'overdue';
      if (isOverdue) {
        overdue += invoice.amount;
        return;
      }
      
      // Upcoming: CSV SENT/DRAFT etc., only for selected month/year (by due date)
      if (dueDate.getMonth() !== selectedMonth || dueDate.getFullYear() !== selectedYear) {
        return;
      }
      upcoming += invoice.amount;
    });
    
    return {
      paid,
      overdue,
      upcoming,
      total: paid + overdue + upcoming,
    };
  }, [csvData, currentMonth, currentYear]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const cards = [
    {
      label: 'Total Paid',
      value: summary.paid,
      color: 'bg-green-50 border-green-200',
      textColor: 'text-green-700',
      valueColor: 'text-green-900',
    },
    {
      label: 'Overdue',
      value: summary.overdue,
      color: 'bg-red-50 border-red-200',
      textColor: 'text-red-700',
      valueColor: 'text-red-900',
    },
    {
      label: 'Upcoming',
      value: summary.upcoming,
      color: 'bg-gray-50 border-gray-200',
      textColor: 'text-gray-700',
      valueColor: 'text-gray-900',
    },
    {
      label: 'Total',
      value: summary.total,
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-700',
      valueColor: 'text-blue-900',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.color} border rounded-lg p-4 shadow-sm`}
        >
          <div className={`text-sm font-medium ${card.textColor} mb-1`}>
            {card.label}
          </div>
          <div className={`text-2xl font-semibold ${card.valueColor}`}>
            {formatCurrency(card.value)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;

