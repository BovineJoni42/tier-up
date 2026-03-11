import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { ArrowLeft, Share2, Star, Trophy, ImageDown, Link2, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { toPng } from 'html-to-image'
import { useTierStore } from '../store/useTierStore'
import { TierRow } from '../components/TierRow'
import { GameCard } from '../components/GameCard'
import { GameSearchModal } from '../components/GameSearchModal'
import { Button } from '../components/Button'

function parseId(compositeId: string) {
  const idx = compositeId.indexOf('::')
  if (idx === -1) return { tierId: compositeId, gameId: '' }
  return { tierId: compositeId.slice(0, idx), gameId: compositeId.slice(idx + 2) }
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-brand-surface border border-brand-border text-brand-text text-sm px-4 py-2.5 rounded-xl shadow-2xl animate-fade-in">
      <Check size={15} className="text-green-400 flex-shrink-0" />
      {message}
    </div>
  )
}

export function TierListBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getList, addGameToTier, removeGame, moveGame, reorderGame, toggleTopFive } = useTierStore()

  const list = getList(id!)
  const [addingToTier, setAddingToTier] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showShare, setShowShare] = useState(false)
  const [showTopFive, setShowTopFive] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Close share menu & modals on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowShare(false)
        setAddingToTier(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const showToast = useCallback((msg: string) => setToast(msg), [])

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over || !list) return

    const activeComposite = String(active.id)
    const overComposite = String(over.id)
    const { tierId: activeTier, gameId: activeGame } = parseId(activeComposite)

    if (overComposite.startsWith('tier-')) {
      const targetTierId = overComposite.replace('tier-', '')
      if (activeTier !== targetTierId) {
        moveGame(list.id, activeTier, targetTierId, activeGame, 0)
      }
      return
    }

    const { tierId: overTier, gameId: overGame } = parseId(overComposite)
    if (activeTier === overTier) {
      const tier = list.tiers.find(t => t.id === activeTier)
      if (!tier) return
      const oldIndex = tier.games.findIndex(g => g.id === activeGame)
      const newIndex = tier.games.findIndex(g => g.id === overGame)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderGame(list.id, activeTier, oldIndex, newIndex)
      }
    } else {
      const overTierObj = list.tiers.find(t => t.id === overTier)
      const toIndex = overTierObj ? overTierObj.games.findIndex(g => g.id === overGame) : 0
      moveGame(list.id, activeTier, overTier, activeGame, Math.max(0, toIndex))
    }
  }

  const activeGameData = activeId
    ? (() => {
        const { tierId, gameId } = parseId(activeId)
        return list?.tiers.find(t => t.id === tierId)?.games.find(g => g.id === gameId)
      })()
    : null

  const topFiveIds = new Set(list?.topFive.map(g => g.id) ?? [])

  const handleExportImage = async () => {
    if (!exportRef.current) return
    setExporting(true)
    setShowShare(false)
    // Brief delay so the watermark renders
    await new Promise(r => setTimeout(r, 80))
    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: '#16161a',
        pixelRatio: 2,
      })
      const link = document.createElement('a')
      link.download = `${list?.name ?? 'tier-list'}.png`
      link.href = dataUrl
      link.click()
      showToast('Saved as image!')
    } catch (e) {
      console.error('Export failed', e)
      showToast('Export failed — try again')
    } finally {
      setExporting(false)
    }
  }

  const handleCopyLink = () => {
    const url = `tierup://list/${id}`
    navigator.clipboard.writeText(url).then(() => showToast('Link copied!')).catch(() => {})
    setShowShare(false)
  }

  if (!list) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-brand-sub mb-4">List not found</p>
          <Button onClick={() => navigate('/')}>← Go Home</Button>
        </div>
      </div>
    )
  }

  const totalGames = list.tiers.reduce((s, t) => s + t.games.length, 0)

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col">
      {/* Header */}
      <header className="border-b border-brand-border bg-brand-surface/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-brand-sub hover:text-brand-text transition-colors p-1.5 rounded-lg hover:bg-brand-card"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-brand-accent flex items-center justify-center flex-shrink-0 shadow-glow">
              <Trophy size={14} className="text-white" />
            </div>
            <h1 className="font-bold text-base truncate">{list.name}</h1>
            <span className="text-brand-sub text-xs hidden sm:block flex-shrink-0">
              {totalGames} game{totalGames !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Share dropdown */}
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowShare(v => !v)}>
              <Share2 size={13} /> Share
            </Button>
            {showShare && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowShare(false)} />
                <div className="absolute right-0 top-10 w-52 bg-brand-surface border border-brand-border rounded-xl shadow-2xl z-20 py-1.5 overflow-hidden">
                  <button
                    onClick={handleExportImage}
                    disabled={exporting}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-brand-card text-brand-text transition-colors disabled:opacity-50"
                  >
                    <ImageDown size={14} className="text-brand-sub" />
                    {exporting ? 'Saving…' : 'Save as Image'}
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-brand-card text-brand-text transition-colors"
                  >
                    <Link2 size={14} className="text-brand-sub" /> Copy Link
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-5 py-6 space-y-4">

        {/* Top 5 panel */}
        <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowTopFive(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Star size={15} className="text-yellow-400" fill="currentColor" />
              <span className="font-bold text-sm">Top 5</span>
              <span className="text-xs text-brand-sub bg-brand-muted/50 px-2 py-0.5 rounded-full">
                {list.topFive.length} / 5
              </span>
            </div>
            {showTopFive
              ? <ChevronUp size={15} className="text-brand-sub" />
              : <ChevronDown size={15} className="text-brand-sub" />
            }
          </button>

          {showTopFive && (
            <div className="border-t border-brand-border px-5 pb-5 pt-4">
              {list.topFive.length === 0 ? (
                <div className="flex items-center gap-2 text-brand-sub text-sm italic">
                  <Star size={13} className="text-brand-muted" />
                  Hover any game tile and click ★ to pin it here
                </div>
              ) : (
                <div className="flex gap-4 flex-wrap">
                  {list.topFive.map((game, i) => (
                    <div key={game.id} className="relative">
                      <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-yellow-400 text-black text-xs font-black flex items-center justify-center z-10 shadow-md">
                        {i + 1}
                      </div>
                      <GameCard
                        game={game}
                        isTopFive
                        onToggleTopFive={() => toggleTopFive(list.id, game)}
                      />
                      <p className="text-xs text-brand-sub mt-1 text-center max-w-[80px] truncate">{game.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tier list — captured for image export */}
        <div
          ref={exportRef}
          className="space-y-2.5 p-4 rounded-2xl bg-brand-surface"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {/* Export header — always visible in PNG */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-brand-accent flex items-center justify-center">
                <Trophy size={10} className="text-white" />
              </div>
              <span className="font-black text-sm tracking-tight text-brand-text">TierUp</span>
            </div>
            <span className="text-brand-sub text-xs font-medium truncate max-w-xs">{list.name}</span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {list.tiers.map(tier => (
              <TierRow
                key={tier.id}
                tier={tier}
                listId={list.id}
                topFiveIds={topFiveIds}
                onAddGame={tierId => setAddingToTier(tierId)}
                onRemoveGame={(tierId, gameId) => removeGame(list.id, tierId, gameId)}
                onToggleTopFive={game => toggleTopFive(list.id, game)}
              />
            ))}

            <DragOverlay dropAnimation={{ duration: 120, easing: 'ease-out' }}>
              {activeGameData && (
                <div className="rotate-2 scale-110 shadow-2xl ring-2 ring-brand-accent rounded-md">
                  <GameCard game={activeGameData} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>

        <p className="text-center text-brand-muted text-xs pb-4">
          Drag game covers between tiers · Hover a cover to remove or ★ Top 5 · Share → Save as Image to export
        </p>
      </div>

      {/* Game search modal */}
      {addingToTier && (
        <GameSearchModal
          tierLabel={list.tiers.find(t => t.id === addingToTier)?.label}
          onClose={() => setAddingToTier(null)}
          onSelect={game => addGameToTier(list.id, addingToTier, game)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
