import React, { useMemo } from 'react'
import {
  fmtMoney, fmtPct, fmtPctNoSign,
  formatMonthLong, chronologicalMonths,
  valueAt, pctChange, buildMonthlyPL, buildExecutiveNarrative, buildBusinessMix,
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
  mspKey,
  currentMonthLabel,
  previousMonthLabel,
  nextMonthLabel,
  yearSuffix,
}) {
  const narrative = useMemo(
    () => buildExecutiveNarrative({ metricsByCompany, months, currentMonthLabel, previousMonthLabel, hcKey }),
    [metricsByCompany, months, currentMonthLabel, previousMonthLabel, hcKey]
  )

  const mix = useMemo(
    () => buildBusinessMix({ metricsByCompany, months, monthLabel: currentMonthLabel, hcKey, mspKey }),
    [metricsByCompany, months, currentMonthLabel, hcKey, mspKey]
  )
  // MSP share of consolidated revenue, current vs prior month (for the header KPI).
  const mspShareCurr = narrative.revCurr !== 0 ? (mix.mspRev / narrative.revCurr) * 100 : 0
  const mspRevPrev = valueAt(metricsByCompany, mspKey, 'totalIncome', months, previousMonthLabel)
  const mspShareDelta = pctChange(mix.mspRev, mspRevPrev)

  const yearMonths = useMemo(() => chronologicalMonths(months, yearSuffix), [months, yearSuffix])

  const currentPL = useMemo(
    () => buildMonthlyPL(metricsByCompany, months, entities, currentMonthLabel),
    [metricsByCompany, months, entities, currentMonthLabel]
  )

  const nextPL = useMemo(
    () => nextMonthLabel ? buildMonthlyPL(metricsByCompany, months, entities, nextMonthLabel) : null,
    [metricsByCompany, months, entities, nextMonthLabel]
  )

  // YTD window = the year's months that come chronologically before the MBR
  // month (e.g. for May, this is Jan–Apr). Used as the YTD-average baseline.
  const ytdWindow = useMemo(() => {
    const idx = yearMonths.indexOf(currentMonthLabel)
    return idx > 0 ? yearMonths.slice(0, idx) : []
  }, [yearMonths, currentMonthLabel])

  // Consolidated P&L comparison: MBR month vs prior month and vs YTD average.
  const comparisonRows = useMemo(() => {
    return ROW_DEFS.map((def) => {
      const curr = valueAt(metricsByCompany, 'CONSOLIDATED', def.key, months, currentMonthLabel)
      const prev = valueAt(metricsByCompany, 'CONSOLIDATED', def.key, months, previousMonthLabel)
      const avg = ytdWindow.length
        ? ytdWindow.reduce((s, m) => s + valueAt(metricsByCompany, 'CONSOLIDATED', def.key, months, m), 0) / ytdWindow.length
        : null
      // COGS and Expenses are stored as negatives. Base their variance on
      // magnitude so a larger cost reads as a positive change (both $ and %),
      // e.g. -606k vs -549k is "+$57k / +10%", not "-$57k / -10%".
      const isCost = def.key === 'cogs' || def.key === 'totalExpenses'
      const vCurr = isCost ? Math.abs(curr) : curr
      const vPrev = isCost ? Math.abs(prev) : prev
      const vAvg = avg == null ? null : (isCost ? Math.abs(avg) : avg)
      return {
        key: def.key,
        label: def.label,
        curr,
        prev,
        momDollar: vCurr - vPrev,
        momPct: pctChange(vCurr, vPrev),
        avg,
        avgDollar: vAvg == null ? null : vCurr - vAvg,
        avgPct: vAvg == null ? null : pctChange(vCurr, vAvg),
      }
    })
  }, [metricsByCompany, months, currentMonthLabel, previousMonthLabel, ytdWindow])

  const ytdRangeLabel = ytdWindow.length
    ? `${shortName(ytdWindow[0])}–${shortName(ytdWindow[ytdWindow.length - 1])}`
    : ''

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
          <strong>Revenue:</strong> {revCurrentLabel} ({fmtPct(narrative.revDelta, 1)} MoM) &nbsp;&middot;&nbsp; <strong>Gross Profit:</strong> {gpCurrentLabel} ({gmCurrentLabel} GM) &nbsp;&middot;&nbsp; <strong>Operating Income:</strong> {opiCurrentLabel} &nbsp;&middot;&nbsp; <strong>HC Share:</strong> {fmtPctNoSign(narrative.hcShare, 1)} ({fmtPct(narrative.hcDelta, 1)} MoM){mix.mspActive && (<> &nbsp;&middot;&nbsp; <strong>MSP Share:</strong> {fmtPctNoSign(mspShareCurr, 1)} ({fmtPct(mspShareDelta, 1)} MoM)</>)}
        </p>
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          <li>
            Total revenue {narrative.revDelta >= 0 ? 'grew' : 'declined'} {fmtPctNoSign(Math.abs(narrative.revDelta), 1)} ({narrative.revDelta >= 0 ? '+' : '-'}{revDeltaDollarsLabel}) month-over-month to {revCurrentLabel}, from {revPrevLabel} in {formatMonthLong(previousMonthLabel)}.
          </li>
          <li>
            HC remained the dominant revenue driver at {fmtPctNoSign(narrative.hcShare, 1)} of total revenue with {hcCurrentLabel}, {narrative.hcDelta >= 0 ? 'up' : 'down'} {fmtPctNoSign(Math.abs(narrative.hcDelta), 1)} from {hcPrevLabel} last month.
          </li>
          {mix.mspActive && (
            <li>
              MSP, the managed-services line carved out of HC, contributed {fmtMoney(mix.mspRev)} ({fmtPctNoSign(mspShareCurr, 1)} of total revenue) at a {fmtPctNoSign(mix.mspGm, 1)} gross margin — a {Math.abs(mix.premiumPts).toFixed(1)}-point {mix.premiumPts >= 0 ? 'premium' : 'discount'} to HC&rsquo;s {fmtPctNoSign(mix.hcGm, 1)} — while representing {fmtPctNoSign(mix.mspGpShareOfHc, 1)} of HC&rsquo;s gross profit.
            </li>
          )}
          <li>
            Gross margin was {gmCurrentLabel}, a {bipsAbs} bips {bipsDirection} vs. {fmtPctNoSign(narrative.gmPrev)} last month.
          </li>
          <li>
            Operating income for the period: <strong>{opiCurrentLabel}</strong> — {opiDeltaDollars >= 0 ? 'an increase' : 'a decrease'} of {opiDeltaDollarsLabel} ({fmtPct(opiPctDelta, 1)} MoM) vs. {opiPrevLabel} in {formatMonthLong(previousMonthLabel)}.
          </li>
        </ul>
      </section>

      {/* Business mix — HC vs. MSP */}
      {mix.mspActive && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Business mix — HC vs. MSP</h2>
          <p className="text-slate-700">
            HC, the traditional staffing model, generated {fmtMoney(mix.hcRev)} in revenue at a {fmtPctNoSign(mix.hcGm, 1)} gross margin, while MSP — where a managed-services layer sits on top of the same contractor placement — delivered {fmtMoney(mix.mspRev)} at a {fmtPctNoSign(mix.mspGm, 1)} gross margin, a {Math.abs(mix.premiumPts).toFixed(1)}-point {mix.premiumPts >= 0 ? 'premium' : 'discount'}. MSP billed {fmtPctNoSign(mix.mspRevShareOfHc, 1)} of HC&rsquo;s revenue but contributed {fmtPctNoSign(mix.mspGpShareOfHc, 1)} of its gross profit, so each MSP dollar drives roughly {mix.gpPerDollarRatio.toFixed(1)}&times; the gross profit of a traditional staffing dollar. Combined, the two lines produced {fmtMoney(mix.combGp)} of gross profit on {fmtMoney(mix.combRev)} of revenue ({fmtPctNoSign(mix.blendedGm, 1)} blended margin){mix.blendedGm > mix.hcGm ? ', with MSP pulling the blended figure above HC’s standalone level' : ''}.
          </p>
        </section>
      )}

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

      {/* P&L by entity + comparison + next-month projection — landscape page 2.
          break-inside-avoid keeps each table whole if the page ever overflows. */}
      <div className="report-landscape">
        <section className="mb-3 break-inside-avoid">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">P&amp;L by entity — {formatMonthLong(currentMonthLabel)}</h2>
          <PLTable rows={currentPL} />
        </section>
        <section className="mb-3 break-inside-avoid">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">P&amp;L comparison — {formatMonthLong(currentMonthLabel)} vs prior month &amp; YTD average</h2>
          <ComparisonTable
            rows={comparisonRows}
            currentLabel={currentMonthLabel}
            previousLabel={previousMonthLabel}
            ytdRangeLabel={ytdRangeLabel}
          />
          <p className="text-xs text-slate-500 mt-1">
            Consolidated figures. YTD average is the simple monthly mean over {ytdRangeLabel || 'prior months this year'}, excluding {abbrMonth(currentMonthLabel).split('-')[0]}.
          </p>
        </section>
        {nextMonthLabel && nextPL && (
          <section className="mb-3 break-inside-avoid">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Next-month projection — {formatMonthLong(nextMonthLabel)}</h2>
            <PLTable rows={nextPL} />
            <p className="text-xs text-slate-500 mt-1">Projection derived from the same forecast data shown on the Net Income dashboard.</p>
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
function shortName(label) {
  return abbrMonth(label).split('-')[0]
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

function ComparisonTable({ rows, currentLabel, previousLabel, ytdRangeLabel }) {
  const currHdr = abbrMonth(currentLabel)
  const prevHdr = abbrMonth(previousLabel)
  const avgHdr = ytdRangeLabel ? `YTD avg (${ytdRangeLabel})` : 'YTD avg'
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[10.5px]">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="text-left py-1.5 px-2 font-semibold text-slate-700">Line item</th>
            <th className="text-right py-1.5 px-2 font-semibold text-slate-700">{currHdr}</th>
            <th className="text-right py-1.5 px-2 font-semibold text-slate-700">{prevHdr}</th>
            <th className="text-right py-1.5 px-2 font-semibold text-slate-700">Δ $ MoM</th>
            <th className="text-right py-1.5 px-2 font-semibold text-slate-700">Δ % MoM</th>
            <th className="text-right py-1.5 px-2 font-semibold text-slate-700">{avgHdr}</th>
            <th className="text-right py-1.5 px-2 font-semibold text-slate-700">Δ $ vs avg</th>
            <th className="text-right py-1.5 px-2 font-semibold text-slate-700">Δ % vs avg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const emphasize = r.key === 'grossProfit' || r.key === 'operatingIncome'
            return (
              <tr key={r.key} className={`border-b border-slate-200 ${emphasize ? 'bg-emerald-50 font-semibold' : ''}`}>
                <td className="py-1.5 px-2 text-slate-800">{r.label}</td>
                <td className="text-right py-1.5 px-2 text-slate-700 tabular-nums">{fmtMoney(r.curr)}</td>
                <td className="text-right py-1.5 px-2 text-slate-700 tabular-nums">{fmtMoney(r.prev)}</td>
                <td className="text-right py-1.5 px-2 text-slate-700 tabular-nums">{fmtSignedMoney(r.momDollar)}</td>
                <td className="text-right py-1.5 px-2 text-slate-700 tabular-nums">{fmtPct(r.momPct, 1)}</td>
                <td className="text-right py-1.5 px-2 text-slate-700 tabular-nums">{r.avg == null ? '—' : fmtMoney(r.avg)}</td>
                <td className="text-right py-1.5 px-2 text-slate-700 tabular-nums">{r.avgDollar == null ? '—' : fmtSignedMoney(r.avgDollar)}</td>
                <td className="text-right py-1.5 px-2 text-slate-700 tabular-nums">{r.avgPct == null ? '—' : fmtPct(r.avgPct, 1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function fmtSignedMoney(value) {
  if (value == null || isNaN(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${fmtMoney(Math.abs(value))}`
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
