import React, { useEffect, useMemo, useState } from 'react'
import {
  fmtMoney, fmtPct, fmtPctNoSign,
  formatMonthLong,
  valueAt, pctChange,
  buildMonthlyPL, buildExecutiveNarrative,
  computeOverdueInvoices, summarizeGpByClient,
} from './reportUtils'
import { supabase, isSupabaseConfigured } from '../../../lib/supabase'

const _IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

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
  const [talentRows, setTalentRows] = useState(null)
  const [talentLoading, setTalentLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (_IS_DEMO || !isSupabaseConfigured()) {
        if (!cancelled) { setTalentRows([]); setTalentLoading(false) }
        return
      }
      try {
        const { data, error } = await supabase
          .from('talent_pool')
          .select('company, rate, actual_cost, net_margin, rate_type, status')
        if (error) throw error
        if (!cancelled) { setTalentRows(data || []); setTalentLoading(false) }
      } catch (err) {
        console.warn('Failed to load talent_pool for WBR:', err)
        if (!cancelled) { setTalentRows([]); setTalentLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

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

  const overdue = useMemo(() => computeOverdueInvoices(invoices), [invoices])
  const overdueTotal = overdue.reduce((s, inv) => s + (Number(inv.amount) || 0), 0)

  const gpByClient = useMemo(() => summarizeGpByClient(talentRows || []), [talentRows])

  // Consolidated comparison figures
  const revCurr = narrative.revCurr
  const revPrev = narrative.revPrev
  const gpCurr = narrative.gpCurr
  const gmCurr = narrative.gmCurr
  const gmPrev = narrative.gmPrev
  const opiCurr = narrative.opiCurr
  const totalCogsCurr = valueAt(metricsByCompany, 'CONSOLIDATED', 'cogs', months, currentMonthLabel)
  const totalExpCurr = valueAt(metricsByCompany, 'CONSOLIDATED', 'totalExpenses', months, currentMonthLabel)
  const totalExpPrev = valueAt(metricsByCompany, 'CONSOLIDATED', 'totalExpenses', months, previousMonthLabel)
  const cogsPctOfRev = revCurr !== 0 ? (totalCogsCurr / revCurr) * 100 : 0
  const expPctOfRev = revCurr !== 0 ? (totalExpCurr / revCurr) * 100 : 0
  const expPctOfRevPrev = revPrev !== 0 ? (totalExpPrev / revPrev) * 100 : 0
  const expBipsChange = Math.round((expPctOfRev - expPctOfRevPrev) * 100)
  const opiPrev = valueAt(metricsByCompany, 'CONSOLIDATED', 'operatingIncome', months, previousMonthLabel)
  const opiDelta = opiCurr - opiPrev

  const hcKeyLabel = _IS_DEMO ? hcKey : 'HC'

  return (
    <div className="p-8 print:p-0 text-[11.5px] leading-snug">
      {/* Cover */}
      <section className="pb-5 border-b border-slate-300 mb-5">
        <p className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Weekly Business Review</p>
        <h1 className="text-3xl font-bold text-slate-900 mt-1">{formatMonthLong(currentMonthLabel)}</h1>
        <p className="text-slate-600 mt-1">Ryz Holding — weekly forecast and operational metrics</p>
      </section>

      {/* Forecast / Current month P&L */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Current-month forecast — {formatMonthLong(currentMonthLabel)}</h2>
        <PLTable rows={currentPL} />
      </section>

      {/* Financial Analysis narrative */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Financial Analysis</h2>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <Kpi label="Revenue" value={fmtMoney(revCurr)} delta={fmtPct(narrative.revDelta, 1) + ' MoM'} />
          <Kpi label="Gross Profit" value={fmtMoney(gpCurr)} delta={`${fmtPctNoSign(gmCurr)} margin`} />
          <Kpi label="Operating Income" value={fmtMoney(opiCurr)} delta={`${fmtMoney(opiDelta)} MoM`} />
          <Kpi label="Overdue AR" value={fmtMoney(overdueTotal)} delta={`${overdue.length} invoices`} />
        </div>

        <div className="space-y-2 text-slate-700">
          <p>
            <strong>Cost of goods sold:</strong> total COGS of {fmtMoney(totalCogsCurr)} represents {fmtPctNoSign(cogsPctOfRev)} of revenue.
          </p>
          <p>
            <strong>Gross profit:</strong> {fmtMoney(gpCurr)} — {fmtPctNoSign(gmCurr)} of revenue, {Math.abs(Math.round((gmCurr - gmPrev) * 100))} bips {gmCurr >= gmPrev ? 'increase' : 'decrease'} vs. last month ({fmtPctNoSign(gmPrev)}).
          </p>
          <p>
            <strong>Expenses:</strong> estimated expenses of {fmtMoney(totalExpCurr)} ({fmtPctNoSign(expPctOfRev)} of revenue). Exp/Rev {expBipsChange >= 0 ? 'increased' : 'decreased'} {Math.abs(expBipsChange)} bips vs. last month.
          </p>
          <p>
            <strong>Net Income:</strong> operating income of {fmtMoney(opiCurr)} — {opiDelta >= 0 ? 'an increase' : 'a decrease'} of {fmtMoney(Math.abs(opiDelta))} vs. {formatMonthLong(previousMonthLabel)} ({fmtMoney(opiPrev)}).
          </p>
        </div>
      </section>

      {/* Month-over-month compare */}
      <section className="mb-6 page-break-before">
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

      {/* Next-month forecast */}
      {nextMonthLabel && nextPL && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Next-month forecast — {formatMonthLong(nextMonthLabel)}</h2>
          <PLTable rows={nextPL} />
        </section>
      )}

      {/* Overdue AR */}
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

      {/* Operational metrics: GP per client */}
      <section className="mb-6 page-break-before">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Operational metrics — Gross Margin per placement by client</h2>
        {talentLoading ? (
          <p className="text-slate-500 italic">Loading talent pool data...</p>
        ) : gpByClient.length === 0 ? (
          <p className="text-slate-600 italic">Talent pool data unavailable.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="text-left py-2 px-2 font-semibold text-slate-700">Company</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-700">Placements</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-700">Avg. GM per placement</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-700">Avg. GM (USD)</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-700">Median GM (USD)</th>
                </tr>
              </thead>
              <tbody>
                {gpByClient.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-200 ${row.isTotal ? 'bg-slate-50 border-t-2 border-slate-400 font-semibold' : ''}`}>
                    <td className="py-1.5 px-2 text-slate-800">{row.company}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums text-slate-700">{row.placements}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums text-slate-700">{fmtPctNoSign(row.avgGpPct)}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums text-slate-700">{fmtMoney(row.avgGp)}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums text-slate-700">{row.medianGp !== null ? fmtMoney(row.medianGp) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-2">Monthly contractors only. Data sourced from the GP Analysis talent pool.</p>
          </div>
        )}
      </section>

      <footer className="pt-3 border-t border-slate-300 text-[10px] text-slate-500 mt-6">
        Confidential — Ryz Labs — generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </footer>
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
