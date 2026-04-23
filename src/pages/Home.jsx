import React from 'react'
import { Link } from 'react-router-dom'
import OverviewSummary from './OverviewSummary'

export default function Home() {
  const dashboards = [
    { num: '01', path: '/cashflow', name: 'Cashflow', description: 'Payment timeline, summary cards, invoice table and cash flow simulator.' },
    { num: '02', path: '/net-income', name: 'Net Income', description: 'Operating income by period, P&L by entity, HC revenue vs projected.' },
    { num: '03', path: '/gp-analysis', name: 'GP Analysis', description: 'Talent pool net margin gain/loss, onboarded vs offboarded.' },
    { num: '04', path: '/accounts-payable', name: 'Accounts Payable', description: 'AP tracker — record invoices, track aging, and manage payments by company.' },
    { num: '05', path: '/analytics', name: 'Analytics', description: 'Cross-dashboard insights — client revenue, overdue aging, and payment terms.' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="ledger-eyebrow mb-3">Welcome</div>
      <h1 className="ledger-serif mb-2" style={{ fontSize: 32, color: 'var(--ink)', margin: 0 }}>
        Finance Consolidated
      </h1>
      <p className="mb-10 mt-3" style={{ color: 'var(--ink-dim)', fontSize: 14 }}>
        Use the menu on the left to open any dashboard. Only one dashboard is shown at a time.
      </p>

      <OverviewSummary />

      <div className="ledger-eyebrow mb-4">Dashboards</div>
      <div className="space-y-0" style={{ borderTop: '1px solid var(--line)' }}>
        {dashboards.map((d) => (
          <Link
            key={d.path}
            to={d.path}
            className="flex items-center gap-5 py-5 group"
            style={{
              borderBottom: '1px solid var(--line)',
              textDecoration: 'none',
              transition: 'background 0.12s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--row-hover)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.14em',
                color: 'var(--ink-mute)',
                minWidth: 28,
              }}
            >
              {d.num}
            </span>
            <div className="flex-1">
              <div className="ledger-serif" style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 2 }}>
                {d.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>{d.description}</div>
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: 'var(--ink-mute)',
                letterSpacing: '0.08em',
              }}
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
