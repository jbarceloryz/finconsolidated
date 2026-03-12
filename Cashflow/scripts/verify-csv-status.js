/**
 * Verifies that invoice status from the CSV flows correctly through processCSVData.
 * Run from repo root: node scripts/verify-csv-status.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processCSVData, getStatusCategory, normalizeStatus } from '../src/utils/processCSV.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, '..', 'db.csv');

const csvText = fs.readFileSync(csvPath, 'utf8');
const invoices = processCSVData(csvText);

let mismatches = 0;
const byStatus = {};
const byCategory = {};

invoices.forEach((inv, i) => {
  const expectedCategory = getStatusCategory(inv.status);
  if (inv.statusCategory !== expectedCategory) {
    mismatches++;
    console.error(`Mismatch row ${i + 2}: client=${inv.client} CSV status="${inv.status}" statusCategory=${inv.statusCategory} expected=${expectedCategory}`);
  }
  byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;
  byCategory[inv.statusCategory] = (byCategory[inv.statusCategory] || 0) + 1;
});

console.log('\n--- Status flow check ---');
console.log('Total invoices (after exclusions):', invoices.length);
console.log('By status (normalized):', byStatus);
console.log('By statusCategory:', byCategory);
console.log('Mismatches (statusCategory vs getStatusCategory(status)):', mismatches);

if (mismatches > 0) {
  process.exit(1);
}
console.log('OK: All invoice statuses match CSV and flow correctly.\n');
