import React, { useMemo } from 'react'
import {
  fmtMoney, fmtPct, fmtPctNoSign,
  formatMonthLong, chronologicalMonths,
  valueAt, pctChange, buildMonthlyPL, buildExecutiveNarrative,
} from './reportUtils'
import CommentaryBlock from './CommentaryBlock'

const ROW_DEFS = [
  { key: 'totalIncome', label: 'Total Income' },
  { key: 'cogs', label: 'Total COGS' },
  { key: 'grossProfit', label: 'Gross Profit' },
  { key: 'totalExpenses', label: 'Total Expenses' },
  { key: 'operatingIncome', label: 'Operating Income' },
]

export default function MBRReport({
  months,
  metricsByCompany,
  entities,
  hcKey,
  currentMonthLabel,
  previousMonthLabel,
  nextMonthLabel,
  yearSuffix,
}) {
  const narrative = useMemo(
    () => buildExecutiveNarrative({ metricsByCompany, months, currentMonthLabel, previousMonthLabel, hcKey }),
    [metricsByCompany, months, currentMonthLabel, previousMonthLabel, hcKey]
  )

  const yearMonths = useMemo(() => chronologicalMonths(months, yearSuffix), [months, yearSuffix])

  const currentPL = useMemo(
    () => buildMonthlyPL(metricsByCompany, months, entities, currentMonthLabel),
    [metricsByCompany, months, entities, currentMonthLabel]
  )

  const nextPL = useMemo(
    () => nextMonthLabel ? buildMonthlyPL(metricsByCompany, months, entities, nextMonthLabel) : null,
    [metricsByCompany, months, entities, nextMonthLabel]
  )

  // Revenue matrix (entities x months)
  const matrix = (metric) => {
    return entities
      .filter((e) => e.key !== 'CONSOLIDATED')
      .map((e) => ({
        label: e.label,
        values: yearMonths.map((m) => valueAt(metricsByCompany, e.key, metric, months, m)),
      }))
  }
  const revenueMatrix = useMemo(() => matrix('totalIncome'), [entities, metricsByCompany, months, yearMonths])
  const cogsMatrix = useMemo(() => matrix('cogs'), [entities, metricsByCompany, months, yearMonths])

  const totalRow = (data) => yearMonths.map((_, i) => data.reduce((s, r) => s + r.values[i], 0))
  const revenueTotals = useMemo(() => totalRow(revenueMatrix), [revenueMatrix, yearMonths])
  const cogsTotals = useMemo(() => totalRow(cogsMatrix), [cogsMatrix, yearMonths])

  const gpCurrentLabel = fmtMoney(narrative.gpCurr)
  const gmCurrentLabel = fmtPctNoSign(narrative.gmCurr)
  const revCurrentLabel = fmtMoney(narrative.revCurr)
  const revPrevLabel = fmtMoney(narrative.revPrev)
  const opiCurrentLabel = fmtMoney(narrative.opiCurr)
  const hcCurrentLabel = fmtMoney(narrative.hcCurr)
  const hcPrevLabel = fmtMoney(narrative.hcPrev)

  const bipsDirection = narrative.bipsDelta >= 0 ? 'increase' : 'decrease'
  const bipsAbs = Math.abs(narrative.bipsDelta)
  const revDeltaDollars = narrative.revCurr - narrative.revPrev
  const revDeltaDollarsLabel = fmtMoney(Math.abs(revDeltaDollars))

  // Operating income MoM (both $ and %), to mirror the revenue treatment
  const opiPrev = valueAt(metricsByCompany, 'CONSOLIDATED', 'operatingIncome', months, previousMonthLabel)
  const opiDeltaDollars = narrative.opiCurr - opiPrev
  const opiDeltaDollarsLabel = fmtMoney(Math.abs(opiDeltaDollars))
  const opiPctDelta = pctChange(narrative.opiCurr, opiPrev)
  const opiPrevLabel = fmtMoney(opiPrev)

  return (
    <div className="p-8 print:p-0 text-[11.5px] leading-snug">
      {/* Executive Summary */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Executive Summary</h2>
        <p className="mb-3">
          <strong>Revenue:</strong> {revCurrentLabel} ({fmtPct(narrative.revDelta, 1)} MoM) &nbsp;&middot;&nbsp; <strong>Gross Profit:</strong> {gpCurrentLabel} ({gmCurrentLabel} GM) &nbsp;&middot;&nbsp; <strong>Operating Income:</strong> {opiCurrentLabel} &nbsp;&middot;&nbsp; <strong>HC Share:</strong> {fmtPctNoSign(narrative.hcShare, 1)} ({fmtPct(narrative.hcDelta, 1)} MoM)
        </p>
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          <li>
            Total revenue {narrative.revDelta >= 0 ? 'grew' : 'declined'} {fmtPctNoSign(Math.abs(narrative.revDelta), 1)} ({narrative.revDelta >= 0 ? '+' : '-'}{revDeltaDollarsLabel}) month-over-month to {revCurrentLabel}, from {revPrevLabel} in {formatMonthLong(previousMonthLabel)}.
          </li>
          <li>
            HC remained the dominant revenue driver at {fmtPctNoSign(narrative.hcShare, 1)} of total revenue with {hcCurrentLabel}, {narrative.hcDelta >= 0 ? 'up' : 'down'} {fmtPctNoSign(Math.abs(narrative.hcDelta), 1)} from {hcPrevLabel} last month.
          </li>
          <li>
            Gross margin was {gmCurrentLabel}, a {bipsAbs} bips {bipsDirection} vs. {fmtPctNoSign(narrative.gmPrev)} last month.
          </li>
          <li>
            Operating income for the period: <strong>{opiCurrentLabel}</strong> — {opiDeltaDollars >= 0 ? 'an increase' : 'a decrease'} of {opiDeltaDollarsLabel} ({fmtPct(opiPctDelta, 1)} MoM) vs. {opiPrevLabel} in {formatMonthLong(previousMonthLabel)}.
          </li>
        </ul>
      </section>

      {/* Finance Team Commentary */}
      <section className="mb-6">
        <CommentaryBlock periodLabel={currentMonthLabel} reportType="mbr" />
      </section>

      {/* Revenue + COGS — landscape page 1 */}
      <div className="report-landscape">
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Revenue by entity — {yearSuffix === '26' ? '2026' : `20${yearSuffix}`}</h2>
          <MonthlyEntityTable
            rows={revenueMatrix}
            totals={revenueTotals}
            yearMonths={yearMonths}
            totalLabel="Total"
          />
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">COGS by entity — {yearSuffix === '26' ? '2026' : `20${yearSuffix}`}</h2>
          <MonthlyEntityTable
            rows={cogsMatrix}
            totals={cogsTotals}
            yearMonths={yearMonths}
            totalLabel="Total"
          />
        </section>
      </div>

      {/* P&L + Projection — landscape page 2 */}
      <div className="report-landscape">
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">P&amp;L by entity — {formatMonthLong(currentMonthLabel)}</h2>
          <PLTable rows={currentPL} />
        </section>
        {nextMonthLabel && nextPL && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Next-month projection — {formatMonthLong(nextMonthLabel)}</h2>
            <PLTable rows={nextPL} />
            <p className="text-xs text-slate-500 mt-2">Projection derived from the same forecast data shown on the Net Income dashboard.</p>
          </section>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, delta }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{label}</p>
      <p className="text-base font-semibold text-slate-900">{value}</p>
      {delta && <p className="text-xs text-slate-600 mt-0.5">{delta}</p>}
    </div>
  )
}

const MONTH_TO_ABBR = {
  January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr',
  May: 'May', June: 'Jun', July: 'Jul', August: 'Aug',
  September: 'Sep', October: 'Oct', November: 'Nov', December: 'Dec',
}
function abbrMonth(label) {
  const [name, yr] = String(label).split('-')
  const abbr = MONTH_TO_ABBR[name] || name
  return yr ? `${abbr}-${yr}` : abbr
}

function MonthlyEntityTable({ rows, totals, yearMonths, totalLabel }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[10.5px]">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="text-left py-1.5 px-2 font-semibold text-slate-700">Entity</th>
            {yearMonths.map((m) => (
              <th key={m} className="text-right py-1.5 px-2 font-semibold text-slate-700">{abbrMonth(m)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-slate-200">
              <td className="py-1.5 px-2 text-slate-800 font-medium">{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} className="text-right py-1.5 px-2 text-slate-700 tabular-nums">{fmtMoney(v)}</td>
              ))}
            </tr>
          ))}
          <tr className="bg-slate-50 border-t-2 border-slate-400">
            <td className="py-1.5 px-2 font-semibold text-slate-900">{totalLabel}</td>
            {totals.map((v, i) => (
              <td key={i} className="text-right py-1.5 px-2 font-semibold text-slate-900 tabular-nums">{fmtMoney(v)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function PLTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="text-left py-2 px-2 font-semibold text-slate-700">Line item</th>
            {rows.map((r) => (
              <th key={r.entity} className="text-right py-2 px-2 font-semibold text-slate-700">{r.entity}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROW_DEFS.map((def) => (
            <tr key={def.key} className={`border-b border-slate-200 ${def.key === 'grossProfit' || def.key === 'operatingIncome' ? 'bg-emerald-50 font-semibold' : ''}`}>
              <td className="py-1.5 px-2 text-slate-800">{def.label}</td>
              {rows.map((r) => (
                <td key={r.entity} className="text-right py-1.5 px-2 text-slate-700 tabular-nums">{fmtMoney(r[def.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
