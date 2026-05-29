import React, { useMemo } from 'react'
import {
  fmtMoney, fmtPct, fmtPctNoSign,
  formatMonthLong,
  valueAt, pctChange,
  buildMonthlyPL, buildExecutiveNarrative,
  computeOverdueInvoices,
  rollingAvg, rollingRatio, priorMonthsWindow,
} from './reportUtils'
import CommentaryBlock from './CommentaryBlock'

const ROW_DEFS = [
  { key: 'totalIncome', label: 'Total Income' },
  { key: 'cogs', label: 'Total COGS' },
  { key: 'grossProfit', label: 'Gross Profit' },
  { key: 'totalExpenses', label: 'Total Expenses' },
  { key: 'operatingIncome', label: 'Operating Income' },
]

export default function WBRReport({
  months,
  metricsByCompany,
  entities,
  hcKey,
  currentMonthLabel,
  previousMonthLabel,
  nextMonthLabel,
  invoices,
}) {
  const narrative = useMemo(
    () => buildExecutiveNarrative({ metricsByCompany, months, currentMonthLabel, previousMonthLabel, hcKey }),
    [metricsByCompany, months, currentMonthLabel, previousMonthLabel, hcKey]
  )

  const currentPL = useMemo(
    () => buildMonthlyPL(metricsByCompany, months, entities, currentMonthLabel),
    [metricsByCompany, months, entities, currentMonthLabel]
  )
  const prevPL = useMemo(
    () => buildMonthlyPL(metricsByCompany, months, entities, previousMonthLabel),
    [metricsByCompany, months, entities, previousMonthLabel]
  )
  const nextPL = useMemo(
    () => nextMonthLabel ? buildMonthlyPL(metricsByCompany, months, entities, nextMonthLabel) : null,
    [metricsByCompany, months, entities, nextMonthLabel]
  )

  // Exclude Hiptrain invoices from the WBR overdue table.
  const overdue = useMemo(
    () => computeOverdueInvoices(invoices).filter(
      (inv) => !String(inv.client || '').toLowerCase().includes('hiptrain')
    ),
    [invoices]
  )
  const overdueTotal = overdue.reduce((s, inv) => s + (Number(inv.amount) || 0), 0)

  // Consolidated current-month figures
  const revCurr = narrative.revCurr
  const gpCurr = narrative.gpCurr
  const gmCurr = narrative.gmCurr
  const opiCurr = narrative.opiCurr
  const totalCogsCurr = valueAt(metricsByCompany, 'CONSOLIDATED', 'cogs', months, currentMonthLabel)
  const totalExpCurr = valueAt(metricsByCompany, 'CONSOLIDATED', 'totalExpenses', months, currentMonthLabel)
  const cogsPctOfRev = revCurr !== 0 ? (totalCogsCurr / revCurr) * 100 : 0
  const expPctOfRev = revCurr !== 0 ? (totalExpCurr / revCurr) * 100 : 0

  // Prior single month kept only for the Net Income bullet's contextual aside.
  const opiPrev = valueAt(metricsByCompany, 'CONSOLIDATED', 'operatingIncome', months, previousMonthLabel)

  // Trailing 6-month baselines (window excludes current month, see priorMonthsWindow).
  // If fewer than 6 prior months are present in the dataset, the helper falls back
  // to whatever is available (e.g. for a May-26 current with data starting Jan-26,
  // the window is Jan–Apr-26, i.e. 4 months).
  const window6m = useMemo(
    () => priorMonthsWindow(months, currentMonthLabel, 6),
    [months, currentMonthLabel]
  )
  const window6mCount = window6m.length
  const window6mLabel = window6mCount > 0 ? `${window6mCount}m avg` : '6m avg'

  const rev6m = useMemo(
    () => rollingAvg(metricsByCompany, 'CONSOLIDATED', 'totalIncome', months, currentMonthLabel, 6),
    [metricsByCompany, months, currentMonthLabel]
  )
  const opi6m = useMemo(
    () => rollingAvg(metricsByCompany, 'CONSOLIDATED', 'operatingIncome', months, currentMonthLabel, 6),
    [metricsByCompany, months, currentMonthLabel]
  )
  const gm6m = useMemo(
    () => rollingRatio(metricsByCompany, 'CONSOLIDATED', 'grossProfit', 'totalIncome', months, currentMonthLabel, 6),
    [metricsByCompany, months, currentMonthLabel]
  )
  const expRatio6m = useMemo(
    () => rollingRatio(metricsByCompany, 'CONSOLIDATED', 'totalExpenses', 'totalIncome', months, currentMonthLabel, 6),
    [metricsByCompany, months, currentMonthLabel]
  )

  // Deltas vs the 6-month baseline. Each guarded against a null baseline
  // (the case when currentMonthLabel is the earliest month in the dataset).
  const revDelta6m = rev6m != null ? revCurr - rev6m : null
  const revPct6m = rev6m != null ? pctChange(revCurr, rev6m) : null
  const opiDelta6m = opi6m != null ? opiCurr - opi6m : null
  const opiPct6m = opi6m != null ? pctChange(opiCurr, opi6m) : null
  const gmBips6m = gm6m != null ? Math.round((gmCurr - gm6m) * 100) : null
  const expBips6m = expRatio6m != null ? Math.round((expPctOfRev - expRatio6m) * 100) : null

  // Net income bullet keeps the prior single-month value for context.
  const opiDeltaPrev = opiCurr - opiPrev

  return (
    <div className="p-8 print:p-0 text-[11.5px] leading-snug">
      {/* Executive Summary + Commentary + Financial Analysis — portrait page 1 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Executive Summary</h2>
        <p className="mb-3">
          <strong>Revenue:</strong> {fmtMoney(revCurr)}{revPct6m != null && (<> ({fmtPct(revPct6m, 1)} vs {window6mLabel}, {revDelta6m >= 0 ? '+' : '-'}{fmtMoney(Math.abs(revDelta6m))})</>)} &nbsp;&middot;&nbsp; <strong>Gross Profit:</strong> {fmtMoney(gpCurr)} ({fmtPctNoSign(gmCurr)} margin) &nbsp;&middot;&nbsp; <strong>Operating Income:</strong> {fmtMoney(opiCurr)}{opiPct6m != null && (<> ({fmtPct(opiPct6m, 1)} vs {window6mLabel}, {opiDelta6m >= 0 ? '+' : '-'}{fmtMoney(Math.abs(opiDelta6m))})</>)} &nbsp;&middot;&nbsp; <strong>Overdue AR:</strong> {fmtMoney(overdueTotal)} ({overdue.length} invoices)
        </p>
        <div className="space-y-1.5 text-slate-700">
          <p>
            <strong>Cost of goods sold:</strong> total COGS of {fmtMoney(totalCogsCurr)} represents {fmtPctNoSign(cogsPctOfRev)} of revenue.
          </p>
          <p>
            <strong>Gross profit:</strong> {fmtMoney(gpCurr)} — {fmtPctNoSign(gmCurr)} of revenue
            {gmBips6m != null
              ? <>, {Math.abs(gmBips6m)} bips {gmBips6m >= 0 ? 'increase' : 'decrease'} vs. {window6mLabel} ({fmtPctNoSign(gm6m)}).</>
              : <>.</>}
          </p>
          <p>
            <strong>Expenses:</strong> estimated expenses of {fmtMoney(totalExpCurr)} ({fmtPctNoSign(expPctOfRev)} of revenue).
            {expBips6m != null
              ? <> Exp/Rev {expBips6m >= 0 ? 'increased' : 'decreased'} {Math.abs(expBips6m)} bips vs. {window6mLabel} ({fmtPctNoSign(expRatio6m)}).</>
              : null}
          </p>
          <p>
            <strong>Net Income:</strong> operating income of {fmtMoney(opiCurr)}
            {opi6m != null
              ? <> — {opiDelta6m >= 0 ? 'an increase' : 'a decrease'} of {fmtMoney(Math.abs(opiDelta6m))} ({fmtPct(opiPct6m, 1)}) vs. {window6mLabel} ({fmtMoney(opi6m)}).</>
              : <>.</>}
            {' '}Last month ({formatMonthLong(previousMonthLabel)}): {fmtMoney(opiPrev)} ({opiDeltaPrev >= 0 ? '+' : '-'}{fmtMoney(Math.abs(opiDeltaPrev))} MoM).
          </p>
        </div>
      </section>

      <section className="mb-6">
        <CommentaryBlock periodLabel={currentMonthLabel} reportType="wbr" />
      </section>

      {/* Current-month P&L + MoM comparison — landscape page 1 */}
      <div className="report-landscape">
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Current-month forecast — {formatMonthLong(currentMonthLabel)}</h2>
          <PLTable rows={currentPL} />
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">P&amp;L comparison — {formatMonthLong(previousMonthLabel)} vs. {formatMonthLong(currentMonthLabel)}</h2>
          <MoMTable
            label1={formatMonthLong(previousMonthLabel)}
            label2={formatMonthLong(currentMonthLabel)}
            metricsByCompany={metricsByCompany}
            months={months}
            left={previousMonthLabel}
            right={currentMonthLabel}
          />
        </section>
      </div>

      {/* Next-month forecast + Overdue AR — landscape page 2 */}
      <div className="report-landscape">
        {nextMonthLabel && nextPL && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Next-month forecast — {formatMonthLong(nextMonthLabel)}</h2>
            <PLTable rows={nextPL} />
          </section>
        )}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">AR — Overdue invoices</h2>
          {overdue.length === 0 ? (
            <p className="text-slate-600 italic">No overdue invoices.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Customer</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-700">Amount</th>
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Due date</th>
                    <th className="text-right py-2 px-2 font-semibold text-slate-700">Days overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.slice(0, 30).map((inv, i) => {
                    const due = inv.dueDate instanceof Date ? inv.dueDate : new Date(inv.dueDate)
                    const today = new Date(); today.setHours(0,0,0,0)
                    const days = Math.floor((today - due) / (1000 * 60 * 60 * 24))
                    return (
                      <tr key={i} className="border-b border-slate-200">
                        <td className="py-1.5 px-2 text-slate-800">{inv.client}</td>
                        <td className="text-right py-1.5 px-2 tabular-nums text-slate-800">{fmtMoney(inv.amount)}</td>
                        <td className="py-1.5 px-2 text-slate-700">{due.toLocaleDateString('en-US')}</td>
                        <td className={`text-right py-1.5 px-2 tabular-nums font-medium ${days > 30 ? 'text-rose-700' : days > 14 ? 'text-amber-700' : 'text-slate-700'}`}>{days}</td>
                      </tr>
                    )
                  })}
                  <tr className="bg-slate-50 border-t-2 border-slate-400">
                    <td className="py-1.5 px-2 font-semibold text-slate-900">Total ({overdue.length})</td>
                    <td className="text-right py-1.5 px-2 font-semibold text-slate-900 tabular-nums">{fmtMoney(overdueTotal)}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
              {overdue.length > 30 && <p className="text-xs text-slate-500 mt-2">Showing top 30 of {overdue.length} overdue invoices.</p>}
            </div>
          )}
        </section>
      </div>
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

function MoMTable({ label1, label2, metricsByCompany, months, left, right }) {
  const consolidated = ROW_DEFS.map((def) => {
    const l = valueAt(metricsByCompany, 'CONSOLIDATED', def.key, months, left)
    const r = valueAt(metricsByCompany, 'CONSOLIDATED', def.key, months, right)
    const delta = r - l
    const pct = pctChange(r, l)
    return { def, left: l, right: r, delta, pct }
  })
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="text-left py-2 px-2 font-semibold text-slate-700">Line item</th>
            <th className="text-right py-2 px-2 font-semibold text-slate-700">{label1}</th>
            <th className="text-right py-2 px-2 font-semibold text-slate-700">{label2}</th>
            <th className="text-right py-2 px-2 font-semibold text-slate-700">Δ USD</th>
            <th className="text-right py-2 px-2 font-semibold text-slate-700">Δ %</th>
          </tr>
        </thead>
        <tbody>
          {consolidated.map((row) => (
            <tr key={row.def.key} className={`border-b border-slate-200 ${row.def.key === 'operatingIncome' ? 'bg-emerald-50 font-semibold' : ''}`}>
              <td className="py-1.5 px-2 text-slate-800">{row.def.label}</td>
              <td className="text-right py-1.5 px-2 tabular-nums text-slate-700">{fmtMoney(row.left)}</td>
              <td className="text-right py-1.5 px-2 tabular-nums text-slate-700">{fmtMoney(row.right)}</td>
              <td className={`text-right py-1.5 px-2 tabular-nums ${row.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmtMoney(row.delta)}</td>
              <td className={`text-right py-1.5 px-2 tabular-nums ${row.pct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{fmtPct(row.pct, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
