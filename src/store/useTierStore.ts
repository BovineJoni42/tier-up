import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ───────────────────────────────────────────────────────────────────

export type TierId = 'sp' | 'a' | 'b' | 'c' | 'd' | 'f'

export interface Game {
  id: string          // unique within this list (rawg id or manual uuid)
  title: string
  cover: string       // image URL
  platform: string
  year: number
  genre: string
}

export interface TierList {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  tiers: Record<TierId, Game[]>
  top5: string[]      // ordered array of game ids (max 5)
}

export const TIER_META: Record<TierId, { label: string; color: string; bg: string }> = {
  sp: { label: 'S+', color: '#ffd700', bg: 'rgba(255,215,0,0.12)' },
  a:  { label: 'A',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  b:  { label: 'B',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  c:  { label: 'C',  color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  d:  { label: 'D',  color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  f:  { label: 'F',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}

export const TIER_ORDER: TierId[] = ['sp', 'a', 'b', 'c', 'd', 'f']

function emptyTiers(): Record<TierId, Game[]> {
  return { sp: [], a: [], b: [], c: [], d: [], f: [] }
}

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface TierStore {
  lists: TierList[]

  // List CRUD
  createList: (name: string) => string
  renameList: (id: string, name: string) => void
  duplicateList: (id: string) => string
  deleteList: (id: string) => void
  getList: (id: string) => TierList | undefined

  // Game management
  addGame: (listId: string, tierId: TierId, game: Game) => void
  removeGame: (listId: string, tierId: TierId, gameId: string) => void
  moveGame: (listId: string, gameId: string, fromTier: TierId, toTier: TierId, toIndex?: number) => void
  reorderGame: (listId: string, tierId: TierId, fromIndex: number, toIndex: number) => void

  // Top 5
  addToTop5: (listId: string, gameId: string) => void
  removeFromTop5: (listId: string, gameId: string) => void
  reorderTop5: (listId: string, fromIndex: number, toIndex: number) => void
}

export const useTierStore = create<TierStore>()(
  persist(
    (set, get) => ({
      lists: [],

      createList: (name) => {
        const id = uuid()
        const now = Date.now()
        const list: TierList = {
          id,
          name,
          createdAt: now,
          updatedAt: now,
          tiers: emptyTiers(),
          top5: [],
        }
        set(s => ({ lists: [list, ...s.lists] }))
        return id
      },

      renameList: (id, name) => {
        set(s => ({
          lists: s.lists.map(l =>
            l.id === id ? { ...l, name, updatedAt: Date.now() } : l
          ),
        }))
      },

      duplicateList: (id) => {
        const src = get().getList(id)
        if (!src) return ''
        const newId = uuid()
        const now = Date.now()
        const copy: TierList = {
          ...src,
          id: newId,
          name: src.name + ' (copy)',
          createdAt: now,
          updatedAt: now,
          tiers: Object.fromEntries(
            Object.entries(src.tiers).map(([k, v]) => [k, [...v]])
          ) as Record<TierId, Game[]>,
          top5: [...src.top5],
        }
        set(s => ({ lists: [copy, ...s.lists] }))
        return newId
      },

      deleteList: (id) => {
        set(s => ({ lists: s.lists.filter(l => l.id !== id) }))
      },

      getList: (id) => get().lists.find(l => l.id === id),

      addGame: (listId, tierId, game) => {
        set(s => ({
          lists: s.lists.map(l => {
            if (l.id !== listId) return l
            // Remove from any existing tier first (prevent duplicates)
            const cleanTiers = Object.fromEntries(
              Object.entries(l.tiers).map(([k, v]) => [
                k,
                (v as Game[]).filter(g => g.id !== game.id),
              ])
            ) as Record<TierId, Game[]>
            return {
              ...l,
              updatedAt: Date.now(),
              tiers: {
                ...cleanTiers,
                [tierId]: [...cleanTiers[tierId], game],
              },
            }
          }),
        }))
      },

      removeGame: (listId, tierId, gameId) => {
        set(s => ({
          lists: s.lists.map(l => {
            if (l.id !== listId) return l
            return {
              ...l,
              updatedAt: Date.now(),
              tiers: {
                ...l.tiers,
                [tierId]: l.tiers[tierId].filter(g => g.id !== gameId),
              },
              top5: l.top5.filter(id => id !== gameId),
            }
          }),
        }))
      },

      moveGame: (listId, gameId, fromTier, toTier, toIndex) => {
        set(s => ({
          lists: s.lists.map(l => {
            if (l.id !== listId) return l
            const game = l.tiers[fromTier].find(g => g.id === gameId)
            if (!game) return l
            const newFrom = l.tiers[fromTier].filter(g => g.id !== gameId)
            const newTo = l.tiers[toTier].filter(g => g.id !== gameId)
            if (toIndex !== undefined) {
              newTo.splice(toIndex, 0, game)
            } else {
              newTo.push(game)
            }
            return {
              ...l,
              updatedAt: Date.now(),
              tiers: { ...l.tiers, [fromTier]: newFrom, [toTier]: newTo },
            }
          }),
        }))
      },

      reorderGame: (listId, tierId, fromIndex, toIndex) => {
        set(s => ({
          lists: s.lists.map(l => {
            if (l.id !== listId) return l
            const games = [...l.tiers[tierId]]
            const [moved] = games.splice(fromIndex, 1)
            games.splice(toIndex, 0, moved)
            return {
              ...l,
              updatedAt: Date.now(),
              tiers: { ...l.tiers, [tierId]: games },
            }
          }),
        }))
      },

      addToTop5: (listId, gameId) => {
        set(s => ({
          lists: s.lists.map(l => {
            if (l.id !== listId) return l
            if (l.top5.includes(gameId) || l.top5.length >= 5) return l
            return { ...l, top5: [...l.top5, gameId], updatedAt: Date.now() }
          }),
        }))
      },

      removeFromTop5: (listId, gameId) => {
        set(s => ({
          lists: s.lists.map(l => {
            if (l.id !== listId) return l
            return { ...l, top5: l.top5.filter(id => id !== gameId), updatedAt: Date.now() }
          }),
        }))
      },

      reorderTop5: (listId, fromIndex, toIndex) => {
        set(s => ({
          lists: s.lists.map(l => {
            if (l.id !== listId) return l
            const arr = [...l.top5]
            const [moved] = arr.splice(fromIndex, 1)
            arr.splice(toIndex, 0, moved)
            return { ...l, top5: arr, updatedAt: Date.now() }
          }),
        }))
      },
    }),
    {
      name: 'tierup-storage',
      version: 1,
    }
  )
)
