import React from 'react'
import { AP_COMPANIES } from '../../../lib/apData'

const COMPANIES = ['all', ...AP_COMPANIES]

export default function APCompanyFilter({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-slate-400">Company</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 text-sm border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-800 text-slate-200"
      >
        {COMPANIES.map((c) => (
          <option key={c} value={c}>
            {c === 'all' ? 'All Companies' : c}
          </option>
        ))}
      </select>
    </div>
  )
}
