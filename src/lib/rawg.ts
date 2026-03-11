const RAWG_KEY = import.meta.env.VITE_RAWG_API_KEY as string | undefined

export interface RawgGame {
  id: number
  name: string
  background_image: string | null
  released: string | null
  platforms: Array<{ platform: { name: string } }> | null
}

export async function searchGames(query: string, page = 1): Promise<RawgGame[]> {
  if (!query.trim()) return []
  const params = new URLSearchParams({
    search: query,
    page_size: '20',
    page: String(page),
    ...(RAWG_KEY ? { key: RAWG_KEY } : {}),
  })
  const res = await fetch(`https://api.rawg.io/api/games?${params}`)
  if (!res.ok) throw new Error('RAWG API error')
  const data = await res.json()
  return data.results as RawgGame[]
}

export function rawgToGame(r: RawgGame) {
  return {
    id: `rawg-${r.id}`,
    rawgId: r.id,
    title: r.name,
    coverUrl: r.background_image ?? '',
    platform: r.platforms?.[0]?.platform.name ?? 'Unknown',
    releaseYear: r.released?.slice(0, 4) ?? '—',
  }
}
