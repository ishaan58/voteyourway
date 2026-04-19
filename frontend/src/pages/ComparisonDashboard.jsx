import React, { useEffect, useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell,
  ScatterChart, Scatter, CartesianGrid, ReferenceLine
} from 'recharts'
import { getScores, getClustering, getApriori, getOverview } from '../utils/api.js'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ec4899']
const CATEGORIES = ['Economy','Education','Healthcare','Infrastructure','Agriculture','Women','Youth','Environment','Defence']

export default function ComparisonDashboard() {
  const [scores, setScores]       = useState([])
  const [clustering, setClustering] = useState(null)
  const [apriori, setApriori]     = useState(null)
  const [overview, setOverview]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('radar')

  useEffect(() => {
    Promise.all([
      getScores().then(r => r.data.scores || []),
      getClustering().then(r => r.data).catch(() => null),
      getApriori().then(r => r.data).catch(() => null),
      getOverview().then(r => r.data).catch(() => null)
    ]).then(([s, c, a, o]) => {
      setScores(s); setClustering(c); setApriori(a); setOverview(o)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-20" style={{ color: 'var(--color-muted)' }}>Loading...</div>
  if (!scores.length) return <div className="text-center py-20" style={{ color: 'var(--color-muted)' }}>No data. Run the pipeline first.</div>

  // ── Radar data ───────────────────────────────────────────────────────────────
  const radarData = CATEGORIES.map(cat => {
    const row = { category: cat }
    scores.forEach(s => {
      row[s.party] = Math.round((s.category_completion_rates?.[cat] || 0) * 100)
    })
    return row
  })

  // ── Score bar data ───────────────────────────────────────────────────────────
  const scoreKeys = ['completion_rate','predicted_completion_strength','category_coverage','promise_density','consistency_score']
  const scoreLabels = {
    completion_rate: 'Completion',
    predicted_completion_strength: 'Prediction',
    category_coverage: 'Coverage',
    promise_density: 'Density',
    consistency_score: 'Consistency'
  }
  const scoreBarData = scoreKeys.map(key => {
    const row = { metric: scoreLabels[key] }
    scores.forEach(s => { row[s.party] = Math.round((s.scores[key] || 0) * 100) })
    return row
  })

  // ── Scatter: force domain so points don't collapse ───────────────────────────
  const clusterData = clustering?.pca_coords || []
  const xs = clusterData.map(d => d.x)
  const ys = clusterData.map(d => d.y)
  const xPad = Math.max((Math.max(...xs) - Math.min(...xs)) * 0.4, 2)
  const yPad = Math.max((Math.max(...ys) - Math.min(...ys)) * 0.4, 2)
  const xDomain = clusterData.length
    ? [Math.min(...xs) - xPad, Math.max(...xs) + xPad]
    : [-5, 5]
  const yDomain = clusterData.length
    ? [Math.min(...ys) - yPad, Math.max(...ys) + yPad]
    : [-5, 5]

  // ── Category dist: overview.category_distribution is FLAT {cat: count} ───────
  // Build per-party breakdown from scores[].category_distribution instead
  // scores[] each have { party, category_distribution: { Economy: N, ... } }
  const partyCategories = scores.map((s, i) => ({
    party: s.party,
    color: COLORS[i % COLORS.length],
    data: Object.entries(s.category_distribution || {})
      .map(([cat, count]) => ({ cat, count }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count)
  }))

  const rules    = apriori?.rules || []
  const itemsets = apriori?.frequent_itemsets || []

  const tabs = [
    { id: 'radar',   label: 'Category Radar'  },
    { id: 'scores',  label: 'Score Breakdown' },
    { id: 'cluster', label: 'Clustering'      },
    { id: 'apriori', label: 'Assoc. Rules'    },
    { id: 'cat',     label: 'Category Dist.'  },
  ]

  const tabBtn = (t) => ({
    padding: '6px 16px',
    fontSize: 11,
    fontWeight: 400,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    border: '1px solid var(--color-border)',
    borderRadius: 1,
    cursor: 'pointer',
    transition: 'all 0.15s',
    background:  activeTab === t.id ? 'var(--color-text)' : 'transparent',
    color:       activeTab === t.id ? 'var(--color-bg)'   : 'var(--color-muted)',
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 max(12px, 3%)' }} className="space-y-6">
      <div>
        <h1 style={{ fontSize: 'clamp(18px, 5vw, 22px)', fontWeight: 300, color: 'var(--color-text)', marginBottom: 4 }}>Party Comparison</h1>
        <p style={{ fontSize: 12, color: 'var(--color-muted)', letterSpacing: '0.04em' }}>Multi-dimensional analysis — ML & data mining</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabBtn(t)} className="text-xs sm:text-sm">{t.label}</button>
        ))}
      </div>

      {/* ── RADAR ── */}
      {activeTab === 'radar' && (
        <div className="card">
          <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 20 }}>Category completion by party</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-muted)' }} />
              {scores.map((s, i) => (
                <Radar key={s.party} name={s.party} dataKey={s.party}
                  stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.12} strokeWidth={1.5} />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip formatter={v => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── SCORES ── */}
      {activeTab === 'scores' && (
        <div className="space-y-5">
          <div className="card">
            <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 16 }}>Final scores</h2>
            <div className="space-y-3">
              {scores.map((s, i) => (
                <div key={s.party} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 60, fontSize: 12, fontWeight: 500, color: 'var(--color-text)', flexShrink: 0 }}>
                    #{s.rank} {s.party}
                  </div>
                  <div style={{ flex: 1, height: 20, background: 'var(--color-border)', borderRadius: 1, overflow: 'hidden' }}>
                    <div style={{
                      width: `${s.scores.final_score * 100}%`,
                      height: '100%',
                      background: COLORS[i % COLORS.length],
                      display: 'flex', alignItems: 'center', paddingLeft: 6
                    }}>
                      <span style={{ fontSize: 10, color: '#fff', fontWeight: 500 }}>{(s.scores.final_score * 100).toFixed(1)}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)', width: 36, textAlign: 'right' }}>
                    {(s.scores.final_score * 100).toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 16 }}>Score components (%)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreBarData}>
                <XAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
                <Tooltip formatter={v => `${v}%`} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {scores.map((s, i) => (
                  <Bar key={s.party} dataKey={s.party} fill={COLORS[i % COLORS.length]} radius={[2,2,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── CLUSTERING ── */}
      {activeTab === 'cluster' && (
        <div className="card">
          <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 4 }}>K-Means clustering (PCA 2D)</h2>
          <p style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 20 }}>Parties clustered by TF-IDF + category distribution features</p>

          {clusterData.length ? (
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" opacity={0.5} />
                <XAxis
                  type="number" dataKey="x" name="PC1"
                  domain={xDomain}
                  tickFormatter={v => v.toFixed(1)}
                  tick={{ fontSize: 10, fill: 'var(--color-muted)' }}
                  label={{ value: 'PC1', position: 'insideBottom', offset: -8, fontSize: 10, fill: 'var(--color-muted)' }}
                />
                <YAxis
                  type="number" dataKey="y" name="PC2"
                  domain={yDomain}
                  tickFormatter={v => v.toFixed(1)}
                  tick={{ fontSize: 10, fill: 'var(--color-muted)' }}
                  label={{ value: 'PC2', angle: -90, position: 'insideLeft', offset: 8, fontSize: 10, fill: 'var(--color-muted)' }}
                />
                <Tooltip
                  cursor={false}
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div style={{
                        background: 'var(--color-card)', border: '1px solid var(--color-border)',
                        padding: '6px 10px', fontSize: 11, borderRadius: 2
                      }}>
                        <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{d.party}</div>
                        <div style={{ color: 'var(--color-muted)' }}>Cluster {d.cluster}</div>
                        <div style={{ color: 'var(--color-muted)' }}>x: {d.x.toFixed(2)}, y: {d.y.toFixed(2)}</div>
                      </div>
                    )
                  }}
                />
                {clusterData.map((d) => (
                  <Scatter
                    key={d.party} name={d.party} data={[d]}
                    fill={COLORS[d.cluster % COLORS.length]}
                    shape={(props) => {
                      const { cx, cy } = props
                      const color = COLORS[d.cluster % COLORS.length]
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={22} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} />
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
                            fontSize={11} fontWeight="500" fill={color}>{d.party}</text>
                        </g>
                      )
                    }}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-muted)', fontSize: 13 }}>
              No clustering data available.
            </div>
          )}

          {clustering?.clusters?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginTop: 20 }}>
              {clustering.clusters.map(cl => (
                <div key={cl.id} style={{
                  padding: '10px 12px', border: '1px solid var(--color-border)',
                  borderRadius: 2, background: 'transparent'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[cl.id % COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Cluster {cl.id}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{cl.parties.join(', ')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── APRIORI ── */}
      {activeTab === 'apriori' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 6 }}>Frequent itemsets</h2>
            <p style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 14 }}>Categories that co-occur across manifestoes</p>
            {itemsets.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {itemsets.slice(0, 12).map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 2
                  }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {item.itemset.map(cat => (
                        <span key={cat} style={{
                          padding: '2px 8px', fontSize: 10, letterSpacing: '0.06em',
                          border: '1px solid var(--color-border)', borderRadius: 1,
                          color: 'var(--color-text)', background: 'transparent'
                        }}>{cat}</span>
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--color-muted)', marginLeft: 8, flexShrink: 0 }}>
                      {(item.support * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-muted)', fontSize: 12 }}>No itemsets found.</div>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 6 }}>Association rules</h2>
            <p style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 14 }}>If party promises X → likely also promises Y</p>
            {rules.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rules.slice(0, 10).map((rule, i) => (
                  <div key={i} style={{ padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, fontSize: 11 }}>
                      {rule.antecedents.map(a => (
                        <span key={a} style={{ padding: '2px 7px', border: '1px solid var(--color-border)', borderRadius: 1, color: 'var(--color-text)' }}>{a}</span>
                      ))}
                      <span style={{ color: 'var(--color-muted)' }}>→</span>
                      {rule.consequents.map(c => (
                        <span key={c} style={{ padding: '2px 7px', background: 'var(--color-accent-muted)', borderRadius: 1, color: 'var(--color-accent)', fontSize: 11 }}>{c}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 10, color: 'var(--color-muted)' }}>
                      <span>Conf <strong style={{ color: 'var(--color-text)' }}>{(rule.confidence * 100).toFixed(0)}%</strong></span>
                      <span>Support <strong style={{ color: 'var(--color-text)' }}>{(rule.support * 100).toFixed(0)}%</strong></span>
                      <span>Lift <strong style={{ color: 'var(--color-text)' }}>{rule.lift.toFixed(2)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-muted)', fontSize: 12 }}>No rules found. More data needed.</div>
            )}
          </div>
        </div>
      )}

      {/* ── CATEGORY DIST ── */}
      {activeTab === 'cat' && (
        <div className="card">
          <h2 style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 20 }}>Category distribution per party</h2>
          {/* Uses scores[].category_distribution (nested by party) — NOT the flat overview.category_distribution */}
          {partyCategories.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {partyCategories.map(({ party, color, data }) => (
                <div key={party}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text)' }}>{party}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>— {data.reduce((s, d) => s + d.count, 0)} promises</span>
                  </div>
                  {data.length > 0 ? (
                    <div style={{ height: Math.max(data.length * 28, 80) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                          <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="cat" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} width={100} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ fontSize: 11 }} />
                          <Bar dataKey="count" fill={color} radius={[0, 2, 2, 0]} maxBarSize={18} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>No category data.</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-muted)', fontSize: 13 }}>No data available.</div>
          )}
        </div>
      )}
    </div>
  )
}