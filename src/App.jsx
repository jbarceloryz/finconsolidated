import React, { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import CashflowDashboard from './pages/CashflowDashboard'
import NetIncomeDashboard from './pages/NetIncomeDashboard'
import GPAnalysisDashboard from './pages/GPAnalysisDashboard'
import { ThemeProvider, useTheme } from './ThemeContext'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('ErrorBoundary caught:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 font-sans">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-semibold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 text-sm mb-4">{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-500">Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'
  return (
    <div className="p-2 border-t border-slate-800">
      <button
        onClick={toggleTheme}
        className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors"
      >
        {isLight ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        )}
        {isLight ? 'Dark Mode' : 'Light Mode'}
      </button>
    </div>
  )
}

const AUTH_KEY = 'finconsolidated-auth'
const PASSWORD = '!accounting123$'

const navItems = [
  { path: '/', label: 'Home', end: true },
  { path: '/cashflow', label: 'Cashflow' },
  { path: '/net-income', label: 'Net Income' },
  { path: '/gp-analysis', label: 'GP Analysis' },
]

function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(AUTH_KEY) === '1')
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setPasswordError('')
    if (passwordInput === PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, '1')
      setUnlocked(true)
      setPasswordInput('')
    } else {
      setPasswordError('Incorrect password')
    }
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 font-sans">
        <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          <h1 className="font-display text-xl font-semibold text-white mb-1">Finance Consolidated</h1>
          <p className="text-sm text-slate-400 mb-6">Enter password to access dashboards.</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              autoFocus
              autoComplete="current-password"
            />
            {passwordError && <p className="text-sm text-rose-400">{passwordError}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Left sidebar */}
      <aside className="w-56 shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h1 className="font-display font-semibold text-white tracking-tight">Finance Consolidated</h1>
          <p className="text-xs text-slate-500 mt-0.5">Dashboards</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map(({ path, label, end }) => (
            <NavLink
              key={path}
              to={path}
              end={!!end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
      </aside>

      {/* Main content — only one route at a time */}
      <main className="flex-1 overflow-auto">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cashflow" element={<CashflowDashboard />} />
            <Route path="/net-income" element={<NetIncomeDashboard />} />
            <Route path="/gp-analysis" element={<GPAnalysisDashboard />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}

export default function AppWithTheme() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )
}
