import React, { useState, Suspense } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import { ThemeProvider, useTheme } from './ThemeContext'
import { DataCacheProvider, IS_DEMO } from './lib/DataCacheContext'

// Lazy-load heavy dashboard pages — only downloaded when the user navigates to them
const CashflowDashboard = React.lazy(() => import('./pages/CashflowDashboard'))
const NetIncomeDashboard = React.lazy(() => import('./pages/NetIncomeDashboard'))
const GPAnalysisDashboard = React.lazy(() => import('./pages/GPAnalysisDashboard'))
const APDashboard = React.lazy(() => import('./pages/APDashboard'))

function PageLoader() {
  return (
    <div className="min-h-full bg-slate-950 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="animate-pulse bg-slate-800 rounded-lg h-12 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-slate-800 rounded-lg h-28" />)}
        </div>
        <div className="animate-pulse bg-slate-800 rounded-lg h-64" />
      </div>
    </div>
  )
}

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
  { path: '/accounts-payable', label: 'AP' },
]

function PageHeader() {
  const location = useLocation()
  const current = navItems.find((item) => {
    if (item.end) return location.pathname === item.path
    return location.pathname.startsWith(item.path)
  })
  if (!current || current.path === '/') return null
  return (
    <div className="bg-slate-900/40 border-b border-slate-800 px-6 py-3 md:px-8">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Dashboards</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><polyline points="9 18 15 12 9 6"/></svg>
        <span className="text-slate-200 font-medium">{current.label}</span>
      </div>
    </div>
  )
}

function App() {
  const [unlocked, setUnlocked] = useState(() => IS_DEMO || sessionStorage.getItem(AUTH_KEY) === '1')
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 border-r border-slate-800 bg-slate-900/95 backdrop-blur-sm flex flex-col
        transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 md:bg-slate-900/50 md:backdrop-blur-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="font-display font-semibold text-white tracking-tight">Finance Consolidated</h1>
            <p className="text-xs text-slate-500 mt-0.5">Dashboards</p>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map(({ path, label, end }) => (
            <NavLink
              key={path}
              to={path}
              end={!!end}
              onClick={() => setSidebarOpen(false)}
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

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Demo mode banner */}
        {IS_DEMO && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center">
            <span className="text-amber-300 text-xs font-medium">
              🔶 Demo Mode — All data shown is sample data for demonstration purposes only
            </span>
          </div>
        )}

        {/* Mobile hamburger + breadcrumb header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/60">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span className="text-sm font-medium text-slate-300">Finance Consolidated</span>
        </div>

        {/* Desktop breadcrumb */}
        <div className="hidden md:block">
          <PageHeader />
        </div>

        {/* Mobile breadcrumb (below hamburger bar) */}
        <div className="md:hidden">
          <PageHeader />
        </div>

        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/cashflow" element={<CashflowDashboard />} />
                <Route path="/net-income" element={<NetIncomeDashboard />} />
                <Route path="/gp-analysis" element={<GPAnalysisDashboard />} />
                <Route path="/accounts-payable" element={<APDashboard />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default function AppWithTheme() {
  return (
    <ThemeProvider>
      <DataCacheProvider>
        <App />
      </DataCacheProvider>
    </ThemeProvider>
  )
}
