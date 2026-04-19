import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, TrendingUp, RotateCcw, Sliders } from 'lucide-react'
import { getScores, getCustomScores, getRecommendation } from '../utils/api.js'

const CATEGORIES = ['Economy','Education','Healthcare','Infrastructure','Agriculture','Women','Youth','Environment','Defence','Others']
const PARTY_COLORS = ['#C84B2F','#3b82f6','#10b981','#8b5cf6','#06b6d4']

const ScoreBar = ({ label, value, color }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
      <span style={{ color: 'var(--color-muted)' }}>{label}</span>
      <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{(value * 100).toFixed(1)}%</span>
    </div>
    <div style={{ height: 3, background: 'var(--color-border)', borderRadius: 0 }}>
      <div style={{ height: '100%', width: `${value * 100}%`, background: color, transition: 'width 0.4s ease' }} />
    </div>
  </div>
)

export default function Recommendation() {
  const [scores, setScores]           = useState([])
  const [recommendation, setRec]      = useState(null)
  const [loading, setLoading]         = useState(true)
  const [catWeights, setCatWeights]   = useState(Object.fromEntries(CATEGORIES.map(c => [c, 1])))
  const [priorityCat, setPriorityCat] = useState('')
  const [applying, setApplying]       = useState(false)
  const [applied, setApplied]         = useState(false)
  const [expanded, setExpanded]       = useState({})
  const [showWeights, setShowWeights] = useState(false)
  const [error, setError]             = useState(null)

  useEffect(() => {
    Promise.all([
      getScores().then(r => r.data.scores || []),
      getRecommendation().then(r => r.data).catch(() => null)
    ]).then(([s, r]) => { setScores(s); setRec(r) })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const handleApplyWeights = async () => {
    setApplying(true)
    setError(null)
    try {
      const r = await getCustomScores({
        category_weights: catWeights,
        priority_category: priorityCat || null
      })
      setScores(r.data.scores || [])
      setRec(r.data.recommendation)
      setApplied(true)
    } catch (e) {
      setError('Failed to apply weights — check backend')
    } finally {
      setApplying(false)
    }
  }

  const handleReset = async () => {
    const reset = Object.fromEntries(CATEGORIES.map(c => [c, 1]))
    setCatWeights(reset)
    setPriorityCat('')
    setApplied(false)
    setError(null)
    setLoading(true)
    try {
      const [s, r] = await Promise.all([
        getScores().then(d => d.data.scores || []),
        getRecommendation().then(d => d.data).catch(() => null)
      ])
      setScores(s); setRec(r)
    } finally { setLoading(false) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--color-muted)', fontSize: 13 }}>Loading...</div>
  if (!scores.length) return <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--color-muted)', fontSize: 13 }}>No data. Run the pipeline first.</div>

  const winner = scores[0]

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 max(12px, 3%)' }} className="space-y-6">

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 300, color: 'var(--color-text)', marginBottom: 4 }}>Recommendation</h1>
        <p style={{ fontSize: 12, color: 'var(--color-muted)', letterSpacing: '0.04em' }}>
          Data-driven party ranking · ML scoring formula
          {applied && <span style={{ marginLeft: 10, color: 'var(--color-accent)', fontWeight: 500 }}>· Custom weights applied</span>}
        </p>
      </div>

      {/* Winner */}
      {winner && (
        <div style={{
          border: '1px solid var(--color-border)',
          borderLeft: `3px solid ${PARTY_COLORS[0]}`,
          padding: 'max(12px, 3%) max(12px, 3%)',
          background: 'var(--color-card)',
        }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 8 }}>
            Top recommended party
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'clamp(22px, 8vw, 32px)', fontWeight: 300, color: 'var(--color-text)', fontFamily: 'DM Serif Display, serif', fontStyle: 'italic' }}>
              {winner.party}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
              Score: <strong style={{ color: 'var(--color-text)' }}>{(winner.scores.final_score * 100).toFixed(1)}</strong> / 100
            </span>
          </div>

          {recommendation && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
              {recommendation.rationale?.completion_leader && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-muted)' }}>
                  <CheckCircle2 size={12} />
                  Completion leader: <strong style={{ color: 'var(--color-text)' }}>{recommendation.rationale.completion_leader}</strong>
                </span>
              )}
              {recommendation.rationale?.prediction_leader && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-muted)' }}>
                  <TrendingUp size={12} />
                  Prediction leader: <strong style={{ color: 'var(--color-text)' }}>{recommendation.rationale.prediction_leader}</strong>
                </span>
              )}
              {recommendation.best_for_category && (
                <span style={{ color: 'var(--color-muted)' }}>
                  Best for {recommendation.priority_category}: <strong style={{ color: 'var(--color-text)' }}>{recommendation.best_for_category}</strong>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Full ranking */}
      <div>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 12 }}>
          Full ranking
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {scores.map((s, i) => (
            <div key={s.party} style={{ border: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
              <button
                onClick={() => setExpanded(e => ({ ...e, [s.party]: !e[s.party] }))}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 20px', background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left'
                }}
              >
                {/* Rank */}
                <span style={{ fontSize: 11, color: 'var(--color-muted)', width: 20, flexShrink: 0, letterSpacing: '0.06em' }}>
                  #{s.rank}
                </span>

                {/* Party name */}
                <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--color-text)', width: 60, flexShrink: 0 }}>
                  {s.party}
                </span>

                {/* Score bar */}
                <div style={{ flex: 1, height: 2, background: 'var(--color-border)' }}>
                  <div style={{
                    height: '100%',
                    width: `${s.scores.final_score * 100}%`,
                    background: PARTY_COLORS[i % PARTY_COLORS.length],
                    transition: 'width 0.5s ease'
                  }} />
                </div>

                {/* Score number */}
                <span style={{ fontSize: 14, fontWeight: 500, color: PARTY_COLORS[i % PARTY_COLORS.length], width: 36, textAlign: 'right', flexShrink: 0 }}>
                  {(s.scores.final_score * 100).toFixed(1)}
                </span>

                {/* Expand toggle */}
                <span style={{ color: 'var(--color-muted)', flexShrink: 0 }}>
                  {expanded[s.party] ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
                </span>
              </button>

              {/* Expanded detail */}
              {expanded[s.party] && (
                <div style={{
                  padding: '0 12px 12px',
                  borderTop: '1px solid var(--color-border)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: 16,
                  marginTop: 0,
                  paddingTop: 16
                }}>
                  {/* Score breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <ScoreBar label="Completion Rate (×0.40)" value={s.scores.completion_rate} color={PARTY_COLORS[i % PARTY_COLORS.length]} />
                    <ScoreBar label="Predicted Completion (×0.20)" value={s.scores.predicted_completion_strength} color={PARTY_COLORS[i % PARTY_COLORS.length]} />
                    <ScoreBar label="Category Coverage (×0.15)" value={s.scores.category_coverage} color={PARTY_COLORS[i % PARTY_COLORS.length]} />
                    <ScoreBar label="Promise Density (×0.10)" value={s.scores.promise_density} color={PARTY_COLORS[i % PARTY_COLORS.length]} />
                    <ScoreBar label="Consistency Score (×0.15)" value={s.scores.consistency_score} color={PARTY_COLORS[i % PARTY_COLORS.length]} />
                  </div>

                  {/* Stat grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start' }}>
                    {[
                      ['Total', s.scores.total_promises],
                      ['Completed', s.scores.completed_promises],
                      ['In Progress', s.scores.in_progress_promises],
                      ['Failed', s.scores.failed_promises],
                      ['ML Likely', s.scores.likely_completions],
                    ].map(([k, v]) => (
                      <div key={k} style={{
                        padding: '10px 12px',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg)'
                      }}>
                        <div style={{ fontSize: 18, fontWeight: 400, color: 'var(--color-text)' }}>{v}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Personalise panel */}
      <div style={{ border: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
        <button
          onClick={() => setShowWeights(w => !w)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sliders size={14} strokeWidth={1.5} style={{ color: 'var(--color-muted)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text)' }}>Personalise category priorities</div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>
                Re-weight what matters to you — recalculates ranking instantly
              </div>
            </div>
          </div>
          <span style={{ color: 'var(--color-muted)' }}>
            {showWeights ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
          </span>
        </button>

        {showWeights && (
          <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--color-border)' }}>

            {/* Sliders grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px 32px', marginTop: 20 }}>
              {CATEGORIES.map(cat => {
                const w = catWeights[cat]
                const pct = (w / 3) * 100
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text)' }}>{cat}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 500, letterSpacing: '0.06em',
                        color: w === 0 ? 'var(--color-muted)' : w >= 2 ? 'var(--color-accent)' : 'var(--color-text)'
                      }}>
                        {w === 0 ? 'OFF' : `${w}×`}
                      </span>
                    </div>
                    {/* Custom styled track */}
                    <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
                      <div style={{ position: 'absolute', width: '100%', height: 2, background: 'var(--color-border)' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: w === 0 ? 'var(--color-border)' : 'var(--color-accent)', transition: 'width 0.1s' }} />
                      </div>
                      <input
                        type="range" min={0} max={3} step={0.5}
                        value={w}
                        onChange={e => { setCatWeights(prev => ({ ...prev, [cat]: parseFloat(e.target.value) })); setApplied(false) }}
                        style={{
                          position: 'absolute', width: '100%', opacity: 0, height: 20,
                          cursor: 'pointer', margin: 0, padding: 0
                        }}
                      />
                      {/* Custom thumb */}
                      <div style={{
                        position: 'absolute',
                        left: `calc(${pct}% - 6px)`,
                        width: 12, height: 12,
                        borderRadius: '50%',
                        background: w === 0 ? 'var(--color-muted)' : 'var(--color-accent)',
                        border: '2px solid var(--color-card)',
                        boxShadow: '0 0 0 1px var(--color-border)',
                        pointerEvents: 'none',
                        transition: 'left 0.1s, background 0.15s'
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Priority category */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
              <span style={{ fontSize: 12, color: 'var(--color-muted)', flexShrink: 0 }}>Priority category:</span>
              <select
                value={priorityCat}
                onChange={e => { setPriorityCat(e.target.value); setApplied(false) }}
                style={{
                  padding: '6px 10px', fontSize: 12,
                  border: '1px solid var(--color-border)',
                  borderRadius: 1, background: 'var(--color-bg)',
                  color: 'var(--color-text)', outline: 'none'
                }}
              >
                <option value="">None</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-accent)', padding: '8px 12px', border: '1px solid var(--color-accent-muted)', borderRadius: 1 }}>
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                className="btn-primary"
                onClick={handleApplyWeights}
                disabled={applying}
              >
                {applying ? 'Calculating…' : applied ? 'Weights applied ✓' : 'Apply weights'}
              </button>
              <button
                className="btn-ghost"
                onClick={handleReset}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RotateCcw size={11} strokeWidth={1.5} />
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Formula */}
      <div style={{ padding: '16px 20px', border: '1px solid var(--color-border)', background: 'var(--color-card)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 8 }}>
          Scoring formula
        </div>
        <code style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.8, display: 'block' }}>
          Score = (completion_rate × 0.40) + (predicted_strength × 0.20)<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (category_coverage × 0.15) + (promise_density × 0.10)<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ (consistency_score × 0.15)
        </code>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-muted)' }}>
          Category weights scale the predicted_strength component. Setting a category to 0× excludes it from scoring.
        </div>
      </div>

    </div>
  )
}