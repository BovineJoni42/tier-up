import { clsx } from 'clsx'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Star, X } from 'lucide-react'
import type { Game } from '../store/useTierStore'

interface GameCardProps {
  game: Game
  isTopFive?: boolean
  onRemove?: () => void
  onToggleTopFive?: () => void
  isDragging?: boolean
  size?: 'sm' | 'md'
}

export function GameCard({ game, isTopFive, onRemove, onToggleTopFive, isDragging, size = 'md' }: GameCardProps) {
  return (
    <div
      className={clsx(
        'relative group rounded-md overflow-hidden border border-brand-border bg-brand-card cursor-grab active:cursor-grabbing select-none flex-shrink-0',
        isDragging && 'opacity-40 ring-2 ring-brand-accent',
        size === 'md' ? 'w-20 h-28' : 'w-14 h-20'
      )}
      title={game.title}
    >
      {game.coverUrl ? (
        <img
          src={game.coverUrl}
          alt={game.title}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-brand-muted text-brand-sub text-xs text-center p-1 leading-tight">
          {game.title}
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
        {onToggleTopFive && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onToggleTopFive() }}
            className={clsx(
              'p-1 rounded-full transition-colors',
              isTopFive ? 'text-yellow-400 hover:text-yellow-300' : 'text-brand-sub hover:text-yellow-400'
            )}
            title={isTopFive ? 'Remove from Top 5' : 'Add to Top 5'}
          >
            <Star size={14} fill={isTopFive ? 'currentColor' : 'none'} />
          </button>
        )}
        {onRemove && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onRemove() }}
            className="p-1 rounded-full text-brand-sub hover:text-red-400 transition-colors"
            title="Remove"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Top 5 star badge */}
      {isTopFive && (
        <div className="absolute top-1 right-1 bg-yellow-400 rounded-full p-0.5 shadow-md">
          <Star size={8} fill="black" color="black" />
        </div>
      )}
    </div>
  )
}

// Sortable wrapper using @dnd-kit
export function SortableGameCard(props: GameCardProps & { id: string }) {
  const { id, ...rest } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <GameCard {...rest} isDragging={isDragging} />
    </div>
  )
}
