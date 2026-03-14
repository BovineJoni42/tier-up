import { useState, useEffect, useRef, useCallback } from 'react'
import { searchGames, RAWG_GENRES, GENRE_LABELS } from '../lib/rawg'
import type { SearchResult } from '../lib/rawg'
import { searchMovies, searchTV, MOVIE_GENRES, TV_GENRES } from '../lib/tmdb'
import type { TierId, Game, ListType } from '../store/useTierStore'
import { TIER_META, TIER_ORDER } from '../store/useTierStore'
import Button from './Button'

interface GameSearchModalProps {
  open: boolean
  defaultTier?: TierId
  listType?: ListType
  onClose: () => void
  onAddGame: (game: Game, tierId: TierId) => void
}

type Tab = 'search' | 'manual'

export default function GameSearchModal({
  open,
  defaultTier,
  listType = 'games',
  onClose,
  onAddGame,
}: GameSearchModalProps) {
  const [tab, setTab] = useState<Tab>('search')
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState('All')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedGame, setSelectedGame] = useState<SearchResult | null>(null)
  const [selectedTier, setSelectedTier] = useState<TierId>(defaultTier ?? 'b')

  // Manual entry
  const [manualTitle, setManualTitle] = useState('')
  const [manualCover, setManualCover] = useState('')
  const [manualPlatform, setManualPlatform] = useState('')
  const [manualYear, setManualYear] = useState(new Date().getFullYear().toString())

  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedGame(null)
      setSelectedTier(defaultTier ?? 'b')
      setTab('search')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, defaultTier])

  const doSearch = useCallback(async (q: string, g: string) => {
    if (!q.trim() && (!g || g === 'All')) { setResults([]); return }
    setLoading(true)
    let r: SearchResult[] = []
    if (listType === 'movies') {
      r = await searchMovies(q, g === 'All' ? undefined : g)
    } else if (listType === 'tv') {
      r = await searchTV(q, g === 'All' ? undefined : g)
    } else {
      r = await searchGames(q, g === 'All' ? undefined : g)
    }
    setResults(r)
    setLoading(false)
  }, [listType])

  const handleQueryChange = (q: string) => {
    setQuery(q)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => doSearch(q, genre), 400)
  }

  const handleGenreChange = (g: string) => {
    setGenre(g)
    // Always search when genre changes, even with no query
    doSearch(query, g === 'All' ? '' : g)
  }

  const handleAdd = () => {
    if (!selectedGame) return
    const game: Game = {
      id: selectedGame.id,
      title: selectedGame.title,
      cover: selectedGame.cover,
      platform: selectedGame.platform,
      year: selectedGame.year,
      genre: selectedGame.genre,
    }
    onAddGame(game, selectedTier)
    onClose()
  }

  const handleManualAdd = () => {
    if (!manualTitle.trim()) return
    const game: Game = {
      id: `manual-${Date.now()}`,
      title: manualTitle.trim(),
      cover: manualCover.trim(),
      platform: manualPlatform.trim() || 'Unknown',
      year: parseInt(manualYear) || new Date().getFullYear(),
      genre: 'Unknown',
    }
    onAddGame(game, selectedTier)
    onClose()
    setManualTitle('')
    setManualCover('')
    setManualPlatform('')
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#14142a] border border-slate-700 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="font-display text-xl font-bold tracking-wide">{listType === 'movies' ? 'Add Movie' : listType === 'tv' ? 'Add TV Show' : 'Add Game'}</h2>
          <Button variant="icon" size="sm" onClick={onClose}>✕</Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          {(['search', 'manual'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors capitalize
                ${tab === t
                  ? 'text-violet-400 border-b-2 border-violet-500'
                  : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              {t === 'search' ? '🔍 Search Database' : '✏️ Manual Entry'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {tab === 'search' && (
            <div className="p-4 flex flex-col gap-3 h-full">
              {/* Search input */}
              <input
                ref={inputRef}
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder={listType === 'movies' ? 'Search movies...' : listType === 'tv' ? 'Search TV shows...' : 'Search 500,000+ games...'}
                className="w-full bg-[#0e0e1a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
              />

              {/* Genre chips */}
              <div className="flex gap-2 flex-wrap">
                {(listType === 'movies' ? MOVIE_GENRES : listType === 'tv' ? TV_GENRES : RAWG_GENRES).map(g => (
                  <button
                    key={g}
                    onClick={() => handleGenreChange(g)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors
                      ${genre === g
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'border-slate-700 text-slate-400 hover:border-violet-500 hover:text-slate-200'
                      }`}
                  >
                    {listType === 'games' ? (GENRE_LABELS[g] ?? g) : g}
                  </button>
                ))}
              </div>

              {/* Results */}
              {loading && (
                <div className="text-center text-slate-500 text-sm py-8 font-mono">Searching…</div>
              )}

              {!loading && results.length === 0 && query && (
                <div className="text-center text-slate-500 text-sm py-8 font-mono">No results found</div>
              )}

              {!loading && results.length === 0 && !query && (
                <div className="text-center text-slate-600 text-sm py-8 font-mono">{listType === 'movies' ? 'Search movies or pick a genre' : listType === 'tv' ? 'Search TV shows or pick a genre' : 'Type to search, or pick a genre above'}</div>
              )}

              {!loading && results.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5 overflow-y-auto pb-2">
                  {results.map(game => (
                    <button
                      key={game.id}
                      onClick={() => setSelectedGame(game)}
                      className={`rounded-xl overflow-hidden border transition-all text-left
                        ${selectedGame?.id === game.id
                          ? 'border-violet-500 shadow-[0_0_12px_rgba(124,58,237,0.4)] scale-[1.02]'
                          : 'border-slate-700 hover:border-violet-600 hover:-translate-y-0.5'
                        }`}
                    >
                      {game.cover ? (
                        <img
                          src={game.cover}
                          alt={game.title}
                          className="w-full aspect-[3/4] object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-[3/4] bg-slate-800 flex items-center justify-center p-2">
                          <span className="text-[9px] text-slate-400 text-center leading-tight">{game.title}</span>
                        </div>
                      )}
                      <div className="p-1.5">
                        <div className="text-[10px] font-semibold text-white leading-tight truncate">{game.title}</div>
                        <div className="text-[9px] text-slate-500 font-mono">{game.year}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'manual' && (
            <div className="p-4 flex flex-col gap-3">
              <input
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                placeholder={listType === 'movies' ? 'Movie title *' : listType === 'tv' ? 'Show title *' : 'Game title *'}
                className="w-full bg-[#0e0e1a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500"
              />
              <input
                value={manualCover}
                onChange={e => setManualCover(e.target.value)}
                placeholder="Cover image URL (optional)"
                className="w-full bg-[#0e0e1a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500"
              />
              <div className="flex gap-3">
                <input
                  value={manualPlatform}
                  onChange={e => setManualPlatform(e.target.value)}
                  placeholder={listType === 'movies' ? 'Studio / Director' : listType === 'tv' ? 'Network (e.g. HBO)' : 'Platform (e.g. PS5)'}
                  className="flex-1 bg-[#0e0e1a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500"
                />
                <input
                  value={manualYear}
                  onChange={e => setManualYear(e.target.value)}
                  placeholder="Year"
                  type="number"
                  className="w-24 bg-[#0e0e1a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500"
                />
              </div>

              {/* Cover preview */}
              {manualCover && (
                <div className="flex items-center gap-3 bg-[#0e0e1a] rounded-xl p-3 border border-slate-800">
                  <img
                    src={manualCover}
                    alt="preview"
                    className="w-12 h-16 object-cover rounded-lg border border-slate-700"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <span className="text-xs text-slate-400 font-mono">Cover preview</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — tier picker + add button */}
        <div className="border-t border-slate-800 p-4 flex flex-col gap-3">
          {/* Selected game info */}
          {tab === 'search' && selectedGame && (
            <div className="flex items-center gap-3 bg-[#0e0e1a] rounded-xl p-2.5 border border-slate-800">
              {selectedGame.cover && (
                <img src={selectedGame.cover} alt={selectedGame.title} className="w-9 h-12 object-cover rounded-md" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{selectedGame.title}</div>
                <div className="text-xs text-slate-400 font-mono">{selectedGame.platform} · {selectedGame.year}</div>
              </div>
            </div>
          )}

          {/* Tier picker */}
          <div className="grid grid-cols-6 gap-1.5">
            {TIER_ORDER.map(tid => {
              const m = TIER_META[tid]
              return (
                <button
                  key={tid}
                  onClick={() => setSelectedTier(tid)}
                  className={`py-2 rounded-lg font-display font-bold text-lg border-2 transition-all
                    ${selectedTier === tid
                      ? 'scale-110 shadow-lg'
                      : 'border-transparent opacity-50 hover:opacity-80'
                    }`}
                  style={{
                    color: m.color,
                    backgroundColor: m.bg,
                    borderColor: selectedTier === tid ? m.color : 'transparent',
                  }}
                >
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Add button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={tab === 'search' ? handleAdd : handleManualAdd}
            disabled={tab === 'search' ? !selectedGame : !manualTitle.trim()}
          >
            Add to {TIER_META[selectedTier].label} Tier
          </Button>
        </div>
      </div>
    </div>
  )
}
