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
  const { fetchNetIncome } = useDataCache()
  const [netIncome, setNetIncome] = useState(null)
  const [cashSettings, setCashSettings] = useState(null)
  const [talentRows, setTalentRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    fetchNetIncome(false)
      .then((d) => { if (!cancelled) setNetIncome(d) })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load net income') })

    if (IS_DEMO || !isSupabaseConfigured()) {
      // Demo / no-supabase fallback: leave cashSettings + talentRows null so
      // the cards render a placeholder narrative rather than fake data.
      if (!cancelled) { setCashSettings(null); setTalentRows([]) }
      return () => { cancelled = true }
    }

    supabase
      .from('cashflow_settings')
      .select('current_balance, outgoing_payments')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setCashSettings({
          balance: Number(data?.current_balance) || 0,
          outgoings: Array.isArray(data?.outgoing_payments) ? data.outgoing_payments : [],
        })
      })

    supabase
      .from('talent_pool')
      .select('status, net_margin, month')
      .then(({ data }) => { if (!cancelled) setTalentRows(data || []) })

    return () => { cancelled = true }
  }, [fetchNetIncome])

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
  // Focus on the upcoming *payroll* cycle — any outgoing payment whose label
  // contains "payroll" (case-insensitive). This covers both actual payroll
  // and "payroll estimate" entries. Non-payroll outflows are ignored here.
  const cash = useMemo(() => {
    if (!cashSettings) return null
    const balance = cashSettings.balance
    const today = new Date(); today.setHours(0, 0, 0, 0)

    const isPayroll = (p) => {
      const haystack = [p.description, p.name, p.label, p.title, p.category, p.type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes('payroll')
    }

    const upcomingPayroll = (cashSettings.outgoings || [])
      .map((p) => {
        const [y, m, d] = String(p.date || '').split('-').map((x) => parseInt(x, 10))
        if (!y || !m || !d) return null
        return { ...p, _date: new Date(y, m - 1, d), _amount: Math.abs(parseFloat(p.amount) || 0) }
      })
      .filter((p) => p && isPayroll(p) && p._date >= today)
      .sort((a, b) => a._date - b._date)

    if (upcomingPayroll.length === 0) {
      return { balance, nextTotal: 0, nextDate: null, projected: null, count: 0 }
    }

    // Group all payroll items that fall within ~7 days of the first upcoming
    // one into the same "cycle" (covers e.g. payroll + payroll estimate on
    // adjacent days).
    const cycleAnchor = upcomingPayroll[0]._date
    const cycleEnd = new Date(cycleAnchor); cycleEnd.setDate(cycleEnd.getDate() + 7)
    const cycle = upcomingPayroll.filter((p) => p._date <= cycleEnd)
    const nextTotal = cycle.reduce((s, p) => s + p._amount, 0)
    const projected = balance - nextTotal
    return { balance, nextTotal, nextDate: cycleAnchor, projected, count: cycle.length }
  }, [cashSettings])

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
  const gp = useMemo(() => {
    if (!talentRows || !currentMonth) return null
    const currKey = talentPoolMonthKey(currentMonth)
    const prevKey = talentPoolMonthKey(prevMonth)
    const agg = (key) => {
      if (!key) return null
      let on = 0, off = 0, gain = 0, loss = 0
      for (const r of talentRows) {
        if (r.month !== key) continue
        const status = String(r.status || '').toLowerCase()
        const m = Number(r.net_margin) || 0
        if (status === 'onboarded') { on += 1; gain += m }
        else if (status === 'offboarded') { off += 1; loss += Math.abs(m) }
      }
      return { on, off, gain, loss, net: gain - loss, netCount: on - off }
    }
    return { current: agg(currKey), previous: agg(prevKey) }
  }, [talentRows, currentMonth, prevMonth])

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
        ? `${currentMonthName} operating income came in at ${fmtMoney(ni.currOI)}, ${ni.currOI >= ni.prevOI ? 'up from' : 'down from'} ${fmtMoney(ni.prevOI)} in ${longMonthLabel(prevMonth)} — a ${fmtPct(ni.deltaPct)} ${ni.currOI >= ni.prevOI ? 'improvement' : 'change'} MoM.${ni.driver ? ` ${ni.driver.name} is the main driver, contributing ${fmtMoney(ni.driver.oi)} for the month.` : ''}`
        : `${currentMonthName} operating income came in at ${fmtMoney(ni.currOI)}.${ni.driver ? ` ${ni.driver.name} is the main driver (${fmtMoney(ni.driver.oi)}).` : ''}`)
    : 'Open the Net Income tab to see monthly operating income by entity.'

  const gpNarrative = gp?.current
    ? `The talent pool closed ${currentMonthName} with ${gp.current.on} new placement${gp.current.on === 1 ? '' : 's'} and ${gp.current.off} offboarding${gp.current.off === 1 ? '' : 's'}, a net change of ${gp.current.netCount >= 0 ? '+' : ''}${gp.current.netCount} contractor${Math.abs(gp.current.netCount) === 1 ? '' : 's'}. Net margin won came in at ${fmtMoney(gp.current.net)}${gp.previous ? ` versus ${fmtMoney(gp.previous.net)} in ${longMonthLabel(prevMonth)}` : ''}.`
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
          eyebrow={`GP / Headcount · ${currentMonthName || '—'}`}
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
