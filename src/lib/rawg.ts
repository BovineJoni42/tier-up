// RAWG API client — https://rawg.io/apidocs
// Set VITE_RAWG_API_KEY in your .env file (free at rawg.io)

const API_KEY = import.meta.env.VITE_RAWG_API_KEY ?? ''
const BASE = 'https://api.rawg.io/api'

export interface RawgGame {
  id: number
  name: string
  background_image: string | null
  released: string | null
  genres: { id: number; name: string }[]
  platforms: { platform: { id: number; name: string } }[] | null
}

export interface SearchResult {
  id: string
  title: string
  cover: string
  platform: string
  year: number
  genre: string
}

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${BASE}${path}`)
  if (API_KEY) url.searchParams.set('key', API_KEY)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return url.toString()
}

function mapGame(g: RawgGame): SearchResult {
  const platform =
    g.platforms
      ?.slice(0, 3)
      .map(p => p.platform.name)
      .join(', ') ?? 'Unknown'
  const genre = g.genres?.[0]?.name ?? 'Unknown'
  const year = g.released ? new Date(g.released).getFullYear() : 0
  return {
    id: String(g.id),
    title: g.name,
    cover: g.background_image ?? '',
    platform,
    year,
    genre,
  }
}

export async function searchGames(
  query: string,
  genre?: string,
  page = 1
): Promise<SearchResult[]> {
  // Allow genre-only browsing with no search query
  if (!query.trim() && (!genre || genre === 'All')) return []

  const params: Record<string, string> = {
    page_size: '20',
    page: String(page),
    ordering: '-rating',
  }
  if (query.trim()) params.search = query.trim()
  if (genre && genre !== 'All') params.genres = genre.toLowerCase()

  try {
    const res = await fetch(buildUrl('/games', params))
    if (!res.ok) throw new Error(`RAWG ${res.status}`)
    const data = await res.json()
    return (data.results as RawgGame[]).map(mapGame)
  } catch (err) {
    console.error('RAWG search failed:', err)
    return []
  }
}

export async function getGameById(id: string): Promise<SearchResult | null> {
  try {
    const res = await fetch(buildUrl(`/games/${id}`, {}))
    if (!res.ok) return null
    const data: RawgGame = await res.json()
    return mapGame(data)
  } catch {
    return null
  }
}

// Genre slugs that RAWG accepts
export const RAWG_GENRES = [
  'All',
  'action',
  'adventure',
  'role-playing-games-rpg',
  'shooter',
  'puzzle',
  'racing',
  'sports',
  'strategy',
  'simulation',
  'indie',
  'platformer',
  'fighting',
  'family',
]

export const GENRE_LABELS: Record<string, string> = {
  'All': 'All',
  'action': 'Action',
  'adventure': 'Adventure',
  'role-playing-games-rpg': 'RPG',
  'shooter': 'Shooter',
  'puzzle': 'Puzzle',
  'racing': 'Racing',
  'sports': 'Sports',
  'strategy': 'Strategy',
  'simulation': 'Simulation',
  'indie': 'Indie',
  'platformer': 'Platformer',
  'fighting': 'Fighting',
  'family': 'Family',
}
