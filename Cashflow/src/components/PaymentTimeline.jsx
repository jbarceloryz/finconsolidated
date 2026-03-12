import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { processCSVData, groupInvoicesByDay } from '../utils/processCSV';
import CustomTooltip from './CustomTooltip';

const PaymentTimeline = ({ csvData, currentMonth = null, currentYear = null, onMonthChange = null, onYearChange = null }) => {
  const chartData = useMemo(() => {
    if (!csvData) return [];
    const invoices = processCSVData(csvData);
    const today = new Date();
    const month = currentMonth !== null && currentMonth !== undefined ? currentMonth : today.getMonth();
    const year = currentYear !== null && currentYear !== undefined ? currentYear : today.getFullYear();
    // Return all days - bars will only show for days with payments (value > 0)
    return groupInvoicesByDay(invoices, month, year);
  }, [csvData, currentMonth, currentYear]);

  const today = new Date();
  const currentDay = today.getDate();
  const selectedMonth = currentMonth !== null && currentMonth !== undefined ? currentMonth : today.getMonth();
  const selectedYear = currentYear !== null && currentYear !== undefined ? currentYear : today.getFullYear();
  const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear();

  // Format Y-axis values
  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };


  const handlePreviousMonth = () => {
    const currentDate = new Date(selectedYear || today.getFullYear(), selectedMonth !== null && selectedMonth !== undefined ? selectedMonth : today.getMonth(), 1);
    currentDate.setMonth(currentDate.getMonth() - 1);
    if (onMonthChange && onYearChange) {
      onMonthChange(currentDate.getMonth());
      onYearChange(currentDate.getFullYear());
    }
  };

  const handleNextMonth = () => {
    const currentDate = new Date(selectedYear || today.getFullYear(), selectedMonth !== null && selectedMonth !== undefined ? selectedMonth : today.getMonth(), 1);
    currentDate.setMonth(currentDate.getMonth() + 1);
    if (onMonthChange && onYearChange) {
      onMonthChange(currentDate.getMonth());
      onYearChange(currentDate.getFullYear());
    }
  };

  return (
    <div className="w-full h-full p-6 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Payment Timeline</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousMonth}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            ← Previous Month
          </button>
          <button
            onClick={handleNextMonth}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Next Month →
          </button>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          barCategoryGap="10%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            interval={2}
            tickFormatter={(value) => value}
          />
          
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={formatCurrency}
          />
          
          <Tooltip content={<CustomTooltip currentMonth={selectedMonth} currentYear={selectedYear} />} />
          
          {/* TODAY reference line */}
          {isCurrentMonth && (
            <ReferenceLine
              x={currentDay}
              stroke="#3b82f6"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ value: 'TODAY', position: 'top', fill: '#3b82f6', fontSize: 12 }}
            />
          )}
          
          {/* Stacked bars - order matters for stacking (bottom to top) */}
          {/* radius prop: [topLeft, topRight, bottomRight, bottomLeft] */}
          <Bar
            dataKey="paid"
            stackId="a"
            fill="#a7f3d0"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="overdue"
            stackId="a"
            fill="#fda4af"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="upcoming"
            stackId="a"
            fill="#e5e7eb"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#a7f3d0]"></div>
          <span className="text-sm text-gray-600">Paid</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#fda4af]"></div>
          <span className="text-sm text-gray-600">Overdue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#e5e7eb]"></div>
          <span className="text-sm text-gray-600">Upcoming</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentTimeline;

