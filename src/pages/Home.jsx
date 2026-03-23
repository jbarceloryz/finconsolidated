import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  const dashboards = [
    { path: '/cashflow', name: 'Cashflow', description: 'Payment timeline, summary cards, invoice table and cash flow simulator.' },
    { path: '/net-income', name: 'Net Income', description: 'Operating income by period, P&L by entity, HC revenue vs projected.' },
    { path: '/gp-analysis', name: 'GP Analysis', description: 'Talent pool net margin gain/loss, onboarded vs offboarded.' },
    { path: '/ap', name: 'AP', description: 'Accounts payable tracker — record invoices, track aging, and manage payments by company.' },
  ]

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 font-sans">
      <h1 className="font-display text-2xl font-semibold text-white mb-2">Welcome</h1>
      <p className="text-slate-400 mb-10">
        Use the menu on the left to open any dashboard. Only one dashboard is shown at a time.
      </p>
      <div className="space-y-4">
        {dashboards.map((d) => (
          <Link
            key={d.path}
            to={d.path}
            className="block rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:bg-slate-800/60 hover:border-slate-700 transition-colors"
          >
            <h2 className="font-medium text-slate-200">{d.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{d.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
