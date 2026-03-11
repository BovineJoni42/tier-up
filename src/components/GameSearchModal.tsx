import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, X, Plus, Image } from 'lucide-react'
import { searchGames, rawgToGame } from '../lib/rawg'
import type { Game } from '../store/useTierStore'
import { Button } from './Button'
import { clsx } from 'clsx'

interface GameSearchModalProps {
  onSelect: (game: Game) => void
  onClose: () => void
  tierLabel?: string
}

function uid() {
  return 'manual-' + Math.random().toString(36).slice(2)
}

export function GameSearchModal({ onSelect, onClose, tierLabel }: GameSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualPlatform, setManualPlatform] = useState('')
  const [manualYear, setManualYear] = useState('')
  const [manualImg, setManualImg] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true); setError('')
    try {
      const raw = await searchGames(q)
      setResults(raw.map(rawgToGame))
    } catch {
      setError('Search failed. Check your RAWG API key or try again.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 400)
  }

  const handleManualAdd = () => {
    if (!manualTitle.trim()) return
    onSelect({
      id: uid(),
      title: manualTitle.trim(),
      coverUrl: manualImg,
      platform: manualPlatform || 'Unknown',
      releaseYear: manualYear || '—',
      isManual: true,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-brand-surface border border-brand-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-brand-border">
          <div>
            <h2 className="font-bold text-lg text-brand-text">Add Game</h2>
            {tierLabel && <p className="text-brand-sub text-sm">Adding to Tier <span className="font-semibold text-brand-text">{tierLabel}</span></p>}
          </div>
          <button onClick={onClose} className="text-brand-sub hover:text-brand-text transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 px-5 pt-4">
          <button
            onClick={() => setManualMode(false)}
            className={clsx('flex-1 py-2 rounded-lg text-sm font-semibold transition-colors', !manualMode ? 'bg-brand-accent text-white' : 'bg-brand-card text-brand-sub hover:text-brand-text')}
          >
            <Search size={14} className="inline mr-1.5" />Search Database
          </button>
          <button
            onClick={() => setManualMode(true)}
            className={clsx('flex-1 py-2 rounded-lg text-sm font-semibold transition-colors', manualMode ? 'bg-brand-accent text-white' : 'bg-brand-card text-brand-sub hover:text-brand-text')}
          >
            <Plus size={14} className="inline mr-1.5" />Manual Entry
          </button>
        </div>

        {!manualMode ? (
          <>
            {/* Search input */}
            <div className="px-5 pt-3 pb-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-sub" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={handleChange}
                  placeholder="Search for a game…"
                  className="w-full bg-brand-card border border-brand-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-brand-text placeholder-brand-sub outline-none focus:border-brand-accent transition-colors"
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 min-h-0">
              {loading && (
                <div className="text-center py-10 text-brand-sub text-sm">Searching…</div>
              )}
              {error && (
                <div className="text-center py-6 text-red-400 text-sm">{error}</div>
              )}
              {!loading && !error && results.length === 0 && query.trim() && (
                <div className="text-center py-10 text-brand-sub text-sm">No results found. Try manual entry.</div>
              )}
              {!loading && !error && results.length === 0 && !query.trim() && (
                <div className="text-center py-8 space-y-2">
                  <p className="text-brand-sub text-sm opacity-60">Start typing to search 500,000+ games</p>
                  {!import.meta.env.VITE_RAWG_API_KEY && (
                    <p className="text-xs text-yellow-500/70 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mx-4">
                      💡 Add a free RAWG API key in <code className="font-mono">.env</code> for full search access
                    </p>
                  )}
                </div>
              )}
              {results.map(game => (
                <button
                  key={game.id}
                  onClick={() => { onSelect(game); onClose() }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-brand-card border border-brand-border hover:border-brand-accent transition-all text-left group"
                >
                  {game.coverUrl ? (
                    <img src={game.coverUrl} alt={game.title} className="w-12 h-16 rounded-md object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-16 rounded-md bg-brand-muted flex items-center justify-center flex-shrink-0">
                      <Image size={16} className="text-brand-sub" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-brand-text group-hover:text-white truncate">{game.title}</p>
                    <p className="text-xs text-brand-sub mt-0.5">{game.platform} · {game.releaseYear}</p>
                  </div>
                  <Plus size={16} className="text-brand-sub group-hover:text-brand-accent flex-shrink-0" />
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Manual entry form */
          <div className="p-5 space-y-3">
            <div>
              <label className="text-xs text-brand-sub mb-1 block">Game Title *</label>
              <input
                autoFocus
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                placeholder="e.g. My Indie Gem"
                className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text placeholder-brand-sub outline-none focus:border-brand-accent transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-brand-sub mb-1 block">Platform</label>
                <input
                  value={manualPlatform}
                  onChange={e => setManualPlatform(e.target.value)}
                  placeholder="PC, PS5, Switch…"
                  className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text placeholder-brand-sub outline-none focus:border-brand-accent transition-colors"
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-brand-sub mb-1 block">Year</label>
                <input
                  value={manualYear}
                  onChange={e => setManualYear(e.target.value)}
                  placeholder="2024"
                  maxLength={4}
                  className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text placeholder-brand-sub outline-none focus:border-brand-accent transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-brand-sub mb-1 block">Cover Image URL (optional)</label>
              <input
                value={manualImg}
                onChange={e => setManualImg(e.target.value)}
                placeholder="https://…"
                className="w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text placeholder-brand-sub outline-none focus:border-brand-accent transition-colors"
              />
            </div>
            <Button
              onClick={handleManualAdd}
              disabled={!manualTitle.trim()}
              className="w-full justify-center"
              size="md"
            >
              <Plus size={16} /> Add Game
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
