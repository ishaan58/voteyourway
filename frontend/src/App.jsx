import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FileText, List, CheckCircle2,
  BarChart3, Trophy, Moon, Sun, Zap, Menu, ChevronLeft, X
} from 'lucide-react'
import Dashboard from './pages/Dashboard.jsx'
import ManifestoViewer from './pages/ManifestoViewer.jsx'
import PromiseExplorer from './pages/PromiseExplorer.jsx'
import CompletionPanel from './pages/CompletionPanel.jsx'
import ComparisonDashboard from './pages/ComparisonDashboard.jsx'
import Recommendation from './pages/Recommendation.jsx'
import { getStatus, runPipeline, setAuthCredentials } from './utils/api.js'

const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Overview'       },
  { to: '/manifestoes',   icon: FileText,        label: 'Manifestoes'    },
  { to: '/promises',      icon: List,            label: 'Promises'       },
  { to: '/completion',    icon: CheckCircle2,    label: 'Completion'     },
  { to: '/comparison',    icon: BarChart3,       label: 'Comparison'     },
  { to: '/recommendation',icon: Trophy,          label: 'Recommendation' },
]

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [status, setStatus] = useState({ pipeline_status: 'idle', progress: 0, has_data: false })
  const [running, setRunning] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [authModal, setAuthModal] = useState(false)
  const [authInput, setAuthInput] = useState({ username: '', password: '' })
  const [forceRerunFlag, setForceRerunFlag] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const pollStatus = useCallback(async () => {
    try {
      const { data } = await getStatus()
      setStatus(data)
      if (data.pipeline_status === 'running') {
        setTimeout(pollStatus, 1500)
      } else {
        setRunning(false)
      }
    } catch { setRunning(false) }
  }, [])

  useEffect(() => {
    pollStatus()
    const interval = setInterval(pollStatus, 10000)
    return () => clearInterval(interval)
  }, [pollStatus])

  const handleRun = async (forceRerun = false) => {
    setAuthError('')
    setAuthInput({ username: '', password: '' })
    setForceRerunFlag(forceRerun)
    setAuthModal(true)
  }

  const handleAuthSubmit = async () => {
    if (!authInput.username || !authInput.password) {
      setAuthError('Please enter username and password')
      return
    }
    
    setAuthError('')
    setRunning(true)
    setAuthModal(false)
    
    try {
      // Set credentials for this request
      setAuthCredentials(authInput.username, authInput.password)
      await runPipeline(forceRerunFlag, false)
      setTimeout(pollStatus, 500)
    } catch (err) {
      if (err.response?.status === 401) {
        setAuthError('Invalid credentials')
        setAuthModal(true)
      }
      setRunning(false)
    }
  }

  const isRunning = status.pipeline_status === 'running'
  const hasData   = status.has_data

  const StatusDot = () => {
    if (isRunning) return (
      <span className="flex items-center gap-2 text-xs tracking-widest uppercase" style={{ color: 'var(--color-accent)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
        Analysing {status.progress ?? 0}%
      </span>
    )
    if (status.pipeline_status === 'completed') return (
      <span className="flex items-center gap-2 text-xs tracking-widest uppercase" style={{ color: 'var(--color-muted)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        Ready
      </span>
    )
    if (status.pipeline_status === 'error') return (
      <span className="flex items-center gap-2 text-xs tracking-widest uppercase" style={{ color: 'var(--color-accent)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
        Error
      </span>
    )
    return (
      <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-muted)' }}>
        Not analysed
      </span>
    )
  }

  return (
    <>
      {/* Auth Modal */}
      {authModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>Authenticate</h2>
              <button 
                onClick={() => { setAuthModal(false); setAuthError(''); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-muted)',
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: '20px' }}>
              Enter your credentials to run the analysis pipeline.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Username
              </label>
              <input
                type="text"
                value={authInput.username}
                onChange={(e) => setAuthInput({ ...authInput, username: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
                placeholder="admin"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${authError ? '#ef4444' : 'var(--color-border)'}`,
                  borderRadius: '6px',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Password
              </label>
              <input
                type="password"
                value={authInput.password}
                onChange={(e) => setAuthInput({ ...authInput, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
                placeholder="•••••••••"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${authError ? '#ef4444' : 'var(--color-border)'}`,
                  borderRadius: '6px',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {authError && (
              <div style={{ 
                background: '#fecaca', 
                color: '#991b1b', 
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '16px',
              }}>
                {authError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setAuthModal(false); setAuthError(''); }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAuthSubmit}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'var(--color-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Authenticate
              </button>
            </div>
          </div>
        </div>
      )}

      <BrowserRouter>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>

        {/* ── Sidebar ── */}
        <aside
          style={{
            width: sidebarOpen ? '220px' : '0px',
            minWidth: sidebarOpen ? '220px' : '0px',
            overflow: 'hidden',
            flexShrink: 0,
            background: 'var(--color-card)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.25s ease, min-width 0.25s ease',
          }}
        >
          {/* Wordmark */}
          <div style={{ padding: '28px 20px 24px', borderBottom: '1px solid var(--color-border)' }}>
            <div className="wordmark" style={{ fontSize: 22, color: 'var(--color-text)' }}>
              VoteYourWay
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-muted)', marginTop: 4 }}>
              India · Election Intelligence
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '20px 0' }}>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <Icon size={13} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom controls */}
          <div style={{ padding: '16px 12px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8 }}>
            <button
              onClick={() => setDark(d => !d)}
              title={dark ? 'Light mode' : 'Dark mode'}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 1,
                padding: '6px 10px',
                cursor: 'pointer',
                color: 'var(--color-muted)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {dark ? <Sun size={13} strokeWidth={1.5} /> : <Moon size={13} strokeWidth={1.5} />}
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Top bar */}
          <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: '12px',
            paddingRight: '16px',
            paddingTop: '8px',
            paddingBottom: '8px',
            minHeight: 52,
            background: 'var(--color-card)',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
            gap: 12,
          }}>

            {/* Left: hamburger + status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
              <button
                onClick={() => setSidebarOpen(s => !s)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--color-muted)', 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                  marginLeft: '-8px',
                }}
                onMouseEnter={e => e.target.style.background = 'var(--color-border)'}
                onMouseLeave={e => e.target.style.background = 'transparent'}
              >
                {sidebarOpen ? <ChevronLeft size={16} strokeWidth={1.5} /> : <Menu size={16} strokeWidth={1.5} />}
              </button>

              <div style={{ width: 1, height: 18, background: 'var(--color-border)' }} />
              <StatusDot />
            </div>

            {/* Right: actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
              <button
                className="btn-primary"
                onClick={() => handleRun(false)}
                disabled={isRunning}
                title="Run new analysis or refresh existing results"
              >
                <Zap size={11} strokeWidth={2} />
                <span style={{ display: 'inline', whiteSpace: 'nowrap' }}>
                  {isRunning ? 'Analysing…' : hasData ? 'Refresh' : 'Run Analysis'}
                </span>
              </button>
              {hasData && !isRunning && (
                <button 
                  className="btn-ghost" 
                  onClick={() => handleRun(true)} 
                  disabled={isRunning}
                  title="Force re-run: ignore cache and reprocess all data"
                  style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
                >
                  Force Re-run
                </button>
              )}
            </div>
          </header>

          {/* Progress bar */}
          {isRunning && (
            <div style={{ height: 2, background: 'var(--color-border)' }}>
              <div
                style={{
                  height: '100%',
                  background: 'var(--color-accent)',
                  width: `${status.progress ?? 0}%`,
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
          )}

          {/* Page */}
          <main style={{ flex: 1, overflow: 'auto', padding: 'max(16px, 4%)', paddingTop: 'max(24px, 5%)' }}>
            <Routes>
              <Route path="/"               element={<Dashboard status={status} onRun={handleRun} />} />
              <Route path="/manifestoes"    element={<ManifestoViewer />} />
              <Route path="/promises"       element={<PromiseExplorer />} />
              <Route path="/completion"     element={<CompletionPanel />} />
              <Route path="/comparison"     element={<ComparisonDashboard />} />
              <Route path="/recommendation" element={<Recommendation />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
    </>
  )
}