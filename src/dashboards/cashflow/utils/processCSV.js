/**
 * Process CSV data and transform it for the Payment Timeline chart
 */

export function parseAmount(amountStr) {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[$,]/g, '');
  return parseFloat(cleaned) || 0;
}

export function parseDate(dateStr) {
  if (!dateStr) return null;
  const trimmed = String(dateStr).replace(/\uFEFF/g, '').trim();
  if (!trimmed) return null;
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const month = parseInt(m, 10) - 1;
    const day = parseInt(d, 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const date = new Date(parseInt(y, 10), month, day);
      if (!isNaN(date.getTime())) return date;
    }
  }
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) return date;
  return null;
}

function stripStatusForComparison(str) {
  if (str == null || str === '') return '';
  return String(str)
    .replace(/\uFEFF/g, '')
    .replace(/[\u200B-\u200D\u2060\u00AD]/g, '')
    .trim();
}

export function normalizeStatus(status) {
  const cleaned = stripStatusForComparison(status);
  if (!cleaned) return '';
  return cleaned.toUpperCase().replace(/\s+/g, ' ');
}

export function getStatusCategory(status) {
  const normalized = normalizeStatus(status);
  const normalizedNoSpaces = normalized.replace(/\s+/g, '');
  if (normalized === 'PAID') return 'paid';
  if (normalized === 'OVERDUE' || normalizedNoSpaces === 'OVERDUE') return 'overdue';
  return 'upcoming';
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function processCSVData(csvText) {
  const raw = String(csvText ?? '').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const clientIdx = headers.findIndex(h => h.toLowerCase().includes('client'));
  const dueDateIdx = headers.findIndex(h => h.toLowerCase().includes('due date'));
  const amountIdx = headers.findIndex(h => h.toLowerCase().includes('total amount'));
  const statusIdx = headers.findIndex(h => h.toLowerCase().includes('status'));

  if (clientIdx === -1 || dueDateIdx === -1 || amountIdx === -1 || statusIdx === -1) {
    return [];
  }

  const invoices = [];
  const excludedClients = ['Studio', 'Ntrvsta'];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row = parseCSVLine(line);
    if (row.length <= Math.max(clientIdx, dueDateIdx, amountIdx, statusIdx)) continue;

    const client = row[clientIdx]?.trim() || '';
    const dueDateStr = row[dueDateIdx]?.trim() || '';
    const amountStr = row[amountIdx]?.trim() || '';
    const rawStatus = stripStatusForComparison(row[statusIdx]);

    if (!client || !dueDateStr || !amountStr) continue;

    const dueDate = parseDate(dueDateStr);
    if (!dueDate) continue;

    const amount = parseAmount(amountStr);
    if (isNaN(amount)) continue;

    if (excludedClients.some(excluded => client.toLowerCase().includes(excluded.toLowerCase()))) continue;

    const normalizedStatus = normalizeStatus(rawStatus) || (rawStatus && rawStatus.toUpperCase());
    const statusCategory = getStatusCategory(normalizedStatus);

    invoices.push({
      client,
      dueDate,
      amount: Math.abs(amount),
      originalAmount: amount,
      status: normalizedStatus,
      statusCategory,
    });
  }

  return invoices;
}

export function groupInvoicesByDay(invoices, currentMonth = null, currentYear = null) {
  const today = new Date();
  const month = currentMonth !== null && currentMonth !== undefined ? currentMonth : today.getMonth();
  const year = currentYear !== null && currentYear !== undefined ? currentYear : today.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayData = {};
  for (let day = 1; day <= daysInMonth; day++) {
    dayData[day] = { day, paid: 0, overdue: 0, upcoming: 0, invoices: [] };
  }

  invoices.forEach(originalInvoice => {
    const invoice = { ...originalInvoice };
    const normalizedStatus = normalizeStatus(invoice.status);
    const isPaid = normalizedStatus === 'PAID' || invoice.statusCategory === 'paid';
    const isOverdue = normalizedStatus === 'OVERDUE' || normalizedStatus.replace(/\s+/g, '') === 'OVERDUE' || invoice.statusCategory === 'overdue';

    if (normalizedStatus === 'PAID' && invoice.statusCategory !== 'paid') invoice.statusCategory = 'paid';
    if (isOverdue && invoice.statusCategory !== 'overdue') {
      invoice.statusCategory = 'overdue';
      if (invoice.status !== 'OVERDUE') invoice.status = 'OVERDUE';
    }
    if (invoice.statusCategory === 'paid' && normalizedStatus !== 'PAID') invoice.status = 'PAID';

    const invoiceDate = new Date(invoice.dueDate);
    if (invoiceDate.getMonth() === month && invoiceDate.getFullYear() === year) {
      const day = invoiceDate.getDate();
      if (dayData[day]) {
        const existingGroupIndex = dayData[day].invoices.findIndex(
          inv => inv.client === invoice.client && inv.status === invoice.status
        );
        if (existingGroupIndex !== -1) {
          const existingGroup = dayData[day].invoices[existingGroupIndex];
          existingGroup.amount += invoice.amount;
          existingGroup.invoiceCount = (existingGroup.invoiceCount || 1) + 1;
        } else {
          dayData[day].invoices.push({ ...invoice, invoiceCount: 1 });
        }
        if (isPaid) {
          dayData[day].paid += invoice.amount;
        } else {
          const category = invoice.statusCategory || 'upcoming';
          dayData[day][category === 'paid' && !isPaid ? 'upcoming' : category] += invoice.amount;
        }
      }
    }
  });

  return Object.values(dayData).map(day => ({ ...day, total: day.paid + day.overdue + day.upcoming }));
}
