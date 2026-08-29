import type { AudioTrack } from '../types'

export type FavoritableCategory = 'nasheeds' | 'talks'

const STORAGE_KEY = 'audio-favorites-v1'

export interface StoredFavorite {
  id: string
  category: FavoritableCategory
  title: string
  reciter: string
  topic?: string
  audioUrl?: string
  duration?: number
  fileName: string
  fileSize: number
  mimeType: string
  savedAt: number
}

export function canFavorite(track: AudioTrack): track is AudioTrack & { category: FavoritableCategory } {
  return track.category === 'nasheeds' || track.category === 'talks'
}

export function trackToStoredFavorite(track: AudioTrack): StoredFavorite {
  return {
    id: track.id,
    category: track.category as FavoritableCategory,
    title: track.title,
    reciter: track.reciter,
    topic: track.topic,
    audioUrl: track.audioUrl,
    duration: track.duration,
    fileName: track.fileName,
    fileSize: track.fileSize,
    mimeType: track.mimeType || 'audio/mpeg',
    savedAt: Date.now(),
  }
}

export function storedFavoriteToTrack(fav: StoredFavorite): AudioTrack {
  return {
    id: fav.id,
    title: fav.title,
    category: fav.category,
    reciter: fav.reciter,
    topic: fav.topic,
    fileName: fav.fileName,
    fileSize: fav.fileSize,
    mimeType: fav.mimeType,
    duration: fav.duration,
    uploadedAt: fav.savedAt,
    audioUrl: fav.audioUrl,
    views: 0,
  }
}

export function loadFavorites(): StoredFavorite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredFavorite[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveFavorites(favorites: StoredFavorite[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
}

export function mergeFavoriteWithLibrary(fav: StoredFavorite, library: AudioTrack[]): AudioTrack {
  const live = library.find((t) => t.id === fav.id)
  if (live) return live
  return storedFavoriteToTrack(fav)
}
