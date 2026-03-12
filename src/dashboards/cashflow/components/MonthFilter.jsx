import React from 'react';

const MonthFilter = ({ selectedMonth, selectedYear, onMonthChange, onYearChange }) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - 2; i <= currentYear + 2; i++) years.push(i);

  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-400">Month:</label>
        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(parseInt(e.target.value))}
          className="px-3 py-1.5 text-sm border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-800 text-slate-200"
        >
          {months.map((month, index) => (
            <option key={index} value={index}>{month}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-400">Year:</label>
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(parseInt(e.target.value))}
          className="px-3 py-1.5 text-sm border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-800 text-slate-200"
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default MonthFilter;
