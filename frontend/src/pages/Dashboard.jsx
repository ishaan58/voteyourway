import React, { useEffect, useState } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { FileText, List, CheckCircle2, TrendingUp, Zap, ArrowRight } from 'lucide-react'
import { getOverview } from '../utils/api.js'
import { Link } from 'react-router-dom'

const COLORS = ['#10b981','#3b82f6','#94a3b8','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#6b7280']

const StatCard = ({ icon: Icon, label, value, color = 'blue', sub }) => (
  <div className="card flex items-start gap-4">
    <div className={`p-2.5 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex-shrink-0`}>
      <Icon size={20} className={`text-${color}-600 dark:text-${color}-400`} />
    </div>
    <div>
      <div className="text-2xl font-bold text-[var(--color-text)]">{value}</div>
      <div className="text-sm font-medium text-[var(--color-text)]">{label}</div>
      {sub && <div className="text-xs text-[var(--color-muted)] mt-0.5">{sub}</div>}
    </div>
  </div>
)

export default function Dashboard({ status, onRun }) {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status.has_data) {
      setLoading(true)
      getOverview()
        .then(r => setOverview(r.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [status.has_data, status.pipeline_status])

  if (!status.has_data) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className="card">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
            <BarChart size={32} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Welcome to ManifestoAI</h1>
          <p className="text-[var(--color-muted)] mb-6">
            Analyse Indian political party manifestoes using ML and data mining. Place PDF files in{' '}
            <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">/data/manifestoes/</code>{' '}
            then run the pipeline.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 text-left text-sm space-y-1">
            <div className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Expected filename format:</div>
            {['bjp_2009.pdf','bjp_2014.pdf','bjp_2019.pdf','inc_2009.pdf','inc_2014.pdf','inc_2019.pdf'].map(f => (
              <div key={f} className="text-blue-700 dark:text-blue-400 font-mono text-xs">{f}</div>
            ))}
          </div>
          <button
            onClick={() => onRun(false)}
            disabled={status.pipeline_status === 'running'}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold mx-auto disabled:opacity-50 transition-colors"
          >
            <Zap size={18} />
            {status.pipeline_status === 'running' ? 'Running...' : 'Run Pipeline'}
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[var(--color-muted)]">Loading analytics...</div>
  }

  if (!overview || overview.error) {
    return <div className="text-[var(--color-muted)] text-center mt-20">No data yet. Run the pipeline.</div>
  }

  // ── Exact shapes returned by YOUR main.py get_analytics_overview() ──────────
  // completion_stats  → flat { "Completed": 45, "In Progress": 30, "Not Started": 10, "Failed": 5 }
  // category_distribution → flat { "Economy": 120, "Education": 80, ... }
  // prediction_summary → { "average_probability": 0.55, "high_confidence": 23 }
  // parties → ["BJP", "INC"]
  const {
    total_promises = 0,
    parties = [],
    category_distribution = {},
    completion_stats = {},
    prediction_summary = {}
  } = overview

  // ── Derived scalars ──────────────────────────────────────────────────────────
  const completedCount  = completion_stats['Completed']   || 0
  const inProgressCount = completion_stats['In Progress'] || 0
  const notStartedCount = completion_stats['Not Started'] || 0
  const failedCount     = completion_stats['Failed']      || 0
  const totalForRate    = completedCount + inProgressCount + notStartedCount + failedCount
  const avgCompRate     = totalForRate > 0 ? ((completedCount / totalForRate) * 100).toFixed(1) : '0.0'

  // ── Bar chart: one bar per status ────────────────────────────────────────────
  const completionBarData = [
    { name: 'Completed',   value: completedCount,  fill: '#10b981' },
    { name: 'In Progress', value: inProgressCount, fill: '#3b82f6' },
    { name: 'Not Started', value: notStartedCount, fill: '#94a3b8' },
    { name: 'Failed',      value: failedCount,     fill: '#ef4444' },
  ].filter(d => d.value > 0)

  // ── Pie chart: category_distribution is already flat { cat: count } ──────────
  const categoryData = Object.entries(category_distribution)
    .map(([name, value]) => ({ name, value }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)

  // ── Prediction card ──────────────────────────────────────────────────────────
  const avgProbPct    = prediction_summary.average_probability != null
    ? (prediction_summary.average_probability * 100).toFixed(1)
    : null
  const highConfCount = prediction_summary.high_confidence ?? null

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">Dashboard</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">Overview of manifesto analysis results</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={FileText}     label="Parties Analysed"    value={parties.length}       color="blue"   sub="manifesto files loaded" />
        <StatCard icon={List}         label="Promises Extracted"  value={total_promises}        color="purple" sub="across all manifestoes" />
        <StatCard icon={CheckCircle2} label="Completed"           value={completedCount}        color="emerald" sub="verified promises" />
        <StatCard icon={TrendingUp}   label="Avg Completion Rate" value={`${avgCompRate}%`}    color="amber"  sub="across all parties" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Completion breakdown — bar per status */}
        <div className="card">
          <h2 className="font-semibold text-[var(--color-text)] mb-4">Promise Completion Breakdown</h2>
          {completionBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={completionBarData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [v, 'Promises']} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {completionBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-[var(--color-muted)] text-sm">
              No completion data yet.
            </div>
          )}
        </div>

        {/* Category distribution pie */}
        <div className="card">
          <h2 className="font-semibold text-[var(--color-text)] mb-4">Promise Category Distribution</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [v, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-[var(--color-muted)] text-sm">
              No category data yet.
            </div>
          )}
        </div>
      </div>

      {/* Prediction summary — uses actual keys from main.py */}
      <div className="card">
        <h2 className="font-semibold text-[var(--color-text)] mb-4">ML Prediction Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Avg probability */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-[var(--color-border)]">
            <div className="font-semibold text-[var(--color-text)] mb-2">Avg Predicted Completion</div>
            {avgProbPct !== null ? (
              <>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{avgProbPct}%</div>
                <div className="text-xs text-[var(--color-muted)]">across all promises</div>
                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${avgProbPct}%` }} />
                </div>
              </>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">No prediction data yet.</div>
            )}
          </div>

          {/* High confidence count */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-[var(--color-border)]">
            <div className="font-semibold text-[var(--color-text)] mb-2">High-Confidence Completions</div>
            {highConfCount !== null ? (
              <>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{highConfCount}</div>
                <div className="text-xs text-[var(--color-muted)]">promises with probability &gt; 70%</div>
              </>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">No data yet.</div>
            )}
          </div>

          {/* Status breakdown */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-[var(--color-border)]">
            <div className="font-semibold text-[var(--color-text)] mb-3">Status Breakdown</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-emerald-600 dark:text-emerald-400">✓ Completed</span>
                <span className="font-bold text-[var(--color-text)]">{completedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600 dark:text-blue-400">↻ In Progress</span>
                <span className="font-bold text-[var(--color-text)]">{inProgressCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">○ Not Started</span>
                <span className="font-bold text-[var(--color-text)]">{notStartedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-500 dark:text-red-400">✗ Failed</span>
                <span className="font-bold text-[var(--color-text)]">{failedCount}</span>
              </div>
              <div className="border-t border-[var(--color-border)] pt-1.5 flex justify-between font-semibold">
                <span className="text-[var(--color-muted)]">Parties</span>
                <span className="text-[var(--color-text)]">{parties.join(', ')}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { to: '/promises',       label: 'Explore Promises',   desc: 'Browse and filter all extracted promises' },
          { to: '/completion',     label: 'Completion Tracker', desc: 'See real-world status of promises' },
          { to: '/comparison',     label: 'Compare Parties',    desc: 'Side-by-side charts and analysis' },
          { to: '/recommendation', label: 'Get Recommendation', desc: 'Personalised party suggestion' },
          { to: '/manifestoes',    label: 'View Manifestoes',   desc: 'Read original manifesto text' },
        ].map(({ to, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="card flex items-center justify-between group hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer"
          >
            <div>
              <div className="font-semibold text-[var(--color-text)] text-sm">{label}</div>
              <div className="text-xs text-[var(--color-muted)] mt-0.5">{desc}</div>
            </div>
            <ArrowRight size={16} className="text-[var(--color-muted)] group-hover:text-blue-600 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}