import React, { useState, Suspense } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import { ThemeProvider, useTheme } from './ThemeContext'
import { DataCacheProvider, IS_DEMO } from './lib/DataCacheContext'
import { AuthProvider, useAuth } from './lib/AuthContext'

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

function UserMenu() {
  const { email, signOut } = useAuth()
  if (IS_DEMO || !email) return null
  return (
    <div className="px-3 pt-3" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="px-3 pb-2 truncate" title={email} style={{ fontSize: 11, color: 'var(--ink-mute)', fontFamily: "'JetBrains Mono', monospace" }}>
        {email}
      </div>
      <button
        onClick={signOut}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors"
        style={{ color: 'var(--ink-dim)', background: 'transparent' }}
        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--ink)' }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-dim)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span style={{ fontSize: 12 }}>Sign out</span>
      </button>
    </div>
  )
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

function AuthScreen() {
  const { loading, session, email, authorized, signInWithGoogle, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
        <div className="animate-pulse rounded-lg h-12 w-48" />
      </div>
    )
  }

  // Signed in with a Google account that is not on the allowlist.
  if (session && !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm ledger-card elev p-8 text-center">
          <div className="ledger-eyebrow mb-2">Ledger · Finance</div>
          <h1 className="ledger-serif mb-1" style={{ fontSize: 22, color: 'var(--ink)' }}>Access denied</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{email}</span> is not authorized to view these dashboards. Ask an admin to add you.
          </p>
          <button onClick={signOut} className="ledger-btn w-full justify-center" style={{ padding: '8px 16px' }}>
            Sign out
          </button>
        </div>
      </div>
    )
  }

  // Not signed in.
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm ledger-card elev p-8">
        <div className="ledger-eyebrow mb-2">Ledger · Finance</div>
        <h1 className="ledger-serif mb-1" style={{ fontSize: 22, color: 'var(--ink)' }}>Finance Consolidated</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>Sign in with your work Google account to access the dashboards.</p>
        <button
          onClick={signInWithGoogle}
          className="ledger-btn ledger-btn-primary w-full justify-center"
          style={{ padding: '10px 16px', gap: 10 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  )
}

function App() {
  const { authorized } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!authorized) {
    return <AuthScreen />
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

        <UserMenu />
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
      <AuthProvider>
        <DataCacheProvider>
          <App />
        </DataCacheProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
