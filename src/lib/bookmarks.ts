const KEY = 'audio-track-bookmarks'

export interface TrackBookmark {
  trackId: string
  time: number
  label: string
  createdAt: number
}

type BookmarkMap = Record<string, TrackBookmark[]>

function loadMap(): BookmarkMap {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as BookmarkMap) : {}
  } catch {
    return {}
  }
}

function saveMap(map: BookmarkMap) {
  localStorage.setItem(KEY, JSON.stringify(map))
}

export function getBookmarks(trackId: string): TrackBookmark[] {
  return loadMap()[trackId] ?? []
}

export function addBookmark(trackId: string, time: number, label?: string): TrackBookmark {
  const map = loadMap()
  const list = map[trackId] ?? []
  const entry: TrackBookmark = {
    trackId,
    time,
    label: label?.trim() || `Bookmark at ${formatBookmarkTime(time)}`,
    createdAt: Date.now(),
  }
  map[trackId] = [...list, entry].sort((a, b) => a.time - b.time)
  saveMap(map)
  return entry
}

export function removeBookmark(trackId: string, createdAt: number) {
  const map = loadMap()
  map[trackId] = (map[trackId] ?? []).filter((b) => b.createdAt !== createdAt)
  saveMap(map)
}

function formatBookmarkTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
