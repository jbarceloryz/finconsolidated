/**
 * Parse a CSV line handling quoted fields (e.g. "$1,234")
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || (c === '\n' && !inQuotes)) {
      result.push(current.trim());
      current = '';
      if (c === '\n') break;
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCurrency(value) {
  if (!value || value === '') return 0;
  const cleaned = String(value).replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

const COMPANY_HEADERS = [
  'CONSOLIDATED',
  'Ryz Labs HC LLC',
  'Offsiteio Inc',
  'Ryz Labs Studio LLC',
  'Ntrvsta',
  'Hip Train Inc',
  'Ryz Labs LLC',
];

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/**
 * Convert a month label (e.g. "Jan-25", "March-2026") to a sortable integer
 * so we can always present months in calendar order regardless of CSV ordering.
 */
export function monthSortKey(label) {
  if (!label) return Number.MAX_SAFE_INTEGER;
  const parts = String(label).split(/[-\s/]/);
  const name = (parts[0] || '').trim();
  let mi = MONTH_ABBR.indexOf(name);
  if (mi < 0) mi = MONTH_FULL.indexOf(name);
  if (mi < 0) return Number.MAX_SAFE_INTEGER;
  const rawYr = parts[1] ? parseInt(String(parts[1]).trim(), 10) : 0;
  const year = isNaN(rawYr) ? 0 : (rawYr < 100 ? 2000 + rawYr : rawYr);
  return year * 12 + mi;
}

const ROW_LABELS = {
  'Total Income': 'totalIncome',
  'Total Cost of Goods Sold': 'cogs',
  'Gross Profit': 'grossProfit',
  'Total Expenses': 'totalExpenses',
  'Operating Income': 'operatingIncome',
};

export function parseFinancialCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.length > 0);
  let months = [];
  const byCompany = {};
  const metricsByCompany = {};
  let currentCompany = null;
  let hcProjectedSales = [];
  let varianceVsProjected = [];

  function parseRowValues(cells) {
    const values = [];
    for (let c = 2; c < cells.length; c++) {
      const cell = cells[c];
      if (cell === 'Total' || cell === '') break;
      values.push(parseCurrency(cell));
    }
    return values;
  }

  function ensureCompany(name) {
    if (!metricsByCompany[name]) {
      metricsByCompany[name] = {
        totalIncome: [],
        cogs: [],
        grossProfit: [],
        totalExpenses: [],
        operatingIncome: [],
      };
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const second = (cells[1] || '').trim();

    if (COMPANY_HEADERS.includes(second)) {
      currentCompany = second;
      continue;
    }

    if (second === 'HC Projected Sales') {
      const values = parseRowValues(cells);
      if (values.length > 0) hcProjectedSales = values.slice(0, 12);
      continue;
    }
    if (second === 'Variance vs Projected') {
      const values = parseRowValues(cells);
      if (values.length > 0) varianceVsProjected = values.slice(0, 12);
      continue;
    }

    const metricKey = ROW_LABELS[second];
    if (metricKey && currentCompany) {
      const values = parseRowValues(cells);
      if (values.length > 0) {
        ensureCompany(currentCompany);
        metricsByCompany[currentCompany][metricKey] = values;
        if (metricKey === 'operatingIncome') byCompany[currentCompany] = values;
        if (months.length === 0) {
          for (let j = i - 1; j >= 0; j--) {
            const rowCells = parseCsvLine(lines[j]);
            const third = (rowCells[2] || '').trim();
            if (third && /^[A-Za-z]/.test(third) && third !== 'Total' && !/^\$/.test(third)) {
              for (let c = 2; c < rowCells.length; c++) {
                const label = (rowCells[c] || '').trim();
                if (label === 'Total' || label === '') break;
                months.push(label);
              }
              break;
            }
          }
        }
        if (months.length > 0 && values.length !== months.length) {
          const len = values.length;
          if (metricKey === 'operatingIncome' && byCompany[currentCompany]) byCompany[currentCompany] = byCompany[currentCompany].slice(0, len);
          metricsByCompany[currentCompany][metricKey] = values.slice(0, months.length);
        }
      }
    }
  }

  // Sort months chronologically and reorder every aligned array to match.
  // This makes the dashboard resilient to CSVs whose month columns are in
  // arbitrary order (e.g. mixed years, reimported sheets).
  if (months.length > 1) {
    const order = months.map((_, i) => i).sort((a, b) => monthSortKey(months[a]) - monthSortKey(months[b]));
    const isAlreadySorted = order.every((v, i) => v === i);
    if (!isAlreadySorted) {
      const reorder = (arr) => order.map((i) => (arr && arr[i] !== undefined ? arr[i] : 0));
      months = order.map((i) => months[i]);
      for (const company of Object.keys(byCompany)) {
        byCompany[company] = reorder(byCompany[company]);
      }
      for (const company of Object.keys(metricsByCompany)) {
        for (const metric of Object.keys(metricsByCompany[company])) {
          metricsByCompany[company][metric] = reorder(metricsByCompany[company][metric]);
        }
      }
      // hcProjectedSales / varianceVsProjected were captured with the same
      // column layout as the metric rows, so they need the same reorder.
      // They were previously sliced to 12; respect whichever index range the
      // original order uses by mapping positions through `order`.
      const reorderCapped = (arr) => {
        if (!arr || arr.length === 0) return arr;
        return order
          .map((i) => (i < arr.length && arr[i] !== undefined ? arr[i] : null))
          .filter((v) => v !== null);
      };
      hcProjectedSales = reorderCapped(hcProjectedSales);
      varianceVsProjected = reorderCapped(varianceVsProjected);
    }
  }

  return { months, byCompany, metricsByCompany, hcProjectedSales, varianceVsProjected };
}

export function getChartData(months, byCompany, selectedCompanies) {
  if (!months.length) return [];
  const companies = Array.isArray(selectedCompanies)
    ? selectedCompanies.filter((c) => byCompany[c])
    : [selectedCompanies && byCompany[selectedCompanies] ? selectedCompanies : 'CONSOLIDATED'];
  if (companies.length === 0) return [];

  const companiesToSum = companies.filter((c) => c !== 'CONSOLIDATED');
  const consolidatedIsSumOfSelected = companies.includes('CONSOLIDATED');

  return months.map((month, i) => {
    const point = { month };
    companies.forEach((company) => {
      if (company === 'CONSOLIDATED' && consolidatedIsSumOfSelected) {
        const toSum = companiesToSum.length > 0 ? companiesToSum : Object.keys(byCompany).filter((c) => c !== 'CONSOLIDATED');
        point[company] = toSum.reduce((sum, c) => sum + (byCompany[c] && byCompany[c][i] !== undefined ? byCompany[c][i] : 0), 0);
      } else {
        const values = byCompany[company];
        point[company] = values && values[i] !== undefined ? values[i] : 0;
      }
    });
    if (companies.length === 1) point.value = point[companies[0]];
    return point;
  });
}
