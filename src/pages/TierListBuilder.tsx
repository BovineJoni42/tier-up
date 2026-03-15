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
import { save } from '@tauri-apps/plugin-dialog'
import { open as openUrl } from '@tauri-apps/plugin-shell'
import { writeFile } from '@tauri-apps/plugin-fs'
import { useTierStore, TIER_ORDER, TIER_META, type TierId, type Game } from '../store/useTierStore'
import TierRow from '../components/TierRow'
import GameSearchModal from '../components/GameSearchModal'
import { GameCardOverlay } from '../components/GameCard'
import Button from '../components/Button'

// Tauri global API
declare const window: Window & {
  __TAURI__: { core: { invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T> } }
}

function parseDndId(id: string): { tierId: TierId; gameId: string } | null {
  const parts = id.split('::')
  if (parts.length < 2) return null
  return { tierId: parts[0] as TierId, gameId: parts[1] }
}

function makeCollision(currentTierRef: React.MutableRefObject<TierId | null>): CollisionDetection {
  return (args) => {
    const currentTier = currentTierRef.current
    const tierHits = rectIntersection({
      ...args,
      droppableContainers: args.droppableContainers.filter(c =>
        String(c.id).startsWith('tier::')
      ),
    })
    if (tierHits.length > 0) {
      const hitTierId = String(tierHits[0].id).replace('tier::', '')
      if (hitTierId === currentTier) {
        const cardHits = rectIntersection({
          ...args,
          droppableContainers: args.droppableContainers.filter(c => {
            const parsed = parseDndId(String(c.id))
            return parsed !== null && parsed.tierId === currentTier
          }),
        })
        if (cardHits.length > 0) return cardHits
        return []
      }
      return tierHits
    }
    return rectIntersection(args)
  }
}

// ── Canvas export ─────────────────────────────────────────────────────────────
// Draws the tier list directly onto a canvas, loading images via Rust.
// This completely bypasses html-to-image and CORS.

async function loadImageFromBase64(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

async function fetchImageViaRust(url: string): Promise<HTMLImageElement | null> {
  try {
    const dataUrl = await window.__TAURI__.core.invoke<string>('fetch_image_as_base64', { url })
    return await loadImageFromBase64(dataUrl)
  } catch {
    return null
  }
}

async function exportToCanvas(list: { name: string; tiers: Record<TierId, Game[]>; top5: string[] }): Promise<string> {
  const SCALE = 2
  const W = 900
  const PADDING = 20
  const TIER_H = 100
  const GAME_W = 66
  const GAME_H = 88
  const LABEL_W = 64
  const GAP = 8
  const CORNER = 12
  const TOP5_H = 160

  // Pre-fetch all unique cover images
  const allGames = TIER_ORDER.flatMap(tid => list.tiers[tid])
  const top5Games = list.top5
    .map(id => allGames.find(g => g.id === id))
    .filter(Boolean) as Game[]
  const uniqueUrls = Array.from(new Set(allGames.map(g => g.cover).filter(Boolean)))
  const imageCache: Record<string, HTMLImageElement | null> = {}
  await Promise.all(uniqueUrls.map(async (url) => {
    imageCache[url] = await fetchImageViaRust(url)
  }))

  // Calculate canvas height
  const tiersWithGames = TIER_ORDER.length
  const TOP5_SECTION_H = TOP5_H + PADDING
  const TOTAL_H = PADDING + TOP5_SECTION_H + tiersWithGames * (TIER_H + GAP) + PADDING + 40

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = TOTAL_H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // Background
  ctx.fillStyle = '#08080f'
  ctx.fillRect(0, 0, W, TOTAL_H)

  // Helper: rounded rect
  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  // Helper: draw game cover with title overlay at the bottom
  function drawGame(game: Game, x: number, y: number, w: number, h: number) {
    const img = imageCache[game.cover]
    roundRect(x, y, w, h, 6)
    ctx.save()
    ctx.clip()

    if (img) {
      ctx.drawImage(img, x, y, w, h)
    } else {
      ctx.fillStyle = '#1a1a2e'
      ctx.fill()
    }

    // Dark gradient overlay at bottom for title readability
    const grad = ctx.createLinearGradient(x, y + h * 0.55, x, y + h)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0.85)')
    ctx.fillStyle = grad
    ctx.fillRect(x, y + h * 0.55, w, h * 0.45)

    // Title text — word wrap to fit tile width
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.floor(w * 0.135)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    const fontSize = Math.floor(w * 0.135)
    const lineH = fontSize + 1
    const maxW = w - 6
    const words = game.title.split(' ')
    const lines: string[] = []
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxW) { if (line) lines.push(line); line = word }
      else line = test
    }
    if (line) lines.push(line)
    // Draw up to 2 lines from bottom
    const maxLines = 2
    const drawLines = lines.slice(-maxLines)
    drawLines.forEach((l, i) => {
      const lineY = y + h - 4 - (drawLines.length - 1 - i) * lineH
      ctx.fillText(l, x + w / 2, lineY, maxW)
    })

    ctx.restore()
  }

  let y = PADDING

  // ── Top 5 Section ──
  roundRect(PADDING, y, W - PADDING * 2, TOP5_H, CORNER)
  ctx.fillStyle = '#1a1a2e'
  ctx.fill()
  ctx.strokeStyle = '#ffd700'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = '#ffd700'
  ctx.font = 'bold 16px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('⭐  TOP 5', PADDING + 16, y + 28)

  const slotW = GAME_W
  const slotH = GAME_H
  const slotY = y + 48
  for (let i = 0; i < 5; i++) {
    const slotX = PADDING + 16 + i * (slotW + 12)
    const game = top5Games[i]
    if (game) {
      drawGame(game, slotX, slotY, slotW, slotH)
      // Rank badge
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(slotX, slotY, 22, 18)
      ctx.fillStyle = '#ffd700'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`#${i + 1}`, slotX + 3, slotY + 12)
    } else {
      roundRect(slotX, slotY, slotW, slotH, 6)
      ctx.strokeStyle = 'rgba(255,215,0,0.2)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255,215,0,0.2)'
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`#${i + 1}`, slotX + slotW / 2, slotY + slotH / 2)
    }
  }

  y += TOP5_H + GAP + PADDING / 2

  // ── Tier Rows ──
  for (const tierId of TIER_ORDER) {
    const meta = TIER_META[tierId]
    const games = list.tiers[tierId]
    const rowH = Math.max(TIER_H, games.length > 0 ? GAME_H + 16 : TIER_H)

    // Row background
    roundRect(PADDING, y, W - PADDING * 2, rowH, CORNER)
    ctx.strokeStyle = '#2a2a4a'
    ctx.lineWidth = 1
    ctx.stroke()

    // Tier label bg
    roundRect(PADDING, y, LABEL_W, rowH, CORNER)
    ctx.fillStyle = meta.bg
    ctx.fill()

    // Tier label text
    ctx.fillStyle = meta.color
    ctx.font = `bold 28px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(meta.label, PADDING + LABEL_W / 2, y + rowH / 2)

    // Games area bg
    roundRect(PADDING + LABEL_W, y, W - PADDING * 2 - LABEL_W, rowH, CORNER)
    ctx.fillStyle = '#0e0e1a'
    ctx.fill()

    // Draw games
    const gamesX = PADDING + LABEL_W + 10
    const gamesY = y + (rowH - GAME_H) / 2
    games.forEach((game, i) => {
      drawGame(game, gamesX + i * (GAME_W + GAP), gamesY, GAME_W, GAME_H)
    })

    if (games.length === 0) {
      ctx.fillStyle = '#3a3a5a'
      ctx.font = '12px monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('empty', gamesX, y + rowH / 2)
    }

    y += rowH + GAP
  }

  // ── Watermark ──
  ctx.fillStyle = 'rgba(124,58,237,0.35)'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = '4px'
  const typeEmoji = list.type === 'movies' ? '🎬' : list.type === 'tv' ? '📺' : '🎮'
  ctx.fillText(`${typeEmoji}  MADE WITH TIERCRAFT  ${typeEmoji}`, W / 2, y + 16)

  return canvas.toDataURL('image/png')
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const [shareOpen, setShareOpen] = useState(false)
  const [savedPath, setSavedPath] = useState<string | null>(null)

  const dragGameId = useRef<string | null>(null)
  const dragCurrentTier = useRef<TierId | null>(null)
  const collisionDetection = useRef(makeCollision(dragCurrentTier)).current

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

    if (overId.startsWith('tier::')) {
      const toTier = overId.replace('tier::', '') as TierId
      if (toTier === fromTier) return
      moveGame(listId, gameId, fromTier, toTier)
      dragCurrentTier.current = toTier
      return
    }

    const over = parseDndId(overId)
    if (!over || over.gameId === gameId) return

    if (over.tierId !== fromTier) {
      moveGame(listId, gameId, fromTier, over.tierId)
      dragCurrentTier.current = over.tierId
    } else {
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
    if (!list) return
    setExporting(true)
    setExportMsg('')
    try {
      const dataUrl = await exportToCanvas(list)
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
          setSavedPath(filePath)
          setShareOpen(true)
        }
      } catch {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${list.name.replace(/[^a-z0-9]/gi, '_')}_tierlist.png`
        a.click()
        setSavedPath('downloaded')
        setShareOpen(true)
      }
    } catch (err) {
      setExportMsg('❌ Export failed')
      console.error('Export error:', err)
    } finally {
      setExporting(false)
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
        <div className="flex flex-col gap-1.5 bg-[#08080f] rounded-xl p-2">
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
            Made with TIERCRAFT
          </span>
        </div>

      </main>

      <div className="border-t border-slate-800 py-2.5 text-center text-xs text-slate-600 font-mono tracking-widest bg-[#08080f]">
        📢 ADVERTISEMENT — Your ad here
      </div>

      <GameSearchModal
        open={searchOpen}
        defaultTier={defaultSearchTier}
        listType={list.type ?? 'games'}
        onClose={() => setSearchOpen(false)}
        onAddGame={(game, tierId) => addGame(list.id, tierId, game)}
      />

      {/* Share Sheet Modal */}
      {shareOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && setShareOpen(false)}
        >
          <div className="bg-[#14142a] border border-slate-700 rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div>
                <h2 className="font-display text-xl font-bold tracking-wide">Share Your List</h2>
                {savedPath && savedPath !== 'downloaded' && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-[280px]">
                    ✅ Saved: {savedPath.split('/').pop()}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShareOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center text-sm transition-colors"
              >✕</button>
            </div>

            {/* Share options */}
            <div className="p-4 flex flex-col gap-3">

              {/* Twitter/X */}
              <button
                onClick={() => {
                  const text = encodeURIComponent(`Check out my ${list.name} tier list! 🎮 Made with TierCraft #TierCraft #Gaming`)
                  openUrl(`https://twitter.com/intent/tweet?text=${text}`)
                }}
                className="flex items-center gap-4 p-4 bg-[#0e0e1a] border border-slate-800 rounded-xl hover:border-[#1d9bf0] hover:bg-[#0e0e1a]/80 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center flex-shrink-0 text-xl">𝕏</div>
                <div className="flex-1 text-left">
                  <div className="font-display font-bold text-base tracking-wide">Share on X</div>
                  <div className="text-xs text-slate-400 mt-0.5">Opens X with pre-filled text — attach your saved image</div>
                </div>
                <span className="text-slate-600 group-hover:text-slate-400">→</span>
              </button>

              {/* Reddit */}
              <button
                onClick={() => {
                  const title = encodeURIComponent(`My ${list.name} Tier List 🎮`)
                  openUrl(`https://www.reddit.com/submit?title=${title}&type=image`)
                }}
                className="flex items-center gap-4 p-4 bg-[#0e0e1a] border border-slate-800 rounded-xl hover:border-[#ff4500] hover:bg-[#0e0e1a]/80 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-[#ff4500] flex items-center justify-center flex-shrink-0 text-xl">🤖</div>
                <div className="flex-1 text-left">
                  <div className="font-display font-bold text-base tracking-wide">Share on Reddit</div>
                  <div className="text-xs text-slate-400 mt-0.5">Post to a gaming subreddit — attach your saved image</div>
                </div>
                <span className="text-slate-600 group-hover:text-slate-400">→</span>
              </button>

              {/* Copy text */}
              <button
                onClick={() => {
                  const tiers = TIER_ORDER
                    .filter(tid => list.tiers[tid].length > 0)
                    .map(tid => {
                      const games = list.tiers[tid].map(g => g.title).join(', ')
                      return `${TIER_META[tid].label}: ${games}`
                    })
                    .join('\n')
                  const text = list.name + '\n' + '\u2500'.repeat(30) + '\n' + tiers + '\n\nMade with TierCraft 🎮'
                  navigator.clipboard.writeText(text)
                  setExportMsg('📋 Tier list copied to clipboard!')
                  setShareOpen(false)
                  setTimeout(() => setExportMsg(''), 3000)
                }}
                className="flex items-center gap-4 p-4 bg-[#0e0e1a] border border-slate-800 rounded-xl hover:border-violet-600 hover:bg-[#0e0e1a]/80 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-violet-900/50 flex items-center justify-center flex-shrink-0 text-xl">📋</div>
                <div className="flex-1 text-left">
                  <div className="font-display font-bold text-base tracking-wide">Copy as Text</div>
                  <div className="text-xs text-slate-400 mt-0.5">Copy tier list as formatted text for Discord, messages, etc.</div>
                </div>
                <span className="text-slate-600 group-hover:text-slate-400">→</span>
              </button>
              {/* Save again */}
              <button
                onClick={() => { setShareOpen(false); handleExport() }}
                className="flex items-center gap-4 p-4 bg-[#0e0e1a] border border-slate-800 rounded-xl hover:border-slate-600 hover:bg-[#0e0e1a]/80 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0 text-xl">📸</div>
                <div className="flex-1 text-left">
                  <div className="font-display font-bold text-base tracking-wide">Save Image Again</div>
                  <div className="text-xs text-slate-400 mt-0.5">Export another copy of the PNG</div>
                </div>
                <span className="text-slate-600 group-hover:text-slate-400">→</span>
              </button>
            </div>
            {/* Tip */}
            <div className="px-5 pb-5 text-center">
              <p className="text-xs text-slate-600 font-mono">
                💡 Tip: Save the image first, then attach it when posting to social media
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
