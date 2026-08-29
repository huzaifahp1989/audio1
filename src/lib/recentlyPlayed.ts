import type { AudioTrack } from '../types'

const RECENTS_KEY = 'audio-recently-played-v1'
const PROGRESS_KEY = 'audio-progress-v1'
const MAX_RECENTS = 16
const RESUME_MIN_SECONDS = 8
const RESUME_MAX_REMAINING = 12

export interface RecentSnapshot {
  id: string
  title: string
  reciter: string
  category: AudioTrack['category']
  topic?: string
  audioUrl?: string
  fileName: string
  fileSize: number
  mimeType: string
  duration?: number
  playedAt: number
}

export interface ProgressEntry {
  position: number
  duration: number
  updatedAt: number
}

type ProgressMap = Record<string, ProgressEntry>

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function loadRecentlyPlayed(): RecentSnapshot[] {
  const list = safeParse<RecentSnapshot[]>(localStorage.getItem(RECENTS_KEY), [])
  return Array.isArray(list) ? list : []
}

export function recordPlay(track: AudioTrack): void {
  const snapshot: RecentSnapshot = {
    id: track.id,
    title: track.title,
    reciter: track.reciter,
    category: track.category,
    topic: track.topic,
    audioUrl: track.audioUrl,
    fileName: track.fileName,
    fileSize: track.fileSize,
    mimeType: track.mimeType || 'audio/mpeg',
    duration: track.duration,
    playedAt: Date.now(),
  }
  const existing = loadRecentlyPlayed().filter((t) => t.id !== track.id)
  const next = [snapshot, ...existing].slice(0, MAX_RECENTS)
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
}

export function loadProgressMap(): ProgressMap {
  const map = safeParse<ProgressMap>(localStorage.getItem(PROGRESS_KEY), {})
  return map && typeof map === 'object' ? map : {}
}

export function updateProgress(trackId: string, position: number, duration: number): void {
  if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return
  const map = loadProgressMap()
  const remaining = duration - position
  // Finished (or basically finished): clear resume point.
  if (position < RESUME_MIN_SECONDS || remaining < RESUME_MAX_REMAINING) {
    if (map[trackId]) {
      delete map[trackId]
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(map))
    }
    return
  }
  map[trackId] = { position, duration, updatedAt: Date.now() }
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(map))
}

export function getProgress(trackId: string): ProgressEntry | null {
  return loadProgressMap()[trackId] ?? null
}

export function clearProgress(trackId: string): void {
  const map = loadProgressMap()
  if (map[trackId]) {
    delete map[trackId]
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map))
  }
}

export function snapshotToTrack(snap: RecentSnapshot): AudioTrack {
  return {
    id: snap.id,
    title: snap.title,
    category: snap.category,
    reciter: snap.reciter,
    topic: snap.topic,
    fileName: snap.fileName,
    fileSize: snap.fileSize,
    mimeType: snap.mimeType,
    duration: snap.duration,
    uploadedAt: snap.playedAt,
    audioUrl: snap.audioUrl,
    views: 0,
  }
}

/** Prefer the live library track (fresh views/votes), fall back to the snapshot. */
export function resolveRecent(snap: RecentSnapshot, library: AudioTrack[]): AudioTrack {
  return library.find((t) => t.id === snap.id) ?? snapshotToTrack(snap)
}
