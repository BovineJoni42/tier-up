import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { SortableGameCard } from './GameCard'
import type { Tier, Game } from '../store/useTierStore'

interface TierRowProps {
  tier: Tier
  listId: string
  topFiveIds: Set<string>
  onAddGame: (tierId: string) => void
  onRemoveGame: (tierId: string, gameId: string) => void
  onToggleTopFive: (game: Game) => void
}

export function TierRow({ tier, topFiveIds, onAddGame, onRemoveGame, onToggleTopFive }: TierRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `tier-${tier.id}` })
  const [hovered, setHovered] = useState(false)

  const glowClass = {
    S: 'tier-glow-s',
    A: 'tier-glow-a',
    B: 'tier-glow-b',
  }[tier.label] ?? ''

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={clsx(
        'flex items-stretch min-h-[7.5rem] rounded-xl border transition-all duration-150',
        isOver
          ? 'border-brand-accent bg-brand-accent/10 shadow-glow'
          : 'border-brand-border bg-brand-card hover:border-brand-muted'
      )}
    >
      {/* Tier label slab */}
      <div
        className={clsx(
          'w-14 flex-shrink-0 flex items-center justify-center rounded-l-xl font-black text-2xl select-none transition-shadow duration-200',
          (hovered || isOver) ? glowClass : ''
        )}
        style={{
          backgroundColor: tier.color + '20',
          color: tier.color,
          borderRight: `2px solid ${tier.color}35`,
        }}
      >
        {tier.label}
      </div>

      {/* Games area */}
      <SortableContext
        items={tier.games.map(g => `${tier.id}::${g.id}`)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex-1 flex items-center gap-2 p-3 flex-wrap min-h-[7.5rem]">
          {tier.games.map(game => (
            <SortableGameCard
              key={game.id}
              id={`${tier.id}::${game.id}`}
              game={game}
              isTopFive={topFiveIds.has(game.id)}
              onRemove={() => onRemoveGame(tier.id, game.id)}
              onToggleTopFive={() => onToggleTopFive(game)}
            />
          ))}

          {/* Drop hint when empty */}
          {tier.games.length === 0 && !isOver && (
            <span className="text-xs text-brand-muted italic pointer-events-none select-none mr-2">
              Drop games here…
            </span>
          )}

          {/* Add game button */}
          <button
            onClick={() => onAddGame(tier.id)}
            className="w-20 h-28 rounded-md border-2 border-dashed border-brand-muted hover:border-brand-accent text-brand-sub hover:text-brand-accent transition-all flex items-center justify-center flex-shrink-0 group"
          >
            <Plus size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </SortableContext>
    </div>
  )
}
