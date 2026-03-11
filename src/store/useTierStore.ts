import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Game {
  id: string
  title: string
  coverUrl: string
  platform: string
  releaseYear: string
  isManual?: boolean
  rawgId?: number
}

export interface Tier {
  id: string
  label: string
  color: string
  games: Game[]
}

export interface TierList {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  tiers: Tier[]
  topFive: Game[]
}

const DEFAULT_TIERS: Omit<Tier, 'games'>[] = [
  { id: 's', label: 'S', color: '#f59e0b' },
  { id: 'a', label: 'A', color: '#22c55e' },
  { id: 'b', label: 'B', color: '#3b82f6' },
  { id: 'c', label: 'C', color: '#a855f7' },
  { id: 'd', label: 'D', color: '#ef4444' },
  { id: 'f', label: 'F', color: '#6b7280' },
]

function makeTiers(): Tier[] {
  return DEFAULT_TIERS.map(t => ({ ...t, games: [] }))
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

interface TierStore {
  lists: TierList[]
  createList: (name: string) => TierList
  renameList: (id: string, name: string) => void
  deleteList: (id: string) => void
  duplicateList: (id: string) => TierList
  addGameToTier: (listId: string, tierId: string, game: Game) => void
  removeGame: (listId: string, tierId: string, gameId: string) => void
  moveGame: (listId: string, fromTierId: string, toTierId: string, gameId: string, toIndex: number) => void
  reorderGame: (listId: string, tierId: string, oldIndex: number, newIndex: number) => void
  toggleTopFive: (listId: string, game: Game) => void
  getList: (id: string) => TierList | undefined
}

export const useTierStore = create<TierStore>()(
  persist(
    (set, get) => ({
      lists: [],

      createList: (name) => {
        const list: TierList = {
          id: uid(),
          name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tiers: makeTiers(),
          topFive: [],
        }
        set(s => ({ lists: [list, ...s.lists] }))
        return list
      },

      renameList: (id, name) =>
        set(s => ({
          lists: s.lists.map(l =>
            l.id === id ? { ...l, name, updatedAt: new Date().toISOString() } : l
          ),
        })),

      deleteList: (id) =>
        set(s => ({ lists: s.lists.filter(l => l.id !== id) })),

      duplicateList: (id) => {
        const src = get().lists.find(l => l.id === id)
        if (!src) throw new Error('List not found')
        const copy: TierList = {
          ...JSON.parse(JSON.stringify(src)),
          id: uid(),
          name: `${src.name} (copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set(s => ({ lists: [copy, ...s.lists] }))
        return copy
      },

      addGameToTier: (listId, tierId, game) =>
        set(s => ({
          lists: s.lists.map(l => {
            if (l.id !== listId) return l
            return {
              ...l,
              updatedAt: new Date().toISOString(),
              tiers: l.tiers.map(t =>
                t.id === tierId
                  ? { ...t, games: [...t.games, game] }
                  : t
              ),
            }
          }),
        })),

      removeGame: (listId, tierId, gameId) =>
        set(s => ({
          lists: s.lists.map(l => {
            if (l.id !== listId) return l
            return {
              ...l,
              updatedAt: new Date().toISOString(),
              tiers: l.tiers.map(t =>
                t.id === tierId
                  ? { ...t, games: t.games.filter(g => g.id !== gameId) }
                  : t
              ),
            }
          }),
        })),

      moveGame: (listId, fromTierId, toTierId, gameId, toIndex) =>
        set(s => ({
          lists: s.lists.map(l => {
            if (l.id !== listId) return l
            let game: Game | undefined
            const tiers = l.tiers.map(t => {
              if (t.id === fromTierId) {
                game = t.games.find(g => g.id === gameId)
                return { ...t, games: t.games.filter(g => g.id !== gameId) }
              }
              return t
            })
            if (!game) return l
            const movedGame = game
            return {
              ...l,
              updatedAt: new Date().toISOString(),
              tiers: tiers.map(t => {
                if (t.id !== toTierId) return t
                const next = [...t.games]
                next.splice(toIndex, 0, movedGame)
                return { ...t, games: next }
              }),
            }
          }),
        })),

      reorderGame: (listId, tierId, oldIndex, newIndex) =>
        set(s => ({
          lists: s.lists.map(l => {
            if (l.id !== listId) return l
            return {
              ...l,
              updatedAt: new Date().toISOString(),
              tiers: l.tiers.map(t => {
                if (t.id !== tierId) return t
                const games = [...t.games]
                const [moved] = games.splice(oldIndex, 1)
                games.splice(newIndex, 0, moved)
                return { ...t, games }
              }),
            }
          }),
        })),

      toggleTopFive: (listId, game) =>
        set(s => ({
          lists: s.lists.map(l => {
            if (l.id !== listId) return l
            const exists = l.topFive.some(g => g.id === game.id)
            if (exists) {
              return { ...l, topFive: l.topFive.filter(g => g.id !== game.id) }
            }
            if (l.topFive.length >= 5) return l
            return { ...l, topFive: [...l.topFive, game] }
          }),
        })),

      getList: (id) => get().lists.find(l => l.id === id),
    }),
    { name: 'tierup-store' }
  )
)
