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
const AnalyticsDashboard = React.lazy(() => import('./pages/AnalyticsDashboard'))

function PageLoader() {
  return (
    <div className="min-h-full p-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="animate-pulse rounded-lg h-12 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="animate-pulse rounded-lg h-28" />)}
        </div>
        <div className="animate-pulse rounded-lg h-64" />
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
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
          <div className="text-center max-w-md">
            <h1 className="ledger-serif text-xl mb-2" style={{ color: 'var(--ink)' }}>Something went wrong</h1>
            <p className="text-sm mb-4" style={{ color: 'var(--ink-dim)' }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button onClick={() => window.location.reload()} className="ledger-btn ledger-btn-primary">Reload</button>
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
    <div className="p-3" style={{ borderTop: '1px solid var(--line)' }}>
      <button
        onClick={toggleTheme}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
        style={{ color: 'var(--ink-dim)', background: 'transparent' }}
        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)' }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-dim)' }}
      >
        {isLight ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        )}
        <span style={{ fontSize: 12 }}>{isLight ? 'Dark Mode' : 'Light Mode'}</span>
      </button>
    </div>
  )
}

const AUTH_KEY = 'finconsolidated-auth'
const PASSWORD = '!accounting123$'

const navItems = [
  { path: '/', label: 'Overview', end: true },
  { path: '/cashflow', label: 'Cashflow' },
  { path: '/net-income', label: 'Net Income' },
  { path: '/gp-analysis', label: 'GP Analysis' },
  { path: '/accounts-payable', label: 'Accounts Payable' },
  { path: '/analytics', label: 'Analytics' },
]

function pad2(n) { return n < 10 ? '0' + n : String(n) }

function Topbar() {
  const location = useLocation()
  const idx = navItems.findIndex((item) => item.end ? location.pathname === item.path : location.pathname.startsWith(item.path))
  const current = idx >= 0 ? navItems[idx] : navItems[0]
  return (
    <div
      className="flex items-center justify-between px-6 py-4"
      style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}
    >
      <div className="flex items-center gap-3">
        <span className="ledger-eyebrow">{pad2((idx >= 0 ? idx : 0) + 1)}</span>
        <h2 className="ledger-serif" style={{ fontSize: 18, color: 'var(--ink)', margin: 0 }}>{current.label}</h2>
      </div>
      <div className="flex items-center gap-2">
        <span className="ledger-pill">
          <span className="ledger-dot" style={{ background: 'var(--pos)' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>synced</span>
        </span>
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
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm ledger-card elev p-8">
          <div className="ledger-eyebrow mb-2">Ledger · Finance</div>
          <h1 className="ledger-serif mb-1" style={{ fontSize: 22, color: 'var(--ink)' }}>Finance Consolidated</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>Enter password to access dashboards.</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2 text-sm"
              style={{
                background: 'var(--bg-card-elev)',
                border: '1px solid var(--line-strong)',
                borderRadius: 4,
                color: 'var(--ink)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
              autoFocus
              autoComplete="current-password"
            />
            {passwordError && <p className="text-sm" style={{ color: 'var(--neg)' }}>{passwordError}</p>}
            <button type="submit" className="ledger-btn ledger-btn-primary w-full justify-center" style={{ padding: '8px 16px' }}>
              Unlock
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col
          transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          width: 224,
          background: 'var(--bg-side)',
          borderRight: '1px solid var(--line)',
        }}
      >
        <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
          <div>
            <div className="ledger-eyebrow" style={{ marginBottom: 2 }}>Ledger</div>
            <h1 className="ledger-serif" style={{ fontSize: 16, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
              Finance
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 rounded"
            style={{ color: 'var(--ink-dim)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="px-5 pt-5 pb-2">
          <div className="ledger-eyebrow">Navigation</div>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {navItems.map(({ path, label, end }, i) => (
            <NavLink
              key={path}
              to={path}
              end={!!end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm transition-colors ${isActive ? 'is-active' : ''}`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--ink)' : 'var(--ink-dim)',
                background: isActive ? 'var(--hover)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                paddingLeft: 14,
                fontWeight: isActive ? 500 : 400,
                textDecoration: 'none',
              })}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  color: 'var(--ink-mute)',
                  width: 18,
                }}
              >
                {pad2(i + 1)}
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <ThemeToggle />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-auto" style={{ minWidth: 0 }}>
        {/* Demo mode banner */}
        {IS_DEMO && (
          <div className="px-4 py-2 text-center" style={{ background: 'rgba(231,200,115,0.1)', borderBottom: '1px solid rgba(231,200,115,0.3)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--warn)', fontFamily: "'JetBrains Mono', monospace" }}>
              DEMO MODE · All data is sample data for demonstration purposes only
            </span>
          </div>
        )}

        {/* Mobile hamburger */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-side)' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md"
            style={{ color: 'var(--ink-dim)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <span className="text-sm" style={{ color: 'var(--ink)' }}>Finance Consolidated</span>
        </div>

        {/* Desktop topbar */}
        <div className="hidden md:block">
          <Topbar />
        </div>

        {/* Mobile topbar */}
        <div className="md:hidden">
          <Topbar />
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
                <Route path="/analytics" element={<AnalyticsDashboard />} />
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
