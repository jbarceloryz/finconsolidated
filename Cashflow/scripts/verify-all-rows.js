/**
 * Verifies that all CSV rows are considered: reports included vs skipped and why.
 * Run from repo root: node scripts/verify-all-rows.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processCSVDataWithReport } from '../src/utils/processCSV.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, '..', 'db.csv');

const csvText = fs.readFileSync(csvPath, 'utf8');
const lines = csvText.split(/\r?\n/).filter(line => line.trim());
const totalDataRows = Math.max(0, lines.length - 1); // minus header

const { invoices, skipped } = processCSVDataWithReport(csvText);

const included = invoices.length;
const skippedCount = skipped.length;
const accounted = included + skippedCount;

console.log('\n--- CSV row verification ---\n');
console.log('Total data rows in CSV (excluding header):', totalDataRows);
console.log('Included in dashboard:                     ', included);
console.log('Skipped (with reason):                     ', skippedCount);
console.log('Accounted for:                             ', accounted);

if (accounted !== totalDataRows) {
  console.warn('\nWARNING: included + skipped does not equal total data rows.');
}

if (skipped.length > 0) {
  console.log('\nSkipped rows (line = CSV line number, 1-based):');
  const byReason = {};
  skipped.forEach(({ lineNum, client, reason }) => {
    const key = reason;
    if (!byReason[key]) byReason[key] = [];
    byReason[key].push({ lineNum, client: client || '(blank)' });
  });
  Object.entries(byReason).forEach(([reason, entries]) => {
    console.log(`  ${reason}: ${entries.length} row(s)`);
    entries.slice(0, 10).forEach(({ lineNum, client }) => console.log(`    Line ${lineNum}: ${client}`));
    if (entries.length > 10) console.log(`    ... and ${entries.length - 10} more`);
  });
} else {
  console.log('\nNo rows skipped; all data rows are included in the dashboard.');
}

console.log('\n');
