import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Same parsing functions as the dashboard
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[$,]/g, '');
  return parseFloat(cleaned) || 0;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  return null;
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

function getStatusCategory(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'PAID') return 'paid';
  if (normalized === 'OVERDUE') return 'overdue';
  return 'upcoming';
}

// Read and process CSV
const csvPath = path.join(__dirname, 'db.csv');
const csvText = fs.readFileSync(csvPath, 'utf-8');
const lines = csvText.split('\n').filter(line => line.trim());

if (lines.length < 2) {
  console.log('No data found in CSV');
  process.exit(1);
}

const headers = parseCSVLine(lines[0]);
const clientIdx = headers.findIndex(h => h.toLowerCase().includes('client'));
const dueDateIdx = headers.findIndex(h => h.toLowerCase().includes('due date'));
const amountIdx = headers.findIndex(h => h.toLowerCase().includes('total amount'));
const statusIdx = headers.findIndex(h => h.toLowerCase().includes('status'));
const invoiceNumIdx = headers.findIndex(h => h.toLowerCase().includes('invoice number') || h.toLowerCase().includes('invoice'));

const invoices = [];
const today = new Date();
today.setHours(0, 0, 0, 0);

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const row = parseCSVLine(line);
  if (row.length <= Math.max(clientIdx, dueDateIdx, amountIdx, statusIdx)) continue;
  
  const invoiceNum = invoiceNumIdx >= 0 ? (row[invoiceNumIdx]?.trim() || '') : '';
  const client = row[clientIdx]?.trim() || '';
  const dueDateStr = row[dueDateIdx]?.trim() || '';
  const amountStr = row[amountIdx]?.trim() || '';
  const status = row[statusIdx]?.trim() || '';
  
  if (!client || !dueDateStr || !amountStr) continue;
  
  const dueDate = parseDate(dueDateStr);
  if (!dueDate) continue;
  
  const amount = parseAmount(amountStr);
  if (isNaN(amount)) continue;
  
  // Filter out excluded clients
  const excludedClients = ['Studio', 'Ntrvsta'];
  const isExcluded = excludedClients.some(excluded => 
    client.toLowerCase().includes(excluded.toLowerCase())
  );
  if (isExcluded) continue;
  
  const normalizedStatus = status.trim().toUpperCase();
  const statusCategory = getStatusCategory(normalizedStatus);
  
  // Determine if this invoice is considered overdue by the dashboard logic
  let isOverdue = false;
  let overdueReason = '';
  
  // Same logic as SummaryCards component
  if (normalizedStatus === 'PAID') {
    isOverdue = false; // PAID invoices are never overdue
  } else if (normalizedStatus === 'OVERDUE') {
    isOverdue = true;
    overdueReason = 'Status marked as OVERDUE';
  } else {
    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);
    if (dueDateOnly < today && normalizedStatus !== 'PAID') {
      isOverdue = true;
      overdueReason = `Due date (${dueDateOnly.toLocaleDateString()}) is in the past and status is not PAID`;
    }
  }
  
  if (isOverdue) {
    invoices.push({
      invoiceNumber: invoiceNum || 'N/A',
      client,
      dueDate: dueDate.toLocaleDateString(),
      amount,
      status: normalizedStatus,
      statusCategory,
      overdueReason
    });
  }
}

// Sort by amount descending
invoices.sort((a, b) => b.amount - a.amount);

// Display results
console.log('\n=== INVOICES CONSIDERED OVERDUE IN DASHBOARD ===\n');
console.log(`Total: ${invoices.length} invoice(s)\n`);

if (invoices.length === 0) {
  console.log('No overdue invoices found.');
} else {
  let totalAmount = 0;
  invoices.forEach((inv, index) => {
    console.log(`${index + 1}. ${inv.invoiceNumber || 'N/A'}`);
    console.log(`   Client: ${inv.client}`);
    console.log(`   Due Date: ${inv.dueDate}`);
    console.log(`   Amount: $${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Status: ${inv.status}`);
    console.log(`   Reason: ${inv.overdueReason}`);
    console.log('');
    totalAmount += inv.amount;
  });
  
  console.log(`\nTotal Overdue Amount: $${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}

