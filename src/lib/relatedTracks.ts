import type { AudioTrack } from '../types'

export function getRelatedTracks(track: AudioTrack, all: AudioTrack[], limit = 6): AudioTrack[] {
  const others = all.filter((t) => t.id !== track.id)
  const scored = others.map((t) => {
    let score = 0
    if (t.reciter && track.reciter && t.reciter === track.reciter) score += 4
    if (t.topic && track.topic && t.topic === track.topic) score += 3
    if (t.category === track.category) score += 2
    score += Math.min(2, (t.views || 0) / 50)
    return { track: t, score }
  })
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.track.uploadedAt - a.track.uploadedAt)
    .slice(0, limit)
    .map((s) => s.track)
}
