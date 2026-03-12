import React, { useState, useMemo } from 'react';
import { processCSVData, normalizeStatus } from '../utils/processCSV';

const CashFlowSimulator = ({ csvData }) => {
  const [currentBalance, setCurrentBalance] = useState(0);
  const [balanceInputValue, setBalanceInputValue] = useState('');
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'daily'
  const [hoveredRow, setHoveredRow] = useState(null);
  const [outgoingPayments, setOutgoingPayments] = useState([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: '', date: '', description: '' });

  const projections = useMemo(() => {
    if (!csvData) return [];

    const invoices = processCSVData(csvData);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all invoices that affect cash flow
    const cashFlowEvents = [];

    // Add outgoing payments
    outgoingPayments.forEach(payment => {
      if (payment.amount && payment.date) {
        // Parse date string (YYYY-MM-DD) to avoid timezone issues
        const [year, month, day] = payment.date.split('-').map(Number);
        const paymentDate = new Date(year, month - 1, day);
        paymentDate.setHours(0, 0, 0, 0);
        cashFlowEvents.push({
          date: paymentDate,
          amount: -Math.abs(parseFloat(payment.amount) || 0), // Negative amount
          type: 'expense',
          description: payment.description || 'Outgoing Payment',
          status: 'OUTGOING',
        });
      }
    });

    invoices.forEach(invoice => {
      // Use shared normalizer so CSV PAID/OVERDUE always match (same as SummaryCards / timeline)
      const normalizedStatus = normalizeStatus(invoice.status);
      const isPaid = normalizedStatus === 'PAID' || invoice.statusCategory === 'paid';
      
      if (isPaid) {
        return; // Don't include paid invoices in projections - they're already in current balance
      }
      
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      // Trust CSV OVERDUE (same as PAID) so dashboard and simulator stay in sync
      const isOverdue = normalizedStatus === 'OVERDUE' || normalizedStatus.replace(/\s+/g, '') === 'OVERDUE' || invoice.statusCategory === 'overdue';
      if (isOverdue) {
        // Overdue - treat as if collected 7 days from now
        const collectionDate = new Date(today);
        collectionDate.setDate(today.getDate() + 7);
        cashFlowEvents.push({
          date: collectionDate,
          amount: invoice.amount,
          type: 'income',
          client: invoice.client,
          status: 'OVERDUE',
        });
      } else if (dueDate.getTime() >= today.getTime()) {
        // Upcoming - include all invoices due today or later (SENT and DRAFT)
        cashFlowEvents.push({
          date: dueDate,
          amount: invoice.amount,
          type: 'income',
          client: invoice.client,
          status: 'UPCOMING',
        });
      }
    });

    // Sort by date
    cashFlowEvents.sort((a, b) => a.date - b.date);

    // Group by week or day
    const grouped = {};
    const startDate = new Date(today);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (viewMode === 'weekly' ? 90 : 30)); // 90 days for weekly, 30 for daily

    cashFlowEvents.forEach(event => {
      if (event.date < startDate || event.date > endDate) return;

      let key;
      let weekStartDate;
      if (viewMode === 'weekly') {
        // Group by week (Monday to Sunday)
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        const dayOfWeek = eventDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        // Calculate days to subtract to get to Monday
        // Sunday (0) -> go back 6 days to Monday
        // Monday (1) -> stay (0 days back)
        // Tuesday (2) -> go back 1 day
        // etc.
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStartDate = new Date(eventDate);
        weekStartDate.setDate(eventDate.getDate() - daysToMonday);
        // Create key from local date to avoid timezone issues
        const year = weekStartDate.getFullYear();
        const month = String(weekStartDate.getMonth() + 1).padStart(2, '0');
        const day = String(weekStartDate.getDate()).padStart(2, '0');
        key = `${year}-${month}-${day}`;
      } else {
        // Group by day
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        const year = eventDate.getFullYear();
        const month = String(eventDate.getMonth() + 1).padStart(2, '0');
        const day = String(eventDate.getDate()).padStart(2, '0');
        key = `${year}-${month}-${day}`;
        weekStartDate = eventDate;
      }

      if (!grouped[key]) {
        grouped[key] = {
          date: viewMode === 'weekly' ? new Date(weekStartDate) : new Date(weekStartDate),
          total: 0,
          invoices: [],
        };
      }

      grouped[key].total += event.amount;
      grouped[key].invoices.push(event);
    });

    // Convert to array and calculate running balance
    const sortedPeriods = Object.values(grouped).sort((a, b) => a.date - b.date);
    
    // Separate income and expenses
    const projections = sortedPeriods.map((period) => {
      let income = 0;
      let expenses = 0;
      const incomeInvoices = [];
      const expenseInvoices = [];
      
      period.invoices.forEach(inv => {
        if (inv.type === 'expense') {
          expenses += Math.abs(inv.amount);
          expenseInvoices.push(inv);
        } else {
          income += inv.amount;
          incomeInvoices.push(inv);
        }
      });
      
      return {
        ...period,
        income: income,
        expenses: expenses,
        incomeInvoices: incomeInvoices,
        expenseInvoices: expenseInvoices,
        net: income - expenses,
      };
    });
    
    // Calculate running balance
    let runningBalance = Number(currentBalance) || 0;
    const projectionsWithBalance = projections.map((projection) => {
      runningBalance = runningBalance + projection.net;
      return {
        ...projection,
        projectedBalance: Number(runningBalance.toFixed(2)),
      };
    });

    return projectionsWithBalance;
  }, [csvData, currentBalance, viewMode, outgoingPayments]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyInput = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date) => {
    const d = new Date(date);
    if (viewMode === 'weekly') {
      // d is already the Monday of the week (from grouping logic)
      const weekEnd = new Date(d);
      weekEnd.setDate(d.getDate() + 6); // Add 6 days to get Sunday
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return d.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Cash Flow Simulator</h2>
      
      {/* Controls Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Bank Balance
          </label>
          <input
            type="text"
            value={balanceInputValue || (currentBalance ? formatCurrencyInput(currentBalance) : '')}
            onChange={(e) => {
              const inputValue = e.target.value;
              setBalanceInputValue(inputValue);
              // Remove currency formatting and parse the number
              const rawValue = inputValue.replace(/[^0-9.-]/g, '');
              const numValue = parseFloat(rawValue) || 0;
              setCurrentBalance(numValue);
            }}
            onFocus={(e) => {
              // Show raw number when focused for easier editing
              if (currentBalance) {
                setBalanceInputValue(currentBalance.toString());
              }
            }}
            onBlur={(e) => {
              // Format as currency when focus is lost
              setBalanceInputValue('');
              // The value will be formatted from currentBalance on next render
            }}
            placeholder="$0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            View Mode
          </label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </div>
      </div>

      {/* Add Outgoing Payment Button */}
      <div className="mb-4">
        <button
          onClick={() => setShowAddPayment(!showAddPayment)}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          {showAddPayment ? 'Cancel' : '+ Add Outgoing Payment'}
        </button>
      </div>

      {/* Add Outgoing Payment Form */}
      {showAddPayment && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Outgoing Payment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={newPayment.date}
                onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={newPayment.description}
                onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                placeholder="e.g., Rent, Salary"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                if (newPayment.amount && newPayment.date) {
                  setOutgoingPayments([...outgoingPayments, { ...newPayment }]);
                  setNewPayment({ amount: '', date: '', description: '' });
                  setShowAddPayment(false);
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Add Payment
            </button>
            <button
              onClick={() => {
                setNewPayment({ amount: '', date: '', description: '' });
                setShowAddPayment(false);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Outgoing Payments List */}
      {outgoingPayments.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-red-700">Outgoing Payments</h3>
            <button
              onClick={() => setOutgoingPayments([])}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-1">
            {outgoingPayments.map((payment, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-red-700">
                  {payment.description || 'Outgoing Payment'} - {payment.date ? (() => {
                    const [year, month, day] = payment.date.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  })() : ''}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-red-800 font-semibold">
                    -{formatCurrency(Math.abs(parseFloat(payment.amount) || 0))}
                  </span>
                  <button
                    onClick={() => {
                      setOutgoingPayments(outgoingPayments.filter((_, i) => i !== idx));
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projections Table - always show so all upcoming/overdue invoices are visible */}
      <div className="mt-6 overflow-visible">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {viewMode === 'weekly' ? 'Weekly' : 'Daily'} Projections
        </h3>
          <div className="overflow-x-auto overflow-y-visible relative">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Period</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Income</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Expenses</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Balance</th>
                </tr>
              </thead>
              <tbody>
                {projections.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-4 text-center text-gray-500">
                      No projections available
                    </td>
                  </tr>
                ) : (
                  projections.map((projection, index) => (
                    <tr
                      key={index}
                      className={`border-b border-gray-100 ${
                        projection.projectedBalance < 0 ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-gray-700 font-medium">
                        {formatDate(projection.date)}
                      </td>
                      {/* Income Column */}
                      <td 
                        className="py-3 px-4 text-right font-semibold text-green-700 cursor-help relative"
                        onMouseEnter={() => setHoveredRow(index * 2)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {formatCurrency(projection.income)}
                        {hoveredRow === index * 2 && projection.incomeInvoices.length > 0 && (
                          <div className="absolute right-0 top-full mt-1 z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl max-w-xs min-w-[200px]">
                              <div className="font-semibold mb-2 text-white">
                                {viewMode === 'weekly' ? 'Week' : 'Day'} Income Details:
                              </div>
                              <div className="space-y-1">
                                {projection.incomeInvoices.map((inv, idx) => (
                                  <div key={idx} className="flex justify-between items-start">
                                    <span className="text-gray-200 flex-1">{inv.client}</span>
                                    <span className="text-white font-medium ml-2">
                                      {formatCurrency(inv.amount)}
                                      {inv.status === 'OVERDUE' && (
                                        <span className="text-red-300 ml-1 text-[10px]">(Overdue)</span>
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between font-semibold">
                                <span>Total:</span>
                                <span className="text-green-300">{formatCurrency(projection.income)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      {/* Expenses Column */}
                      <td 
                        className="py-3 px-4 text-right font-semibold text-red-700 cursor-help relative"
                        onMouseEnter={() => setHoveredRow(index * 2 + 1)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {projection.expenses > 0 ? `-${formatCurrency(projection.expenses)}` : formatCurrency(0)}
                        {hoveredRow === index * 2 + 1 && projection.expenseInvoices.length > 0 && (
                          <div className="absolute right-0 top-full mt-1 z-50">
                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl max-w-xs min-w-[200px]">
                              <div className="font-semibold mb-2 text-white">
                                {viewMode === 'weekly' ? 'Week' : 'Day'} Expense Details:
                              </div>
                              <div className="space-y-1">
                                {projection.expenseInvoices.map((inv, idx) => (
                                  <div key={idx} className="flex justify-between items-start">
                                    <span className="text-gray-200 flex-1">{inv.description || 'Outgoing Payment'}</span>
                                    <span className="text-red-300 font-medium ml-2">
                                      -{formatCurrency(Math.abs(inv.amount))}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between font-semibold">
                                <span>Total:</span>
                                <span className="text-red-300">-{formatCurrency(projection.expenses)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold text-lg ${
                        projection.projectedBalance < 0 ? 'text-red-700' : 'text-gray-900'
                      }`}>
                        {formatCurrency(projection.projectedBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Stats */}
          {projections.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Total Projected Income</div>
                  <div className="text-lg font-semibold text-green-700">
                    {formatCurrency(projections.reduce((sum, p) => sum + p.income, 0))}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Final Projected Balance</div>
                  <div className={`text-lg font-semibold ${
                    projections[projections.length - 1]?.projectedBalance < 0 
                      ? 'text-red-700' 
                      : 'text-gray-900'
                  }`}>
                    {formatCurrency(projections[projections.length - 1]?.projectedBalance || currentBalance)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      {!currentBalance && (
        <p className="mt-2 text-sm text-gray-500">
          Enter your current bank balance above to see running balance. All upcoming and overdue invoices are included below.
        </p>
      )}

      {/* Info Note */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          <strong>Note:</strong> Overdue invoices are projected to be collected 7 days from today. 
          Paid invoices are excluded from projections since they're already included in your current balance.
        </p>
      </div>
    </div>
  );
};

export default CashFlowSimulator;

