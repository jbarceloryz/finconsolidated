import React from 'react';

const CustomTooltip = ({ active, payload, label, currentMonth = null, currentYear = null }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  if (!data || !data.invoices || data.invoices.length === 0) return null;

  // Format date - use the selected month/year from the chart
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  const month = currentMonth !== null && currentMonth !== undefined ? currentMonth : today.getMonth();
  const year = currentYear !== null && currentYear !== undefined ? currentYear : today.getFullYear();
  const monthName = monthNames[month];
  const dateLabel = `${monthName} ${label}`;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get status label and color
  const getStatusInfo = (status) => {
    switch (status) {
      case 'PAID':
        return { label: 'Paid', color: 'bg-green-100 text-green-700' };
      case 'OVERDUE':
        return { label: 'Overdue', color: 'bg-red-100 text-red-700' };
      default:
        return { label: 'Upcoming', color: 'bg-gray-100 text-gray-700' };
    }
  };

  // Group invoices by status for better display
  // Invoices are already grouped by client+status in the data processing
  const groupedInvoices = data.invoices.reduce((acc, invoice) => {
    const statusInfo = getStatusInfo(invoice.status);
    if (!acc[invoice.status]) {
      acc[invoice.status] = {
        statusInfo,
        invoices: [],
        total: 0,
      };
    }
    acc[invoice.status].invoices.push(invoice);
    acc[invoice.status].total += invoice.amount;
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[300px] max-w-[400px]">
      <div className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
        {dateLabel}
      </div>
      
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {Object.entries(groupedInvoices).map(([status, group]) => (
          <div key={status} className="space-y-1.5">
            {group.invoices.map((invoice, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-gray-700 truncate font-medium">
                    {invoice.client}
                    {invoice.invoiceCount > 1 && (
                      <span className="text-gray-500 font-normal ml-1">
                        ({invoice.invoiceCount} invoices)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <span className="text-gray-900 font-semibold whitespace-nowrap">
                    {formatCurrency(invoice.amount)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${group.statusInfo.color}`}>
                    {group.statusInfo.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-gray-700">Total</span>
          <span className="text-gray-900 text-base">{formatCurrency(data.total)}</span>
        </div>
      </div>
    </div>
  );
};

export default CustomTooltip;

