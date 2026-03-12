/**
 * Process CSV data and transform it for the Payment Timeline chart
 */

export function parseAmount(amountStr) {
  if (!amountStr) return 0;
  // Remove $, commas, and parse
  const cleaned = amountStr.replace(/[$,]/g, '');
  return parseFloat(cleaned) || 0;
}

export function parseDate(dateStr) {
  if (!dateStr) return null;
  const trimmed = String(dateStr).replace(/\uFEFF/g, '').trim();
  if (!trimmed) return null;
  // ISO YYYY-MM-DD: parse as local date to avoid timezone shifting (e.g. 2026-03-01 staying March 1)
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
  // Parse "Feb 07, 2026", "Mar 1, 2026", "Apr 09, 2026"
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) return date;
  return null;
}

// Strip BOM and invisible/control chars that Excel/Sheets can add to CSV cells
function stripStatusForComparison(str) {
  if (str == null || str === '') return '';
  return String(str)
    .replace(/\uFEFF/g, '')           // BOM
    .replace(/[\u200B-\u200D\u2060\u00AD]/g, '') // zero-width, soft hyphen
    .trim();
}

// Normalize status for consistent comparison (trim, uppercase, collapse spaces).
// Handles PAID/Paid/paid and strips BOM/invisible chars so CSV updates always reflect.
export function normalizeStatus(status) {
  const cleaned = stripStatusForComparison(status);
  if (!cleaned) return '';
  return cleaned.toUpperCase().replace(/\s+/g, ' ');
}

export function getStatusCategory(status) {
  const normalized = normalizeStatus(status);
  const normalizedNoSpaces = normalized.replace(/\s+/g, '');
  // CRITICAL: Check PAID first - paid invoices should NEVER be categorized as overdue or upcoming
  if (normalized === 'PAID') return 'paid';
  // OVERDUE: accept "OVERDUE" or "OVER DUE" (exports sometimes add a space)
  if (normalized === 'OVERDUE' || normalizedNoSpaces === 'OVERDUE') return 'overdue';
  // Everything else (SENT, DRAFT, etc.) is categorized as 'upcoming'
  return 'upcoming';
}

// Improved CSV parser that handles quoted fields with commas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
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
  // Strip BOM and leading/trailing junk so headers and cells parse correctly (fixes exports from Excel/Sheets)
  const raw = String(csvText ?? '').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  
  // Find column indices (case-insensitive)
  const clientIdx = headers.findIndex(h => h.toLowerCase().includes('client'));
  const dueDateIdx = headers.findIndex(h => h.toLowerCase().includes('due date'));
  const amountIdx = headers.findIndex(h => h.toLowerCase().includes('total amount'));
  const statusIdx = headers.findIndex(h => h.toLowerCase().includes('status'));
  
  if (clientIdx === -1 || dueDateIdx === -1 || amountIdx === -1 || statusIdx === -1) {
    console.error('Required columns not found in CSV');
    return [];
  }
  
  const invoices = [];
  
  // Process each row (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = parseCSVLine(line);
    
    if (row.length <= Math.max(clientIdx, dueDateIdx, amountIdx, statusIdx)) continue;
    
    const client = row[clientIdx]?.trim() || '';
    const dueDateStr = row[dueDateIdx]?.trim() || '';
    const amountStr = row[amountIdx]?.trim() || '';
    // Use stripStatusForComparison so PAID is recognized even with BOM/invisible chars from exports
    const rawStatus = stripStatusForComparison(row[statusIdx]);
    
    if (!client || !dueDateStr || !amountStr) continue;
    
    const dueDate = parseDate(dueDateStr);
    if (!dueDate) continue;
    
    const amount = parseAmount(amountStr);
    // Include negative amounts (credits)
    if (isNaN(amount)) continue;
    
    // Filter out excluded clients
    const excludedClients = ['Studio', 'Ntrvsta'];
    const isExcluded = excludedClients.some(excluded => 
      client.toLowerCase().includes(excluded.toLowerCase())
    );
    
    if (isExcluded) continue; // Skip excluded clients
    
    // Normalize status so PAID/Paid/paid and any spacing/invisible chars always map correctly for dashboard
    const normalizedStatus = normalizeStatus(rawStatus) || (rawStatus && rawStatus.toUpperCase());
    const statusCategory = getStatusCategory(normalizedStatus);
    
    invoices.push({
      client,
      dueDate,
      amount: Math.abs(amount), // Use absolute value for display
      originalAmount: amount, // Keep original for reference
      status: normalizedStatus,
      statusCategory,
    });
  }
  
  return invoices;
}

/**
 * Same as processCSVData but returns { invoices, skipped } so callers can verify all rows are considered.
 * skipped: array of { lineNum (1-based data row), client, reason }.
 */
export function processCSVDataWithReport(csvText) {
  const raw = String(csvText ?? '').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(line => line.trim());
  const invoices = [];
  const skipped = [];

  if (lines.length < 2) return { invoices, skipped };

  const headers = parseCSVLine(lines[0]);
  const clientIdx = headers.findIndex(h => h.toLowerCase().includes('client'));
  const dueDateIdx = headers.findIndex(h => h.toLowerCase().includes('due date'));
  const amountIdx = headers.findIndex(h => h.toLowerCase().includes('total amount'));
  const statusIdx = headers.findIndex(h => h.toLowerCase().includes('status'));

  if (clientIdx === -1 || dueDateIdx === -1 || amountIdx === -1 || statusIdx === -1) {
    skipped.push({ lineNum: 0, client: '', reason: 'Missing required columns (client, due date, total amount, status)' });
    return { invoices, skipped };
  }

  const excludedClients = ['Studio', 'Ntrvsta'];

  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i].trim();
    if (!line) {
      skipped.push({ lineNum, client: '', reason: 'Empty line' });
      continue;
    }

    const row = parseCSVLine(line);
    if (row.length <= Math.max(clientIdx, dueDateIdx, amountIdx, statusIdx)) {
      skipped.push({ lineNum, client: row[clientIdx] || '', reason: 'Too few columns' });
      continue;
    }

    const client = row[clientIdx]?.trim() || '';
    const dueDateStr = row[dueDateIdx]?.trim() || '';
    const amountStr = row[amountIdx]?.trim() || '';
    const rawStatus = stripStatusForComparison(row[statusIdx]);

    if (!client || !dueDateStr || !amountStr) {
      skipped.push({ lineNum, client, reason: 'Missing client, due date, or amount' });
      continue;
    }

    const dueDate = parseDate(dueDateStr);
    if (!dueDate) {
      skipped.push({ lineNum, client, reason: `Invalid due date: "${dueDateStr}"` });
      continue;
    }

    const amount = parseAmount(amountStr);
    if (isNaN(amount)) {
      skipped.push({ lineNum, client, reason: `Invalid amount: "${amountStr}"` });
      continue;
    }

    const isExcluded = excludedClients.some(excluded =>
      client.toLowerCase().includes(excluded.toLowerCase())
    );
    if (isExcluded) {
      skipped.push({ lineNum, client, reason: 'Excluded client (Studio / Ntrvsta)' });
      continue;
    }

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

  return { invoices, skipped };
}

export function groupInvoicesByDay(invoices, currentMonth = null, currentYear = null) {
  const today = new Date();
  // currentMonth should be a month index (0-11) or null
  const month = currentMonth !== null && currentMonth !== undefined ? currentMonth : today.getMonth();
  const year = currentYear !== null && currentYear !== undefined ? currentYear : today.getFullYear();
  
  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Initialize data structure for each day
  const dayData = {};
  for (let day = 1; day <= daysInMonth; day++) {
    dayData[day] = {
      day,
      paid: 0,
      overdue: 0,
      upcoming: 0,
      invoices: [],
    };
  }
  
  // Group invoices by day, and group by client + status within each day
  invoices.forEach(invoice => {
    // Use shared normalizer so CSV PAID/OVERDUE always reflect (same as SummaryCards)
    const normalizedStatus = normalizeStatus(invoice.status);
    const normalizedNoSpaces = normalizedStatus.replace(/\s+/g, '');
    const isPaid = normalizedStatus === 'PAID' || invoice.statusCategory === 'paid';
    const isOverdue = normalizedStatus === 'OVERDUE' || normalizedNoSpaces === 'OVERDUE' || invoice.statusCategory === 'overdue';
    
    // If status is PAID but statusCategory is wrong, fix it immediately
    if (normalizedStatus === 'PAID' && invoice.statusCategory !== 'paid') {
      invoice.statusCategory = 'paid';
    }
    // Same for OVERDUE so CSV-marked overdue always shows in timeline
    if (isOverdue && invoice.statusCategory !== 'overdue') {
      invoice.statusCategory = 'overdue';
      if (invoice.status !== 'OVERDUE') invoice.status = 'OVERDUE';
    }
    
    // Double-check: if statusCategory is 'paid', ensure status is also 'PAID'
    if (invoice.statusCategory === 'paid' && normalizedStatus !== 'PAID') {
      invoice.status = 'PAID';
    }
    
    const invoiceDate = new Date(invoice.dueDate);
    if (invoiceDate.getMonth() === month && invoiceDate.getFullYear() === year) {
      const day = invoiceDate.getDate();
      if (dayData[day]) {
        // Create a key for grouping: client + status
        const groupKey = `${invoice.client}_${invoice.status}`;
        
        // Check if we already have this client with this status on this day
        const existingGroupIndex = dayData[day].invoices.findIndex(
          inv => inv.client === invoice.client && inv.status === invoice.status
        );
        
        if (existingGroupIndex !== -1) {
          // Add to existing group
          const existingGroup = dayData[day].invoices[existingGroupIndex];
          existingGroup.amount += invoice.amount;
          existingGroup.invoiceCount = (existingGroup.invoiceCount || 1) + 1;
        } else {
          // Create new grouped invoice entry
          dayData[day].invoices.push({
            ...invoice,
            invoiceCount: 1, // Track number of invoices grouped
          });
        }
        
        // CRITICAL: Only add to the correct category - PAID invoices go to 'paid', NEVER to 'overdue' or 'upcoming'
        if (isPaid) {
          // PAID invoices ALWAYS go to 'paid' category, never to 'upcoming' or 'overdue'
          dayData[day].paid += invoice.amount;
        } else {
          // For non-PAID invoices, use statusCategory
          // But ensure it's a valid category (paid, overdue, or upcoming)
          const category = invoice.statusCategory || 'upcoming';
          // Double-check: if somehow statusCategory is 'paid' but isPaid is false, fix it
          if (category === 'paid' && !isPaid) {
            // This shouldn't happen, but if it does, default to 'upcoming' for non-PAID invoices
            dayData[day].upcoming += invoice.amount;
          } else {
            dayData[day][category] += invoice.amount;
          }
        }
      }
    }
  });
  
  // Convert to array and calculate totals
  return Object.values(dayData).map(day => ({
    ...day,
    total: day.paid + day.overdue + day.upcoming,
  }));
}

