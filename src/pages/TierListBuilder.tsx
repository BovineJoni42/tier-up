import { useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import { toPng } from 'html-to-image'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import { useTierStore, TIER_ORDER, type TierId, type Game } from '../store/useTierStore'
import TierRow from '../components/TierRow'
import GameSearchModal from '../components/GameSearchModal'
import { GameCardOverlay } from '../components/GameCard'
import Button from '../components/Button'

function parseDndId(id: string): { tierId: TierId; gameId: string } | null {
  const parts = id.split('::')
  if (parts.length < 2) return null
  return { tierId: parts[0] as TierId, gameId: parts[1] }
}

// Build a collision detector that knows the current tier of the dragged item.
// - If hovering over a DIFFERENT tier's droppable → return that tier
// - If hovering over a game card in the SAME tier → return that card (for reorder)
// - If hovering over a game card in a DIFFERENT tier → return that tier droppable
function makeCollision(currentTierRef: React.MutableRefObject<TierId | null>): CollisionDetection {
  return (args) => {
    const currentTier = currentTierRef.current

    // Check tier droppables first
    const tierHits = rectIntersection({
      ...args,
      droppableContainers: args.droppableContainers.filter(c =>
        String(c.id).startsWith('tier::')
      ),
    })

    if (tierHits.length > 0) {
      const hitTierId = String(tierHits[0].id).replace('tier::', '')

      // If we hit our OWN tier droppable, ignore it and check game cards instead
      // so we can detect which card we're hovering for reordering
      if (hitTierId === currentTier) {
        const cardHits = rectIntersection({
          ...args,
          droppableContainers: args.droppableContainers.filter(c => {
            const parsed = parseDndId(String(c.id))
            return parsed !== null && parsed.tierId === currentTier
          }),
        })
        if (cardHits.length > 0) return cardHits
        return [] // hovering empty space in own tier — do nothing
      }

      // Hit a different tier — return it
      return tierHits
    }

    // No tier hit — fall back to any card
    return rectIntersection(args)
  }
}

export default function TierListBuilder() {
  const { id: listId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getList, addGame, removeGame, moveGame, reorderGame, addToTop5, removeFromTop5 } = useTierStore()

  const list = getList(listId ?? '')

  const [searchOpen, setSearchOpen] = useState(false)
  const [defaultSearchTier, setDefaultSearchTier] = useState<TierId>('b')
  const [activeGame, setActiveGame] = useState<Game | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState('')

  const dragGameId = useRef<string | null>(null)
  const dragCurrentTier = useRef<TierId | null>(null)

  // Collision detector reads from the ref so it always knows current tier
  const collisionDetection = useRef(makeCollision(dragCurrentTier)).current

  const exportRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = (e: DragStartEvent) => {
    const parsed = parseDndId(String(e.active.id))
    if (parsed && list) {
      const game = list.tiers[parsed.tierId].find(g => g.id === parsed.gameId)
      setActiveGame(game ?? null)
      dragGameId.current = parsed.gameId
      dragCurrentTier.current = parsed.tierId
    }
  }

  const handleDragOver = (e: DragOverEvent) => {
    if (!e.over || !listId || !dragGameId.current || !dragCurrentTier.current) return

    const overId = String(e.over.id)
    const gameId = dragGameId.current
    const fromTier = dragCurrentTier.current

    // ── Dropped onto a different tier droppable ──
    if (overId.startsWith('tier::')) {
      const toTier = overId.replace('tier::', '') as TierId
      if (toTier === fromTier) return
      moveGame(listId, gameId, fromTier, toTier)
      dragCurrentTier.current = toTier
      return
    }

    // ── Dropped onto a game card ──
    const over = parseDndId(overId)
    if (!over || over.gameId === gameId) return

    if (over.tierId !== fromTier) {
      // Different tier — move there
      moveGame(listId, gameId, fromTier, over.tierId)
      dragCurrentTier.current = over.tierId
    } else {
      // Same tier — reorder
      const freshList = getList(listId)
      if (!freshList) return
      const games = freshList.tiers[fromTier]
      const fromIndex = games.findIndex(g => g.id === gameId)
      const toIndex = games.findIndex(g => g.id === over.gameId)
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        reorderGame(listId, fromTier, fromIndex, toIndex)
      }
    }
  }

  const handleDragEnd = () => {
    setActiveGame(null)
    dragGameId.current = null
    dragCurrentTier.current = null
  }

  const handleExport = useCallback(async () => {
    if (!exportRef.current || !list) return
    setExporting(true)
    setExportMsg('')

    // Snapshot the node so we can restore images after export
    const node = exportRef.current
    const images = Array.from(node.querySelectorAll('img'))
    const originalSrcs = images.map(img => img.src)

    try {
      // Pre-convert all cover images to base64.
      // html-to-image re-fetches images internally, but RAWG blocks
      // cross-origin requests from localhost. Converting first avoids that.
      // We also wait for each image to fully reload after setting the new src.
      await Promise.all(images.map(async (img) => {
        if (!img.src || img.src.startsWith('data:')) return
        try {
          const res = await fetch(img.src)
          const blob = await res.blob()
          await new Promise<void>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              const dataUrl = reader.result as string
              // Wait for the image to finish loading the new data URL
              img.onload = () => resolve()
              img.onerror = () => resolve()
              img.src = dataUrl
            }
            reader.readAsDataURL(blob)
          })
        } catch {
          img.src = ''
        }
      }))
      
      // Extra safety: give browser a frame to settle after all src changes
      await new Promise(resolve => setTimeout(resolve, 100))

      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: '#0e0e1a',
      })

      // Restore original srcs
      images.forEach((img, i) => { img.src = originalSrcs[i] })

      const base64 = dataUrl.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      try {
        const filePath = await save({
          defaultPath: `${list.name.replace(/[^a-z0-9]/gi, '_')}_tierlist.png`,
          filters: [{ name: 'PNG Image', extensions: ['png'] }],
        })
        if (filePath) {
          await writeFile(filePath, bytes)
          setExportMsg(`✅ Saved to ${filePath}`)
        }
      } catch {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${list.name.replace(/[^a-z0-9]/gi, '_')}_tierlist.png`
        a.click()
        setExportMsg('✅ Image downloaded')
      }
    } catch (err) {
      images.forEach((img, i) => { img.src = originalSrcs[i] })
      setExportMsg('❌ Export failed')
      console.error('Export error:', err)
    } finally {
      setExporting(false)
      setTimeout(() => setExportMsg(''), 4000)
    }
  }, [list])

  if (!list) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center text-slate-400">
        <div className="text-center">
          <p className="font-mono mb-4">List not found</p>
          <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#08080f] text-white flex flex-col">
      <div className="fixed inset-0 pointer-events-none z-50"
        style={{ background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.025) 2px,rgba(0,0,0,0.025) 4px)' }}
      />

      <nav className="sticky top-0 z-40 flex items-center justify-between px-4 h-[60px] bg-[#08080f]/90 border-b border-slate-800 backdrop-blur-xl gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="icon" size="sm" onClick={() => navigate('/')}>←</Button>
          <span className="font-display text-lg font-bold tracking-wide truncate">{list.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => { setDefaultSearchTier('b'); setSearchOpen(true) }}>
            + Add Game
          </Button>
          <Button variant="primary" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : '📤 Share'}
          </Button>
        </div>
      </nav>

      {exportMsg && (
        <div className="bg-slate-900 border-b border-slate-700 px-4 py-2 text-sm text-center font-mono text-slate-300">
          {exportMsg}
        </div>
      )}

      <main className="flex-1 max-w-3xl mx-auto w-full px-3 py-4 flex flex-col gap-3">

        {/* Top 5 */}
        <div className="bg-[#1a1a2e] border border-yellow-500/30 rounded-2xl p-4 shadow-[0_0_20px_rgba(255,215,0,0.06)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-yellow-400 font-display font-bold text-base tracking-widest uppercase">⭐ Top 5</span>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            {Array.from({ length: 5 }).map((_, i) => {
              const gameId = list.top5[i]
              const game = gameId
                ? TIER_ORDER.flatMap(tid => list.tiers[tid]).find(g => g.id === gameId)
                : null
              return (
                <div key={i}>
                  {game ? (
                    <div
                      className="w-[62px] h-[82px] rounded-lg overflow-hidden border-2 border-yellow-500/50 relative cursor-pointer hover:border-yellow-400 transition-colors group"
                      onClick={() => removeFromTop5(listId!, gameId!)}
                      title={`${game.title} — click to remove`}
                    >
                      {game.cover ? (
                        <img src={game.cover} alt={game.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center p-1">
                          <span className="text-[8px] text-slate-400 text-center leading-tight font-mono">{game.title}</span>
                        </div>
                      )}
                      <span className="absolute top-1 left-1.5 font-display text-yellow-400 font-bold text-xs drop-shadow z-10">#{i + 1}</span>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-lg">✕</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-[62px] h-[82px] rounded-lg border-2 border-dashed border-yellow-500/20 flex items-center justify-center">
                      <span className="font-mono text-[10px] text-yellow-500/30">#{i + 1}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Tier rows */}
        <div ref={exportRef} className="flex flex-col gap-1.5 bg-[#08080f] rounded-xl p-2">
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {TIER_ORDER.map(tierId => (
              <TierRow
                key={tierId}
                tierId={tierId}
                games={list.tiers[tierId]}
                listId={list.id}
                top5Ids={list.top5}
                onRemoveGame={(tid, gid) => removeGame(list.id, tid, gid)}
                onToggleTop5={(gid) => {
                  if (list.top5.includes(gid)) removeFromTop5(list.id, gid)
                  else addToTop5(list.id, gid)
                }}
                onAddGame={(tid) => {
                  setDefaultSearchTier(tid)
                  setSearchOpen(true)
                }}
              />
            ))}
            <DragOverlay dropAnimation={null}>
              {activeGame ? <GameCardOverlay game={activeGame} /> : null}
            </DragOverlay>
          </DndContext>
        </div>

        <div className="text-center">
          <span className="font-display text-xs font-bold tracking-[4px] text-violet-500/40 uppercase">
            Made with TIERUP
          </span>
        </div>

      </main>

      <div className="border-t border-slate-800 py-2.5 text-center text-xs text-slate-600 font-mono tracking-widest bg-[#08080f]">
        📢 ADVERTISEMENT — Your ad here
      </div>

      <GameSearchModal
        open={searchOpen}
        defaultTier={defaultSearchTier}
        onClose={() => setSearchOpen(false)}
        onAddGame={(game, tierId) => addGame(list.id, tierId, game)}
      />
    </div>
  )
}
