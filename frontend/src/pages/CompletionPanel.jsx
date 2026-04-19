import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadialBarChart, RadialBar, Legend } from 'recharts'
import { getScores, getPromises } from '../utils/api.js'

const STATUS_COLORS = { Completed: '#10b981', 'In Progress': '#3b82f6', 'Not Started': '#94a3b8', Failed: '#ef4444' }

const CompletionRing = ({ rate, party, color }) => {
  const data = [{ name: 'Completion', value: Math.round(rate * 100), fill: color }]
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <RadialBarChart width={112} height={112} cx={56} cy={56} innerRadius={35} outerRadius={52} data={data} startAngle={90} endAngle={-270}>
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#e2e8f0' }} />
        </RadialBarChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-[var(--color-text)]">{Math.round(rate * 100)}%</span>
        </div>
      </div>
      <div className="mt-2 text-sm font-semibold text-[var(--color-text)]">{party}</div>
      <div className="text-xs text-[var(--color-muted)]">Completion Rate</div>
    </div>
  )
}

export default function CompletionPanel() {
  const [scores, setScores] = useState([])
  const [promises, setPromises] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedParty, setSelectedParty] = useState(null)

  useEffect(() => {
    Promise.all([
      getScores().then(r => r.data.scores || []),
      getPromises({ limit: 500 }).then(r => r.data.promises || [])
    ]).then(([s, p]) => {
      setScores(s)
      setPromises(p)
      if (s.length) setSelectedParty(s[0].party)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-20 text-[var(--color-muted)]">Loading completion data...</div>
  if (!scores.length) return <div className="text-center py-20 text-[var(--color-muted)]">No data. Run the pipeline first.</div>

  const partyColors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4']

  // Stacked bar data per party
  const stackedData = scores.map(s => ({
    party: s.party,
    Completed: s.scores.completed_promises,
    'In Progress': s.scores.in_progress_promises,
    Failed: s.scores.failed_promises,
    'Not Started': s.scores.total_promises - s.scores.completed_promises - s.scores.in_progress_promises - s.scores.failed_promises
  }))

  // Selected party promises
  const partyPromises = promises.filter(p => p.party === selectedParty)
  const statusGroups = {}
  partyPromises.forEach(p => {
    const s = p.completion_status || 'Not Started'
    if (!statusGroups[s]) statusGroups[s] = []
    statusGroups[s].push(p)
  })

  // Category completion for selected party
  const catCompletion = selectedParty
    ? scores.find(s => s.party === selectedParty)?.category_completion_rates || {}
    : {}
  const catData = Object.entries(catCompletion).map(([cat, rate]) => ({ cat, rate: Math.round(rate * 100) })).filter(d => d.rate > 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">Completion Tracker</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">Real-world promise fulfilment status</p>
      </div>

      {/* Completion rings */}
      <div className="card">
        <h2 className="font-semibold text-[var(--color-text)] mb-6">Overall Completion Rates</h2>
        <div className="flex flex-wrap justify-center sm:justify-around gap-3 sm:gap-6">
          {scores.map((s, i) => (
            <CompletionRing key={s.party} rate={s.scores.completion_rate} party={s.party} color={partyColors[i % partyColors.length]} />
          ))}
        </div>
      </div>

      {/* Stacked bar */}
      <div className="card">
        <h2 className="font-semibold text-[var(--color-text)] mb-4">Promise Status Breakdown</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stackedData} barGap={4} margin={{ bottom: 5 }}>
            <XAxis dataKey="party" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <Bar key={status} dataKey={status} stackId="a" fill={color}
                radius={status === 'Not Started' ? [4,4,0,0] : [0,0,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Party detail */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
          <h2 className="font-semibold text-[var(--color-text)] text-sm sm:text-base">Party Detail:</h2>
          {scores.map(s => (
            <button
              key={s.party}
              onClick={() => setSelectedParty(s.party)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${selectedParty === s.party ? 'bg-blue-600 text-white' : 'border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              {s.party}
            </button>
          ))}
        </div>

        {selectedParty && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status groups */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">Promises by Status</h3>
              <div className="space-y-3">
                {Object.entries(STATUS_COLORS).map(([status, color]) => {
                  const items = statusGroups[status] || []
                  return items.length === 0 ? null : (
                    <div key={status}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                        <span className="text-sm font-medium text-[var(--color-text)]">{status}</span>
                        <span className="text-xs text-[var(--color-muted)]">({items.length})</span>
                      </div>
                      <div className="space-y-1.5 pl-5">
                        {items.slice(0, 3).map((p, i) => (
                          <div key={i} className="text-xs text-[var(--color-muted)] bg-gray-50 dark:bg-gray-800/50 rounded p-2 border border-[var(--color-border)]">
                            {p.promise.slice(0, 120)}{p.promise.length > 120 ? '...' : ''}
                          </div>
                        ))}
                        {items.length > 3 && <div className="text-xs text-[var(--color-muted)] pl-2">+{items.length - 3} more</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Category completion */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">Completion by Category</h3>
              {catData.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={catData} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="cat" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={v => `${v}%`} />
                    <Bar dataKey="rate" radius={[0,4,4,0]}>
                      {catData.map((_, i) => <Cell key={i} fill={partyColors[i % partyColors.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-[var(--color-muted)] mt-4">No category data available.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
