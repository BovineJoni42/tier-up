// TMDB API client — https://www.themoviedb.org/documentation/api
// Set VITE_TMDB_API_KEY in your .env file (free at themoviedb.org)

const API_KEY = import.meta.env.VITE_TMDB_API_KEY ?? ''
const BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p/w300'

export interface SearchResult {
  id: string
  title: string
  cover: string
  platform: string
  year: number
  genre: string
}

// TMDB uses Bearer token auth — the API key IS the bearer token
function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${BASE}${path}`)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return url.toString()
}

function tmdbFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    }
  })
}

// ── Movies ────────────────────────────────────────────────────────────────────

export async function searchMovies(
  query: string,
  genre?: string
): Promise<SearchResult[]> {
  if (!query.trim() && (!genre || genre === 'All')) return []

  try {
    let results: SearchResult[] = []

    if (query.trim()) {
      const params: Record<string, string> = {
        query,
        page: '1',
        include_adult: 'false',
      }
      if (genre && genre !== 'All') params.with_genres = MOVIE_GENRE_IDS[genre] ?? ''
      const res = await tmdbFetch(buildUrl('/search/movie', params))
      if (!res.ok) throw new Error(`TMDB ${res.status}`)
      const data = await res.json()
      results = data.results.map(mapMovie)
    } else {
      // Genre browse — use discover
      const params: Record<string, string> = {
        sort_by: 'popularity.desc',
        page: '1',
        include_adult: 'false',
      }
      if (genre && genre !== 'All') params.with_genres = MOVIE_GENRE_IDS[genre] ?? ''
      const res = await tmdbFetch(buildUrl('/discover/movie', params))
      if (!res.ok) throw new Error(`TMDB ${res.status}`)
      const data = await res.json()
      results = data.results.map(mapMovie)
    }

    return results.filter(r => r.cover) // only return results with poster art
  } catch (err) {
    console.error('TMDB movie search failed:', err)
    return []
  }
}

function mapMovie(m: any): SearchResult {
  return {
    id: `movie-${m.id}`,
    title: m.title ?? m.original_title ?? 'Unknown',
    cover: m.poster_path ? `${IMG_BASE}${m.poster_path}` : '',
    platform: 'Movie',
    year: m.release_date ? new Date(m.release_date).getFullYear() : 0,
    genre: 'Movie',
  }
}

// ── TV Shows ──────────────────────────────────────────────────────────────────

export async function searchTV(
  query: string,
  genre?: string
): Promise<SearchResult[]> {
  if (!query.trim() && (!genre || genre === 'All')) return []

  try {
    let results: SearchResult[] = []

    if (query.trim()) {
      const params: Record<string, string> = {
        query,
        page: '1',
        include_adult: 'false',
      }
      if (genre && genre !== 'All') params.with_genres = TV_GENRE_IDS[genre] ?? ''
      const res = await tmdbFetch(buildUrl('/search/tv', params))
      if (!res.ok) throw new Error(`TMDB ${res.status}`)
      const data = await res.json()
      results = data.results.map(mapTV)
    } else {
      const params: Record<string, string> = {
        sort_by: 'popularity.desc',
        page: '1',
      }
      if (genre && genre !== 'All') params.with_genres = TV_GENRE_IDS[genre] ?? ''
      const res = await tmdbFetch(buildUrl('/discover/tv', params))
      if (!res.ok) throw new Error(`TMDB ${res.status}`)
      const data = await res.json()
      results = data.results.map(mapTV)
    }

    return results.filter(r => r.cover)
  } catch (err) {
    console.error('TMDB TV search failed:', err)
    return []
  }
}

function mapTV(t: any): SearchResult {
  return {
    id: `tv-${t.id}`,
    title: t.name ?? t.original_name ?? 'Unknown',
    cover: t.poster_path ? `${IMG_BASE}${t.poster_path}` : '',
    platform: 'TV Show',
    year: t.first_air_date ? new Date(t.first_air_date).getFullYear() : 0,
    genre: 'TV Show',
  }
}

// ── Genre maps ────────────────────────────────────────────────────────────────

export const MOVIE_GENRES = [
  'All', 'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery',
  'Romance', 'Sci-Fi', 'Thriller',
]

export const MOVIE_GENRE_IDS: Record<string, string> = {
  'Action': '28', 'Adventure': '12', 'Animation': '16', 'Comedy': '35',
  'Crime': '80', 'Documentary': '99', 'Drama': '18', 'Fantasy': '14',
  'Horror': '27', 'Mystery': '9648', 'Romance': '10749',
  'Sci-Fi': '878', 'Thriller': '53',
}

export const TV_GENRES = [
  'All', 'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Kids', 'Mystery',
  'Reality', 'Sci-Fi', 'Thriller',
]

export const TV_GENRE_IDS: Record<string, string> = {
  'Action': '10759', 'Adventure': '10759', 'Animation': '16', 'Comedy': '35',
  'Crime': '80', 'Documentary': '99', 'Drama': '18', 'Fantasy': '10765',
  'Kids': '10762', 'Mystery': '9648', 'Reality': '10764',
  'Sci-Fi': '10765', 'Thriller': '53',
}
