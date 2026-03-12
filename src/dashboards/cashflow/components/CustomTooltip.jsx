import React from 'react';

const CustomTooltip = ({ active, payload, label, currentMonth = null, currentYear = null }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  if (!data || !data.invoices || data.invoices.length === 0) return null;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const month = currentMonth !== null && currentMonth !== undefined ? currentMonth : today.getMonth();
  const year = currentYear !== null && currentYear !== undefined ? currentYear : today.getFullYear();
  const dateLabel = `${monthNames[month]} ${label}`;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const getStatusInfo = (status) => {
    switch (status) {
      case 'PAID': return { label: 'Paid', color: 'bg-emerald-500/20 text-emerald-400' };
      case 'OVERDUE': return { label: 'Overdue', color: 'bg-rose-500/20 text-rose-400' };
      default: return { label: 'Upcoming', color: 'bg-slate-600/50 text-slate-300' };
    }
  };

  const groupedInvoices = data.invoices.reduce((acc, invoice) => {
    const statusInfo = getStatusInfo(invoice.status);
    if (!acc[invoice.status]) {
      acc[invoice.status] = { statusInfo, invoices: [], total: 0 };
    }
    acc[invoice.status].invoices.push(invoice);
    acc[invoice.status].total += invoice.amount;
    return acc;
  }, {});

  return (
    <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-600 p-4 min-w-[300px] max-w-[400px]">
      <div className="text-sm font-semibold text-slate-200 mb-3 pb-2 border-b border-slate-600">{dateLabel}</div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {Object.entries(groupedInvoices).map(([status, group]) => (
          <div key={status} className="space-y-1.5">
            {group.invoices.map((invoice, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-slate-300 truncate font-medium">
                    {invoice.client}
                    {invoice.invoiceCount > 1 && <span className="text-slate-500 font-normal ml-1">({invoice.invoiceCount} invoices)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <span className="text-slate-100 font-semibold whitespace-nowrap">{formatCurrency(invoice.amount)}</span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${group.statusInfo.color}`}>{group.statusInfo.label}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-600">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-slate-400">Total</span>
          <span className="text-slate-100 text-base">{formatCurrency(data.total)}</span>
        </div>
      </div>
    </div>
  );
};

export default CustomTooltip;
