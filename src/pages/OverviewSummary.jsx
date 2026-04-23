import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useDataCache, IS_DEMO } from '../lib/DataCacheContext'
import { monthSortKey } from '../dashboards/netincome/utils/parseFinancialCsv'

const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const ABBR_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function fmtMoney(n) {
  if (n == null || isNaN(n)) return '—'
  const rounded = Math.round(n)
  const sign = rounded < 0 ? '-' : ''
  return `${sign}$${Math.abs(rounded).toLocaleString('en-US')}`
}

function fmtMoneyShort(n) {
  if (n == null || isNaN(n)) return '—'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`
  return `${sign}$${Math.round(abs)}`
}

function fmtPct(n, digits = 1) {
  if (n == null || isNaN(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(digits)}%`
}

function fmtDate(d) {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

/**
 * Parse a net-income period label ("April-26", "Apr-2026") into
 * { monthIndex, year }. Falls back gracefully on malformed input.
 */
function parsePeriodLabel(label) {
  if (!label) return null
  const parts = String(label).split(/[-\s/]/)
  const name = (parts[0] || '').trim()
  let mi = ABBR_MONTHS.indexOf(name)
  if (mi < 0) mi = FULL_MONTHS.indexOf(name)
  if (mi < 0) return null
  const rawYr = parts[1] ? parseInt(parts[1], 10) : NaN
  if (isNaN(rawYr)) return null
  const year = rawYr < 100 ? 2000 + rawYr : rawYr
  return { monthIndex: mi, year }
}

/** talent_pool.month is stored as "MM/YY". Build that key from a period label. */
function talentPoolMonthKey(label) {
  const parsed = parsePeriodLabel(label)
  if (!parsed) return null
  const mm = String(parsed.monthIndex + 1).padStart(2, '0')
  const yy = String(parsed.year).slice(-2)
  return `${mm}/${yy}`
}

function longMonthLabel(label) {
  const parsed = parsePeriodLabel(label)
  if (!parsed) return label || ''
  return `${FULL_MONTHS[parsed.monthIndex]} ${parsed.year}`
}

function SummaryCard({ eyebrow, headline, subhead, narrative, to, cta, tone = 'ink' }) {
  const toneColor = tone === 'pos' ? 'var(--pos)' : tone === 'neg' ? 'var(--neg)' : 'var(--ink)'
  return (
    <Link
      to={to}
      className="ledger-card p-5 flex flex-col"
      style={{ textDecoration: 'none', color: 'inherit', transition: 'border-color 0.12s, background 0.12s' }}
      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--line-strong)'; e.currentTarget.style.background = 'var(--row-hover)' }}
      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--bg-card)' }}
    >
      <div className="ledger-eyebrow mb-2">{eyebrow}</div>
      <div className="ledger-serif" style={{ fontSize: 26, lineHeight: 1.15, color: toneColor, marginBottom: 4 }}>
        {headline}
      </div>
      {subhead && (
        <div style={{ fontSize: 12, color: 'var(--ink-dim)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em', marginBottom: 10 }}>
          {subhead}
        </div>
      )}
      <p style={{ fontSize: 13, color: 'var(--ink-dim)', lineHeight: 1.5, margin: 0, flex: 1 }}>
        {narrative}
      </p>
      <div style={{ marginTop: 14, fontSize: 11, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {cta} →
      </div>
    </Link>
  )
}

export default function OverviewSummary() {
  const { fetchNetIncome, fetchAP, fetchCashflow } = useDataCache()
  const [netIncome, setNetIncome] = useState(null)
  const [cashBalance, setCashBalance] = useState(null)
  const [outgoingPayments, setOutgoingPayments] = useState([])
  const [arInvoices, setArInvoices] = useState([])
  const [apInvoices, setApInvoices] = useState([])
  const [talentRows, setTalentRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetchNetIncome(false)
      .then((d) => { if (!cancelled) setNetIncome(d) })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load net income') })

    fetchAP(false)
      .then((d) => { if (!cancelled && Array.isArray(d)) setApInvoices(d) })
      .catch(() => {})

    fetchCashflow(false)
      .then((d) => { if (!cancelled && Array.isArray(d)) setArInvoices(d) })
      .catch(() => {})

    if (IS_DEMO || !isSupabaseConfigured()) {
      if (!cancelled) { setCashBalance(null); setTalentRows([]) }
      return () => { cancelled = true }
    }

    supabase
      .from('cashflow_settings')
      .select('current_balance, outgoing_payments')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setCashBalance(Number(data?.current_balance) || 0)
        setOutgoingPayments(Array.isArray(data?.outgoing_payments) ? data.outgoing_payments : [])
      })

    // Pull only the columns we need, and ensure we fetch enough rows to
    // cover the current + previous calendar months even if the table grows
    // past Supabase's default 1000-row limit.
    supabase
      .from('talent_pool')
      .select('status, net_margin, month')
      .range(0, 9999)
      .then(({ data }) => { if (!cancelled) setTalentRows(data || []) })

    return () => { cancelled = true }
  }, [fetchNetIncome, fetchAP, fetchCashflow])

  // ── Derive current / previous month ───────────────────────────────────────
  // The "current month" is today's calendar month (so the Overview reflects
  // real-world time, not the furthest forecast period in the dataset). We
  // pick the matching label from netIncome.months so downstream lookups work;
  // if today's month isn't in the dataset, we fall back to the latest past
  // month that is ≤ today.
  const { currentMonth, prevMonth } = useMemo(() => {
    if (!netIncome?.months?.length) return { currentMonth: null, prevMonth: null }
    const sorted = [...netIncome.months].sort((a, b) => monthSortKey(a) - monthSortKey(b))
    const now = new Date()
    const todayKey = now.getFullYear() * 12 + now.getMonth()

    // Exact match for today's month, else the latest month ≤ today, else latest.
    let curr = sorted.find((m) => monthSortKey(m) === todayKey)
    if (!curr) {
      const pastOrNow = sorted.filter((m) => monthSortKey(m) <= todayKey)
      curr = pastOrNow.length ? pastOrNow[pastOrNow.length - 1] : sorted[sorted.length - 1]
    }

    const currIdx = sorted.indexOf(curr)
    const prev = currIdx > 0 ? sorted[currIdx - 1] : null
    return { currentMonth: curr, prevMonth: prev }
  }, [netIncome])

  const currentMonthName = longMonthLabel(currentMonth)

  // ── Cash position ────────────────────────────────────────────────────────
  // Find the next payroll/payroll-estimate item in the AP tab, then simulate
  // the cashflow between today and that payroll's due date (mirroring the
  // Cashflow Simulator's logic: AR income on due date, overdue AR/AP shifted
  // +7d, AP outflows on due date, manual outgoing_payments on their date) so
  // the projected balance matches what the Cashflow tab displays.
  const cash = useMemo(() => {
    if (cashBalance == null) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const isPayroll = (inv) => {
      const haystack = [inv.description, inv.vendor, inv.category, inv.invoiceNumber, inv.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes('payroll')
    }

    // Find the next payroll AP entry (not PAID/VOID) due on or after today.
    const payrollCandidates = (apInvoices || [])
      .filter((inv) => {
        const status = String(inv.status || '').toUpperCase()
        if (status === 'PAID' || status === 'VOID') return false
        if (!inv.dueDate) return false
        const due = inv.dueDate instanceof Date ? inv.dueDate : new Date(inv.dueDate)
        if (isNaN(due)) return false
        due.setHours(0, 0, 0, 0)
        return due >= today && isPayroll(inv)
      })
      .map((inv) => ({
        _date: inv.dueDate instanceof Date ? new Date(inv.dueDate) : new Date(inv.dueDate),
        _amount: Math.abs(Number(inv.amount) || 0),
        description: inv.description || inv.vendor || 'Payroll',
      }))
      .sort((a, b) => a._date - b._date)

    if (payrollCandidates.length === 0) {
      return { balance: cashBalance, nextTotal: 0, nextDate: null, projected: null, count: 0 }
    }
    const next = payrollCandidates[0]
    next._date.setHours(0, 0, 0, 0)

    // Build all cashflow events between today and the payroll's due date
    // (inclusive). This mirrors CashFlowSimulator.jsx.
    const cutoff = new Date(next._date) // include events on the payroll day
    const events = []

    // 1. AR invoices → income
    ;(arInvoices || []).forEach((inv) => {
      if (!inv || !inv.dueDate) return
      const due = inv.dueDate instanceof Date ? new Date(inv.dueDate) : new Date(inv.dueDate)
      if (isNaN(due)) return
      due.setHours(0, 0, 0, 0)
      const status = String(inv.status || '').toUpperCase()
      const isPaid = status === 'PAID' || inv.statusCategory === 'paid'
      if (isPaid) return
      const isOverdue = status === 'OVERDUE' || inv.statusCategory === 'overdue'
      const eventDate = isOverdue ? (() => { const d = new Date(today); d.setDate(today.getDate() + 7); return d })() : due
      if (eventDate < today || eventDate > cutoff) return
      events.push({ date: eventDate, amount: Math.abs(Number(inv.amount) || 0) })
    })

    // 2. AP invoices (APPROVED / OVERDUE) → outgoing
    ;(apInvoices || []).forEach((inv) => {
      if (!inv || !inv.dueDate) return
      const status = String(inv.status || '').toUpperCase()
      if (status !== 'APPROVED' && status !== 'OVERDUE') return
      const due = inv.dueDate instanceof Date ? new Date(inv.dueDate) : new Date(inv.dueDate)
      if (isNaN(due)) return
      due.setHours(0, 0, 0, 0)
      const isOverdue = status === 'OVERDUE'
      const eventDate = isOverdue ? (() => { const d = new Date(today); d.setDate(today.getDate() + 7); return d })() : due
      if (eventDate < today || eventDate > cutoff) return
      events.push({ date: eventDate, amount: -Math.abs(Number(inv.amount) || 0) })
    })

    // 3. Manual outgoing_payments from cashflow_settings
    ;(outgoingPayments || []).forEach((p) => {
      if (!p || !p.date || !p.amount) return
      const [y, m, d] = String(p.date).split('-').map((x) => parseInt(x, 10))
      if (!y || !m || !d) return
      const eventDate = new Date(y, m - 1, d); eventDate.setHours(0, 0, 0, 0)
      if (eventDate < today || eventDate > cutoff) return
      events.push({ date: eventDate, amount: -Math.abs(parseFloat(p.amount) || 0) })
    })

    events.sort((a, b) => a.date - b.date)
    let projected = Number(cashBalance) || 0
    events.forEach((e) => { projected += e.amount })

    return {
      balance: cashBalance,
      nextTotal: next._amount,
      nextDate: next._date,
      projected,
      count: 1,
      description: next.description,
    }
  }, [cashBalance, apInvoices, arInvoices, outgoingPayments])

  // ── Net income (MoM) ─────────────────────────────────────────────────────
  const ni = useMemo(() => {
    if (!netIncome || !currentMonth) return null
    const mbc = netIncome.metricsByCompany || {}
    const consolidated = mbc['CONSOLIDATED']
    if (!consolidated) return null
    const idxOf = (label) => (label ? netIncome.months.indexOf(label) : -1)
    const ci = idxOf(currentMonth)
    const pi = idxOf(prevMonth)
    const currOI = ci >= 0 ? Number(consolidated.operatingIncome[ci]) || 0 : 0
    const prevOI = pi >= 0 ? Number(consolidated.operatingIncome[pi]) || 0 : null
    const deltaPct = prevOI != null && prevOI !== 0 ? ((currOI - prevOI) / Math.abs(prevOI)) * 100 : null

    // Pick the single entity (non-consolidated) with the highest OI as the "main driver"
    let driver = null
    for (const [name, metrics] of Object.entries(mbc)) {
      if (name === 'CONSOLIDATED') continue
      const v = ci >= 0 ? Number(metrics.operatingIncome?.[ci]) || 0 : 0
      if (!driver || v > driver.oi) driver = { name, oi: v }
    }
    return { currOI, prevOI, deltaPct, driver }
  }, [netIncome, currentMonth, prevMonth])

  // ── GP / Headcount ───────────────────────────────────────────────────────
  // Derive month keys straight from today's calendar date — the talent_pool
  // table is keyed by "MM/YY" regardless of what the Net Income dataset
  // contains, so we don't want to couple GP to period labels here.
  const gp = useMemo(() => {
    if (!talentRows) return null
    const now = new Date()
    const currY = now.getFullYear(), currM = now.getMonth() // 0-based
    const prevDate = new Date(currY, currM - 1, 1)
    const prevY = prevDate.getFullYear(), prevM = prevDate.getMonth()

    const buildKey = (y, m) => `${String(m + 1).padStart(2, '0')}/${String(y).slice(-2)}`
    const currKey = buildKey(currY, currM)
    const prevKey = buildKey(prevY, prevM)
    // Also accept non-zero-padded variants (e.g. "4/26") in case any row
    // was inserted without padding.
    const variants = (y, m) => new Set([
      `${String(m + 1).padStart(2, '0')}/${String(y).slice(-2)}`,
      `${m + 1}/${String(y).slice(-2)}`,
    ])
    const currSet = variants(currY, currM)
    const prevSet = variants(prevY, prevM)

    const agg = (keySet) => {
      let on = 0, off = 0, gain = 0, loss = 0
      for (const r of talentRows) {
        if (!keySet.has(r.month)) continue
        const status = String(r.status || '').toLowerCase()
        const m = Number(r.net_margin) || 0
        if (status === 'onboarded') { on += 1; gain += m }
        else if (status === 'offboarded') { off += 1; loss += Math.abs(m) }
      }
      return { on, off, gain, loss, net: gain - loss, netCount: on - off }
    }
    // Label helpers for the narrative (independent of netIncome.months)
    const monthLabel = (y, m) => `${FULL_MONTHS[m]} ${y}`
    return {
      current: agg(currSet),
      previous: agg(prevSet),
      currentLabel: monthLabel(currY, currM),
      previousLabel: monthLabel(prevY, prevM),
      _keys: { currKey, prevKey },
    }
  }, [talentRows])

  if (error) return null

  // Graceful fallback when core data isn't ready yet
  const loading = !netIncome

  // ── Narratives ───────────────────────────────────────────────────────────
  const cashNarrative = cash
    ? (cash.nextTotal > 0
        ? `Current bank balance is ${fmtMoney(cash.balance)}. Estimated payroll outflow for the upcoming cycle is approximately ${fmtMoneyShort(cash.nextTotal)}${cash.nextDate ? ` (due ${fmtDate(cash.nextDate)})` : ''}, which would bring the projected balance to ~${fmtMoneyShort(cash.projected)} after that week.`
        : `Current bank balance is ${fmtMoney(cash.balance)}. No upcoming payroll cycle scheduled.`)
    : 'Open the Cashflow tab to review the current balance and upcoming payroll.'

  const niNarrative = ni
    ? (ni.prevOI != null
        ? `${currentMonthName} operating income is tracking at ${fmtMoney(ni.currOI)} so far, ${ni.currOI >= ni.prevOI ? 'running ahead of' : 'running behind'} ${fmtMoney(ni.prevOI)} from ${longMonthLabel(prevMonth)} — a ${fmtPct(ni.deltaPct)} MoM movement in progress.${ni.driver ? ` ${ni.driver.name} is the current main driver at ${fmtMoney(ni.driver.oi)}.` : ''} Numbers are in-flight and may shift before month-end.`
        : `${currentMonthName} operating income is tracking at ${fmtMoney(ni.currOI)} so far.${ni.driver ? ` ${ni.driver.name} is the current main driver (${fmtMoney(ni.driver.oi)}).` : ''} Numbers are in-flight and may shift before month-end.`)
    : 'Open the Net Income tab to see monthly operating income by entity.'

  const gpNarrative = gp?.current
    ? `So far in ${gp.currentLabel}, the talent pool has added ${gp.current.on} new placement${gp.current.on === 1 ? '' : 's'} and ${gp.current.off} offboarding${gp.current.off === 1 ? '' : 's'} — a running net change of ${gp.current.netCount >= 0 ? '+' : ''}${gp.current.netCount} contractor${Math.abs(gp.current.netCount) === 1 ? '' : 's'}. Net margin is currently ${fmtMoney(gp.current.net)}${gp.previous ? ` versus ${fmtMoney(gp.previous.net)} in ${gp.previousLabel}` : ''}. Hires and offboardings may still move before month-end.`
    : 'Open the GP Analysis tab to see onboardings, offboardings, and net margin movement.'

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section className="mb-12">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <div className="ledger-eyebrow mb-2">Finance & Operations Summary</div>
          <h2 className="ledger-serif" style={{ fontSize: 22, color: 'var(--ink)', margin: 0 }}>
            {currentMonthName || 'Latest period'}
          </h2>
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>
          {loading ? 'LOADING…' : 'LIVE'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          eyebrow="Cash Position"
          headline={cash ? fmtMoney(cash.balance) : '—'}
          subhead={cash && cash.nextTotal > 0 ? `Next payroll · ${fmtMoneyShort(cash.nextTotal)} → ~${fmtMoneyShort(cash.projected)}` : cash ? 'No payroll cycle scheduled' : null}
          narrative={cashNarrative}
          to="/cashflow"
          cta="Cashflow"
        />
        <SummaryCard
          eyebrow={`Net Income · ${currentMonthName || '—'}`}
          headline={ni ? fmtMoney(ni.currOI) : '—'}
          subhead={ni?.deltaPct != null ? `${fmtPct(ni.deltaPct)} MoM` : null}
          narrative={niNarrative}
          to="/net-income"
          cta="Net Income"
          tone={ni?.currOI != null ? (ni.currOI >= 0 ? 'pos' : 'neg') : 'ink'}
        />
        <SummaryCard
          eyebrow={`GP / Headcount · ${gp?.currentLabel || currentMonthName || '—'}`}
          headline={gp?.current ? `${gp.current.netCount >= 0 ? '+' : ''}${gp.current.netCount}` : '—'}
          subhead={gp?.current ? `${gp.current.on} on · ${gp.current.off} off · ${fmtMoney(gp.current.net)}` : null}
          narrative={gpNarrative}
          to="/gp-analysis"
          cta="GP Analysis"
          tone={gp?.current?.netCount != null ? (gp.current.netCount >= 0 ? 'pos' : 'neg') : 'ink'}
        />
      </div>
    </section>
  )
}
