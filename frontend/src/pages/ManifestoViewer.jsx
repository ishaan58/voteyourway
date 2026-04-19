import React, { useEffect, useState } from 'react'
import { FileText, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { getManifestoes, getManifestoText } from '../utils/api.js'

export default function ManifestoViewer() {
  const [manifestoes, setManifestoes] = useState([])
  const [selected, setSelected] = useState(null)
  const [text, setText] = useState('')
  const [loadingText, setLoadingText] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    getManifestoes()
      .then(r => setManifestoes(r.data.manifestoes || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (m) => {
    if (selected?.label === m.label) {
      setSelected(null); setText(''); return
    }
    setSelected(m)
    setLoadingText(true)
    try {
      const r = await getManifestoText(m.party_code || m.party, m.year)
      setText(r.data.text || '')
    } catch { setText('Text not available.') }
    finally { setLoadingText(false) }
  }

  // Group by party
  const byParty = manifestoes.reduce((acc, m) => {
    if (!acc[m.party]) acc[m.party] = []
    acc[m.party].push(m)
    return acc
  }, {})

  const partyColors = { BJP: 'orange', INC: 'blue', AAP: 'cyan', default: 'gray' }
  const getColor = (party) => partyColors[party] || partyColors.default

  if (loading) return <div className="text-center py-20 text-[var(--color-muted)]">Loading manifestoes...</div>

  if (!manifestoes.length) {
    return (
      <div className="max-w-xl mx-auto mt-16 card text-center px-4 py-8">
        <FileText size={40} className="text-[var(--color-muted)] mx-auto mb-3" />
        <h2 className="font-bold text-lg text-[var(--color-text)]">No Manifestoes Found</h2>
        <p className="text-[var(--color-muted)] text-sm mt-2">
          Add PDF files to <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">/data/manifestoes/</code> and run the pipeline.
        </p>
        <div className="mt-4 text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs font-mono space-y-1 overflow-x-auto">
          {['bjp_2009.pdf','bjp_2014.pdf','bjp_2019.pdf','inc_2009.pdf','inc_2014.pdf','inc_2019.pdf'].map(f => <div key={f}>{f}</div>)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">Manifesto Viewer</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{manifestoes.length} manifestoes across {Object.keys(byParty).length} parties</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Left: List */}
        <div className="space-y-4">
          {Object.entries(byParty).map(([party, files]) => {
            const color = getColor(party)
            const isExpanded = expanded[party] !== false
            return (
              <div key={party} className="card p-0 overflow-hidden">
                <button
                  onClick={() => setExpanded(e => ({ ...e, [party]: !isExpanded }))}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}>
                      <span className={`text-${color}-700 dark:text-${color}-300 text-xs font-bold`}>{party.slice(0,3)}</span>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-sm text-[var(--color-text)]">{party}</div>
                      <div className="text-xs text-[var(--color-muted)]">{files.length} manifesto{files.length > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-[var(--color-muted)]" /> : <ChevronDown size={16} className="text-[var(--color-muted)]" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--color-border)]">
                    {files.sort((a,b) => a.year - b.year).map(m => (
                      <button
                        key={m.label}
                        onClick={() => handleSelect(m)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors ${selected?.label === m.label ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-600' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} className="text-[var(--color-muted)]" />
                          <span className="text-[var(--color-text)] font-medium">{m.year} Manifesto</span>
                        </div>
                        <div className="text-xs text-[var(--color-muted)]">{m.word_count?.toLocaleString()} words</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right: Text viewer */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="card h-full flex items-center justify-center min-h-64 text-center">
              <div>
                <FileText size={40} className="text-[var(--color-muted)] mx-auto mb-3" />
                <p className="text-[var(--color-muted)]">Select a manifesto to read its content</p>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--color-border)]">
                <div>
                  <h2 className="font-bold text-lg text-[var(--color-text)]">{selected.party} — {selected.year}</h2>
                  <p className="text-sm text-[var(--color-muted)]">{selected.word_count?.toLocaleString()} words · {selected.filename}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300`}>
                  PDF Parsed
                </span>
              </div>
              {loadingText ? (
                <div className="flex items-center justify-center h-48 text-[var(--color-muted)]">Extracting text from PDF...</div>
              ) : (
                <div className="overflow-auto max-h-[60vh]">
                  <p className="text-sm text-[var(--color-muted)] mb-3 italic">Showing first 5000 characters of extracted text</p>
                  <pre className="text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed font-sans">
                    {text || 'No text extracted.'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
