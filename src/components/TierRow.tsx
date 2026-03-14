import { useDroppable } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import GameCard from './GameCard'
import type { Game, TierId } from '../store/useTierStore'
import { TIER_META } from '../store/useTierStore'

interface TierRowProps {
  tierId: TierId
  games: Game[]
  listId: string
  top5Ids: string[]
  onRemoveGame: (tierId: TierId, gameId: string) => void
  onToggleTop5: (gameId: string) => void
  onAddGame: (tierId: TierId) => void
}

export default function TierRow({
  tierId,
  games,
  listId,
  top5Ids,
  onRemoveGame,
  onToggleTop5,
  onAddGame,
}: TierRowProps) {
  const meta = TIER_META[tierId]

  // The entire row is the droppable target — much larger hit area
  const { setNodeRef, isOver } = useDroppable({
    id: `tier::${tierId}`,
    data: { tierId },
  })

  const sortableIds = games.map(g => `${tierId}::${g.id}`)

  return (
    <div
      ref={setNodeRef}
      className={`flex items-stretch rounded-xl border transition-all duration-150 min-h-[90px]
        ${isOver
          ? 'border-violet-500 shadow-[0_0_16px_rgba(124,58,237,0.35)] bg-violet-950/20'
          : 'border-slate-800'
        }`}
    >
      {/* Tier label */}
      <div
        className="w-14 flex-shrink-0 flex items-center justify-center rounded-l-xl font-display text-2xl font-bold select-none"
        style={{ backgroundColor: meta.bg, color: meta.color }}
      >
        {meta.label}
      </div>

      {/* Games area */}
      <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
        <div className="flex-1 flex flex-wrap gap-2 p-2.5 bg-[#0e0e1a] rounded-r-xl min-h-[88px] items-start content-start">
          {games.length === 0 ? (
            <span className="text-xs text-slate-600 font-mono self-center pl-1">
              {isOver ? '📥 Drop here' : 'Drop games here'}
            </span>
          ) : (
            games.map(game => (
              <GameCard
                key={game.id}
                game={game}
                listId={listId}
                tierId={tierId}
                isInTop5={top5Ids.includes(game.id)}
                top5Full={top5Ids.length >= 5}
                onRemove={() => onRemoveGame(tierId, game.id)}
                onToggleTop5={() => onToggleTop5(game.id)}
              />
            ))
          )}

          {/* Add game button */}
          <button
            className="w-[62px] h-[82px] rounded-lg border-2 border-dashed border-slate-700
              flex items-center justify-center text-slate-600 text-xl flex-shrink-0
              hover:border-violet-600 hover:text-violet-400 transition-colors"
            onClick={() => onAddGame(tierId)}
            title={`Add game to ${meta.label}`}
          >
            ＋
          </button>
        </div>
      </SortableContext>
    </div>
  )
}
