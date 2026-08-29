import type { AudioTrack } from '../types'
import { loadRecentlyPlayed } from './recentlyPlayed'
import { loadFavorites } from './favorites'

function hashDate(date: Date): number {
  const s = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** One featured track per day — deterministic from date + library size. */
export function getDailyPick(tracks: AudioTrack[]): AudioTrack | null {
  if (tracks.length === 0) return null
  const pool = tracks.filter((t) => (t.views || 0) > 0 || (t.votes || 0) > 0)
  const list = pool.length >= 3 ? pool : tracks
  const idx = hashDate(new Date()) % list.length
  return list[idx] ?? null
}

/** Personalized picks from recents, favorites, and category overlap. */
export function getRecommendedForYou(tracks: AudioTrack[], limit = 6): AudioTrack[] {
  if (tracks.length === 0) return []

  const recents = loadRecentlyPlayed()
  const favIds = loadFavorites().map((f) => f.id)
  const recentIds = new Set(recents.map((r) => r.id))
  const favSet = new Set(favIds)

  const seedTracks = tracks.filter((t) => recentIds.has(t.id) || favSet.has(t.id))
  const categories = new Set(seedTracks.map((t) => t.category))
  const reciters = new Set(seedTracks.map((t) => t.reciter).filter(Boolean))
  const topics = new Set(seedTracks.map((t) => t.topic).filter(Boolean))

  const scored = tracks
    .filter((t) => !recentIds.has(t.id))
    .map((t) => {
      let score = 0
      if (categories.has(t.category)) score += 2
      if (t.reciter && reciters.has(t.reciter)) score += 3
      if (t.topic && topics.has(t.topic)) score += 2
      score += Math.min(3, (t.votes || 0) / 5)
      score += Math.min(2, (t.views || 0) / 100)
      return { track: t, score }
    })

  if (seedTracks.length === 0) {
    return [...tracks]
      .sort((a, b) => (b.votes || 0) - (a.votes || 0) || (b.views || 0) - (a.views || 0))
      .slice(0, limit)
  }

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.track)
}
