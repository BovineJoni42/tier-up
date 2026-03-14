import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Game } from '../store/useTierStore'

interface GameCardProps {
  game: Game
  listId: string
  tierId: string
  onRemove: () => void
  onToggleTop5: () => void
  isInTop5: boolean
  top5Full: boolean
}

export default function GameCard({
  game,
  listId,
  tierId,
  onRemove,
  onToggleTop5,
  isInTop5,
  top5Full,
}: GameCardProps) {
  const [imgError, setImgError] = useState(false)
  const [hovered, setHovered] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${tierId}::${game.id}`,
    data: { game, tierId, listId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative w-[62px] h-[82px] rounded-lg overflow-hidden border border-white/[0.07] cursor-grab active:cursor-grabbing flex-shrink-0 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={game.title}
    >
      {/* Cover image */}
      {game.cover && !imgError ? (
        <img
          src={game.cover}
          alt={game.title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-slate-800 flex items-center justify-center p-1">
          <span className="text-[8px] text-slate-400 text-center leading-tight font-mono">
            {game.title}
          </span>
        </div>
      )}

      {/* Hover overlay */}
      {hovered && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
          {/* Top 5 button */}
          <button
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors
              ${isInTop5
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : top5Full
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-700 text-yellow-400 hover:bg-yellow-400 hover:text-black'
              }`}
            onClick={(e) => {
              e.stopPropagation()
              if (!top5Full || isInTop5) onToggleTop5()
            }}
            title={isInTop5 ? 'Remove from Top 5' : top5Full ? 'Top 5 is full' : 'Add to Top 5'}
          >
            ★
          </button>
          {/* Remove button */}
          <button
            className="w-6 h-6 rounded-full bg-slate-700 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center text-xs transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            title="Remove"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ── Overlay card shown while dragging ──────────────────────────────────────
export function GameCardOverlay({ game }: { game: Game }) {
  const [imgError, setImgError] = useState(false)
  return (
    <div className="w-[62px] h-[82px] rounded-lg overflow-hidden border border-violet-400/50 shadow-[0_8px_30px_rgba(124,58,237,0.5)] cursor-grabbing rotate-3 flex-shrink-0">
      {game.cover && !imgError ? (
        <img
          src={game.cover}
          alt={game.title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-slate-700 flex items-center justify-center p-1">
          <span className="text-[8px] text-slate-300 text-center leading-tight font-mono">{game.title}</span>
        </div>
      )}
    </div>
  )
}
