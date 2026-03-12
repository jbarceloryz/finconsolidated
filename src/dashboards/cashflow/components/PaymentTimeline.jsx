import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { processCSVData, groupInvoicesByDay } from '../utils/processCSV';
import CustomTooltip from './CustomTooltip';

const PaymentTimeline = ({ csvData, currentMonth = null, currentYear = null, onMonthChange = null, onYearChange = null }) => {
  const chartData = useMemo(() => {
    if (!csvData) return [];
    const invoices = processCSVData(csvData);
    const today = new Date();
    const month = currentMonth !== null && currentMonth !== undefined ? currentMonth : today.getMonth();
    const year = currentYear !== null && currentYear !== undefined ? currentYear : today.getFullYear();
    return groupInvoicesByDay(invoices, month, year);
  }, [csvData, currentMonth, currentYear]);

  const today = new Date();
  const currentDay = today.getDate();
  const selectedMonth = currentMonth !== null && currentMonth !== undefined ? currentMonth : today.getMonth();
  const selectedYear = currentYear !== null && currentYear !== undefined ? currentYear : today.getFullYear();
  const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear();

  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const handlePreviousMonth = () => {
    const currentDate = new Date(selectedYear, selectedMonth, 1);
    currentDate.setMonth(currentDate.getMonth() - 1);
    if (onMonthChange && onYearChange) {
      onMonthChange(currentDate.getMonth());
      onYearChange(currentDate.getFullYear());
    }
  };

  const handleNextMonth = () => {
    const currentDate = new Date(selectedYear, selectedMonth, 1);
    currentDate.setMonth(currentDate.getMonth() + 1);
    if (onMonthChange && onYearChange) {
      onMonthChange(currentDate.getMonth());
      onYearChange(currentDate.getFullYear());
    }
  };

  return (
    <div className="w-full h-full p-6 bg-slate-900/60 border border-slate-800 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold text-slate-200">Payment Timeline</h2>
        <div className="flex items-center gap-2">
          <button onClick={handlePreviousMonth} className="px-4 py-2 text-sm font-medium text-emerald-400 bg-slate-800 border border-slate-600 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900">
            ← Previous Month
          </button>
          <button onClick={handleNextMonth} className="px-4 py-2 text-sm font-medium text-emerald-400 bg-slate-800 border border-slate-600 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900">
            Next Month →
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} barCategoryGap="10%">
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} interval={2} tickFormatter={(value) => value} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatCurrency} />
          <Tooltip content={<CustomTooltip currentMonth={selectedMonth} currentYear={selectedYear} />} />
          {isCurrentMonth && (
            <ReferenceLine x={currentDay} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'TODAY', position: 'top', fill: '#10b981', fontSize: 12 }} />
          )}
          <Bar dataKey="paid" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
          <Bar dataKey="overdue" stackId="a" fill="#fb7185" radius={[0, 0, 0, 0]} />
          <Bar dataKey="upcoming" stackId="a" fill="#64748b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-6">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-400"></div><span className="text-sm text-slate-400">Paid</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-rose-400"></div><span className="text-sm text-slate-400">Overdue</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-slate-500"></div><span className="text-sm text-slate-400">Upcoming</span></div>
      </div>
    </div>
  );
};

export default PaymentTimeline;
