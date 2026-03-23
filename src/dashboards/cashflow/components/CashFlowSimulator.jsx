import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { processCSVData, normalizeStatus } from '../utils/processCSV';
import { supabase } from '../../../lib/supabase';
import { fetchAPInvoices } from '../../../lib/apData';

const SAVE_DEBOUNCE_MS = 1500;

const CashFlowSimulator = ({ invoices: invoicesProp, csvData }) => {
  const [currentBalance, setCurrentBalance] = useState(0);
  const [balanceInputValue, setBalanceInputValue] = useState('');
  const [viewMode, setViewMode] = useState('weekly');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [outgoingPayments, setOutgoingPayments] = useState([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: '', date: '', description: '' });
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [loaded, setLoaded] = useState(false);
  const [apInvoices, setApInvoices] = useState([]);
  const saveTimer = useRef(null);

  // ── Load AP invoices (APPROVED + OVERDUE feed into simulator as outgoing) ──
  useEffect(() => {
    fetchAPInvoices()
      .then((data) => {
        if (data) {
          const active = data.filter(
            (inv) => inv.status === 'APPROVED' || inv.status === 'OVERDUE'
          );
          setApInvoices(active);
        }
      })
      .catch((err) => console.error('Failed to load AP invoices for simulator:', err));
  }, []);

  // ── Load settings from Supabase on mount ──
  useEffect(() => {
    if (!supabase) { setLoaded(true); return; }
    supabase
      .from('cashflow_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) { console.error('Failed to load cashflow settings:', error); }
        if (data) {
          setCurrentBalance(Number(data.current_balance) || 0);
          if (data.outgoing_payments && Array.isArray(data.outgoing_payments)) {
            setOutgoingPayments(data.outgoing_payments);
          }
        }
        setLoaded(true);
      });
  }, []);

  // ── Save helper ──
  const saveToSupabase = useCallback(async (balance, payments) => {
    if (!supabase) return;
    setSaveStatus('saving');
    const { error } = await supabase
      .from('cashflow_settings')
      .upsert({
        id: 1,
        current_balance: balance,
        outgoing_payments: payments,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    if (error) {
      console.error('Failed to save cashflow settings:', error);
      setSaveStatus('error');
    } else {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus((s) => s === 'saved' ? 'idle' : s), 2000);
    }
  }, []);

  // ── Debounced auto-save whenever balance or payments change ──
  useEffect(() => {
    if (!loaded) return; // Don't save on initial load
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToSupabase(currentBalance, outgoingPayments);
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(saveTimer.current);
  }, [currentBalance, outgoingPayments, loaded, saveToSupabase]);

  const invoices = invoicesProp ?? (csvData ? processCSVData(csvData) : [])
  const projections = useMemo(() => {
    if (!invoices.length) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cashFlowEvents = [];

    outgoingPayments.forEach(payment => {
      if (payment.amount && payment.date) {
        const [year, month, day] = payment.date.split('-').map(Number);
        const paymentDate = new Date(year, month - 1, day);
        paymentDate.setHours(0, 0, 0, 0);
        cashFlowEvents.push({
          date: paymentDate,
          amount: -Math.abs(parseFloat(payment.amount) || 0),
          type: 'expense',
          description: payment.description || 'Outgoing Payment',
          status: 'OUTGOING',
        });
      }
    });

    // ── AP invoices (APPROVED / OVERDUE) feed as outgoing payments ──
    apInvoices.forEach(apInv => {
      if (!apInv.amount || !apInv.dueDate) return;
      const dueDate = new Date(apInv.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const isOverdue = apInv.status === 'OVERDUE';
      // Overdue AP: project payment 7 days from today (mirror AR logic)
      const payDate = isOverdue ? (() => { const d = new Date(today); d.setDate(today.getDate() + 7); return d; })() : dueDate;
      cashFlowEvents.push({
        date: payDate,
        amount: -Math.abs(apInv.amount),
        type: 'expense',
        description: `AP: ${apInv.vendor || apInv.company}${apInv.description ? ' - ' + apInv.description : ''}`,
        status: isOverdue ? 'AP_OVERDUE' : 'AP',
        source: 'ap',
      });
    });

    invoices.forEach(invoice => {
      const normalizedStatus = normalizeStatus(invoice.status);
      const isPaid = normalizedStatus === 'PAID' || invoice.statusCategory === 'paid';
      if (isPaid) return;
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const isOverdue = normalizedStatus === 'OVERDUE' || normalizedStatus.replace(/\s+/g, '') === 'OVERDUE' || invoice.statusCategory === 'overdue';
      if (isOverdue) {
        const collectionDate = new Date(today);
        collectionDate.setDate(today.getDate() + 7);
        cashFlowEvents.push({ date: collectionDate, amount: invoice.amount, type: 'income', client: invoice.client, status: 'OVERDUE' });
      } else if (dueDate.getTime() >= today.getTime()) {
        cashFlowEvents.push({ date: dueDate, amount: invoice.amount, type: 'income', client: invoice.client, status: 'UPCOMING' });
      }
    });

    cashFlowEvents.sort((a, b) => a.date - b.date);
    const grouped = {};
    const startDate = new Date(today);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (viewMode === 'weekly' ? 90 : 30));

    cashFlowEvents.forEach(event => {
      if (event.date < startDate || event.date > endDate) return;
      let key, weekStartDate;
      if (viewMode === 'weekly') {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        const dayOfWeek = eventDate.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStartDate = new Date(eventDate);
        weekStartDate.setDate(eventDate.getDate() - daysToMonday);
        key = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, '0')}-${String(weekStartDate.getDate()).padStart(2, '0')}`;
      } else {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        weekStartDate = eventDate;
        key = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
      }
      if (!grouped[key]) {
        grouped[key] = { date: new Date(weekStartDate), total: 0, invoices: [] };
      }
      grouped[key].total += event.amount;
      grouped[key].invoices.push(event);
    });

    const sortedPeriods = Object.values(grouped).sort((a, b) => a.date - b.date);
    const projectionsList = sortedPeriods.map((period) => {
      let income = 0, expenses = 0;
      const incomeInvoices = [], expenseInvoices = [];
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
        income,
        expenses,
        incomeInvoices,
        expenseInvoices,
        net: income - expenses,
      };
    });

    let runningBalance = Number(currentBalance) || 0;
    return projectionsList.map((projection) => {
      runningBalance = runningBalance + projection.net;
      return { ...projection, projectedBalance: Number(runningBalance.toFixed(2)) };
    });
  }, [invoices, currentBalance, viewMode, outgoingPayments, apInvoices]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const formatCurrencyInput = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const formatDate = (date) => {
    const d = new Date(date);
    if (viewMode === 'weekly') {
      const weekEnd = new Date(d);
      weekEnd.setDate(d.getDate() + 6);
      return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const saveStatusLabel = saveStatus === 'saving' ? '⏳ Saving...'
    : saveStatus === 'saved' ? '✓ Saved'
    : saveStatus === 'error' ? '⚠ Save failed'
    : null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold text-slate-200">Cash Flow Simulator</h2>
        {saveStatusLabel && (
          <span className={`text-xs font-medium ${
            saveStatus === 'saving' ? 'text-slate-400'
            : saveStatus === 'saved' ? 'text-emerald-400'
            : 'text-rose-400'
          }`}>{saveStatusLabel}</span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Current Bank Balance</label>
          <input
            type="text"
            value={balanceInputValue || (currentBalance ? formatCurrencyInput(currentBalance) : '')}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/[^0-9.-]/g, '');
              setBalanceInputValue(e.target.value);
              setCurrentBalance(parseFloat(rawValue) || 0);
            }}
            onBlur={() => setBalanceInputValue('')}
            placeholder="$0.00"
            className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-800 text-slate-200 placeholder:text-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">View Mode</label>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="w-full px-3 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-800 text-slate-200">
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </div>
      </div>
      <div className="mb-4">
        <button onClick={() => setShowAddPayment(!showAddPayment)} className="w-full px-4 py-2 text-sm font-medium text-slate-900 bg-emerald-500 border border-emerald-500 rounded-md hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900">
          {showAddPayment ? 'Cancel' : '+ Add Outgoing Payment'}
        </button>
      </div>
      {showAddPayment && (
        <div className="mb-4 p-4 bg-slate-800/60 rounded-lg border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Add Outgoing Payment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Amount</label>
              <input type="number" value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 text-sm border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-800 text-slate-200 placeholder:text-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
              <input type="date" value={newPayment.date} onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-800 text-slate-200" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Description (optional)</label>
              <input type="text" value={newPayment.description} onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })} placeholder="e.g., Rent, Salary" className="w-full px-3 py-2 text-sm border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-800 text-slate-200 placeholder:text-slate-500" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { if (newPayment.amount && newPayment.date) { setOutgoingPayments([...outgoingPayments, { ...newPayment }]); setNewPayment({ amount: '', date: '', description: '' }); setShowAddPayment(false); } }} className="px-4 py-2 text-sm font-medium text-slate-900 bg-emerald-500 rounded-md hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900">Add Payment</button>
            <button onClick={() => { setNewPayment({ amount: '', date: '', description: '' }); setShowAddPayment(false); }} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-600 rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900">Cancel</button>
          </div>
        </div>
      )}
      {outgoingPayments.length > 0 && (
        <div className="mb-4 p-3 bg-rose-500/10 rounded-lg border border-rose-500/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-rose-400">Outgoing Payments</h3>
            <button onClick={() => setOutgoingPayments([])} className="text-xs text-rose-400 hover:text-rose-300">Clear All</button>
          </div>
          <div className="space-y-1">
            {outgoingPayments.map((payment, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-rose-300">
                  {payment.description || 'Outgoing Payment'} - {payment.date ? (() => { const [y, m, d] = payment.date.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); })() : ''}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 font-semibold">-{formatCurrency(Math.abs(parseFloat(payment.amount) || 0))}</span>
                  <button onClick={() => setOutgoingPayments(outgoingPayments.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-300">×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-6 overflow-visible">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">{viewMode === 'weekly' ? 'Weekly' : 'Daily'} Projections</h3>
        <div className="overflow-x-auto overflow-y-visible relative">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-600 bg-slate-800/80">
                <th className="text-left py-3 px-4 font-semibold text-slate-400">Period</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-400">Income</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-400">Expenses</th>
                <th className="text-right py-3 px-4 font-semibold text-slate-400">Balance</th>
              </tr>
            </thead>
            <tbody>
              {projections.length === 0 ? (
                <tr><td colSpan="4" className="py-4 text-center text-slate-500">No projections available</td></tr>
              ) : (
                projections.map((projection, index) => (
                  <tr key={index} className={`border-b border-slate-700/80 ${projection.projectedBalance < 0 ? 'bg-rose-500/10' : ''}`}>
                    <td className="py-3 px-4 text-slate-300 font-medium">{formatDate(projection.date)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-400 cursor-help relative" onMouseEnter={() => setHoveredRow(index * 2)} onMouseLeave={() => setHoveredRow(null)}>
                      {formatCurrency(projection.income)}
                      {hoveredRow === index * 2 && projection.incomeInvoices.length > 0 && (
                        <div className="absolute right-0 top-full mt-1 z-50">
                          <div className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded-lg py-2 px-3 shadow-xl max-w-xs min-w-[200px]">
                            <div className="font-semibold mb-2 text-slate-100">{viewMode === 'weekly' ? 'Week' : 'Day'} Income Details:</div>
                            <div className="space-y-1">
                              {projection.incomeInvoices.map((inv, idx) => (
                                <div key={idx} className="flex justify-between items-start">
                                  <span className="text-slate-300 flex-1">{inv.client}</span>
                                  <span className="text-emerald-400 font-medium ml-2">{formatCurrency(inv.amount)}{inv.status === 'OVERDUE' && <span className="text-rose-400 ml-1 text-[10px]">(Overdue)</span>}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-600 flex justify-between font-semibold"><span>Total:</span><span className="text-emerald-400">{formatCurrency(projection.income)}</span></div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-rose-400 cursor-help relative" onMouseEnter={() => setHoveredRow(index * 2 + 1)} onMouseLeave={() => setHoveredRow(null)}>
                      {projection.expenses > 0 ? `-${formatCurrency(projection.expenses)}` : formatCurrency(0)}
                      {hoveredRow === index * 2 + 1 && projection.expenseInvoices.length > 0 && (
                        <div className="absolute right-0 top-full mt-1 z-50">
                          <div className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded-lg py-2 px-3 shadow-xl max-w-xs min-w-[200px]">
                            <div className="font-semibold mb-2 text-slate-100">{viewMode === 'weekly' ? 'Week' : 'Day'} Expense Details:</div>
                            <div className="space-y-1">
                              {projection.expenseInvoices.map((inv, idx) => (
                                <div key={idx} className="flex justify-between items-start">
                                  <span className="text-slate-300 flex-1">
                                    {inv.description || 'Outgoing Payment'}
                                    {inv.source === 'ap' && <span className="ml-1 text-[10px] text-amber-400">(AP)</span>}
                                    {inv.status === 'AP_OVERDUE' && <span className="ml-1 text-[10px] text-rose-400">(Overdue)</span>}
                                  </span>
                                  <span className="text-rose-400 font-medium ml-2">-{formatCurrency(Math.abs(inv.amount))}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-600 flex justify-between font-semibold"><span>Total:</span><span className="text-rose-400">-{formatCurrency(projection.expenses)}</span></div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold text-lg ${projection.projectedBalance < 0 ? 'text-rose-400' : 'text-slate-100'}`}>{formatCurrency(projection.projectedBalance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {projections.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-slate-500">Total Projected Income</div>
                <div className="text-lg font-semibold text-emerald-400">{formatCurrency(projections.reduce((sum, p) => sum + p.income, 0))}</div>
              </div>
              <div>
                <div className="text-slate-500">Total Outgoing</div>
                <div className="text-lg font-semibold text-rose-400">-{formatCurrency(projections.reduce((sum, p) => sum + p.expenses, 0))}</div>
              </div>
              <div>
                <div className="text-slate-500">Final Projected Balance</div>
                <div className={`text-lg font-semibold ${projections[projections.length - 1]?.projectedBalance < 0 ? 'text-rose-400' : 'text-slate-100'}`}>{formatCurrency(projections[projections.length - 1]?.projectedBalance || currentBalance)}</div>
              </div>
            </div>
          </div>
        )}
        {!currentBalance && <p className="mt-2 text-sm text-slate-500">Enter your current bank balance above to see running balance. All upcoming and overdue invoices are included below.</p>}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500"><strong className="text-slate-400">Note:</strong> Overdue AR invoices are projected to be collected 7 days from today. Paid invoices are excluded. AP invoices with <span className="text-amber-400">Approved</span> or <span className="text-rose-400">Overdue</span> status appear automatically as outgoing payments; once marked Paid in AP they disappear from here.</p>
        </div>
      </div>
    </div>
  );
};

export default CashFlowSimulator;
