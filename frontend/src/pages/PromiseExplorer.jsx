import React, { useEffect, useState, useCallback } from 'react'
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { getPromises } from '../utils/api.js'

const CATEGORIES = ['Economy','Education','Healthcare','Infrastructure','Agriculture','Women','Youth','Environment','Defence','Others']
const STATUSES = ['Completed','In Progress','Not Started','Failed']

const StatusBadge = ({ status }) => {
  const map = {
    'Completed': 'status-completed',
    'In Progress': 'status-in-progress',
    'Not Started': 'status-not-started',
    'Failed': 'status-failed',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'status-not-started'}`}>{status}</span>
}

const ProbBar = ({ prob, label }) => {
  const color = label === 'Likely' ? 'bg-emerald-500' : label === 'Uncertain' ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.round((prob || 0) * 100)}%` }} />
      </div>
      <span className="text-xs text-[var(--color-muted)] w-12 text-right">{Math.round((prob || 0) * 100)}%</span>
    </div>
  )
}

export default function PromiseExplorer() {
  const [promises, setPromises] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ party: '', category: '', status: '' })
  const LIMIT = 20

  const fetchPromises = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: LIMIT, offset: page * LIMIT }
      if (filters.party) params.party = filters.party
      if (filters.category) params.category = filters.category
      if (filters.status) params.status = filters.status
      const r = await getPromises(params)
      let items = r.data.promises || []
      if (search) {
        const q = search.toLowerCase()
        items = items.filter(p => p.promise?.toLowerCase().includes(q))
      }
      setPromises(items)
      setTotal(r.data.total || 0)
    } catch { setPromises([]) }
    finally { setLoading(false) }
  }, [page, filters, search])

  useEffect(() => { fetchPromises() }, [fetchPromises])
  useEffect(() => { setPage(0) }, [filters, search])

  const parties = ['BJP','INC','AAP','SP','BSP','TMC']
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">Promise Explorer</h1>
        <p className="text-[var(--color-muted)] text-sm mt-1">{total} promises extracted</p>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-40 border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg)]">
            <Search size={14} className="text-[var(--color-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search promises..."
              className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-none"
            />
          </div>
          {/* Party filter */}
          <select
            value={filters.party}
            onChange={e => setFilters(f => ({ ...f, party: e.target.value }))}
            className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)] outline-none"
          >
            <option value="">All Parties</option>
            {parties.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {/* Category filter */}
          <select
            value={filters.category}
            onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
            className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)] outline-none"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* Status filter */}
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm bg-[var(--color-bg)] text-[var(--color-text)] outline-none"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => setFilters({ party: '', category: '', status: '' })} className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-1">
            <Filter size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Promise list */}
      {loading ? (
        <div className="text-center py-12 text-[var(--color-muted)]">Loading promises...</div>
      ) : promises.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-muted)]">No promises found. Run the pipeline first.</div>
      ) : (
        <div className="space-y-3">
          {promises.map((p, i) => (
            <div key={p.id || i} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{p.party}</span>
                  <span className="text-xs text-[var(--color-muted)]">{p.year}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">{p.category}</span>
                  <StatusBadge status={p.completion_status} />
                </div>
                <div className="text-xs text-[var(--color-muted)]">
                  {p.source === 'groq' ? '🤖 AI extracted' : '📋 Rule-based'}
                </div>
              </div>
              <p className="text-sm text-[var(--color-text)] leading-relaxed">{p.promise}</p>
              {p.completion_probability != null && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                    <span>Completion probability</span>
                    <span className={`font-medium ${p.probability_label === 'Likely' ? 'text-emerald-600 dark:text-emerald-400' : p.probability_label === 'Uncertain' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                      {p.probability_label}
                    </span>
                  </div>
                  <ProbBar prob={p.completion_probability} label={p.probability_label} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} className="p-2 rounded-lg border border-[var(--color-border)] disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-[var(--color-muted)]">Page {page+1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page >= totalPages-1} className="p-2 rounded-lg border border-[var(--color-border)] disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
