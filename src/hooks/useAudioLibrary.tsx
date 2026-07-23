import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { AudioTrack, AudioCategory, NasheedLanguage } from '../types'
import {
  uploadAudioToCloud,
  deleteAudioFromCloud,
  updateTrackInCloud,
  incrementTrackViews,
  getAllTracks,
  getTracksByCategory,
} from '../lib/storage'

// ── Types ─────────────────────────────────────────────────────────────────
export interface BulkUploadItem {
  file: File
  title: string
  category: AudioCategory
  reciter: string
  topic?: string
  text?: string
  language?: NasheedLanguage | string
}

export interface BulkUploadResult {
  fileName: string
  success: boolean
  error?: string
}

interface AudioLibraryState {
  tracks: AudioTrack[]
  loading: boolean
  uploading: boolean
  uploadError: string | null
  refresh: () => void
  uploadTrack: (file: File, metadata: { title: string; category: AudioCategory; reciter: string; topic?: string; text?: string; language?: NasheedLanguage | string }) => Promise<boolean>
  bulkUpload: (items: BulkUploadItem[], onProgress?: (done: number, total: number) => void) => Promise<BulkUploadResult[]>
  deleteTrackById: (id: string) => Promise<void>
  editTrack: (id: string, patch: Partial<Pick<AudioTrack, 'title' | 'reciter' | 'category' | 'topic' | 'language'>>) => Promise<void>
  /** Record a play/view for a track (increments once per track per session) */
  recordTrackView: (id: string) => void
  getByCategory: (category: AudioCategory) => Promise<AudioTrack[]>
}

// ── Context ───────────────────────────────────────────────────────────────
const AudioLibraryContext = createContext<AudioLibraryState | null>(null)

async function extractDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)
    audio.src = url
    audio.addEventListener('loadedmetadata', () => { resolve(audio.duration); URL.revokeObjectURL(url) })
    audio.addEventListener('error', () => { resolve(undefined); URL.revokeObjectURL(url) })
    setTimeout(() => { resolve(undefined); URL.revokeObjectURL(url) }, 8000)
  })
}

// ── Provider ──────────────────────────────────────────────────────────────
export function AudioLibraryProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<AudioTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const loadTracks = useCallback(async () => {
    setLoading(true)
    try {
      const all = await getAllTracks()
      setTracks(all)
    } catch (err) {
      console.error('[AudioLibrary] Failed to load tracks:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTracks() }, [loadTracks])

  const refresh = useCallback(() => { loadTracks() }, [loadTracks])

  const uploadTrack = useCallback(async (
    file: File,
    metadata: { title: string; category: AudioCategory; reciter: string; topic?: string; text?: string; language?: NasheedLanguage | string }
  ): Promise<boolean> => {
    setUploadError(null)
    if (!file.type.startsWith('audio/')) { setUploadError('Please select a valid audio file.'); return false }
    if (!metadata.title.trim()) { setUploadError('Please enter a title.'); return false }
    if (!metadata.reciter.trim()) { setUploadError('Please enter a speaker/artist name.'); return false }

    setUploading(true)
    try {
      const id = crypto.randomUUID()
      const duration = await extractDuration(file)
      const { track } = await uploadAudioToCloud(file, id, { ...metadata, duration })
      // Add to shared state immediately — all pages see it instantly
      setTracks(prev => [track, ...prev])
      return true
    } catch (err: any) {
      const msg = err?.message || 'Upload failed. Please try again.'
      setUploadError(msg)
      console.error('[uploadTrack error]', err)
      return false
    } finally {
      setUploading(false)
    }
  }, [])

  const bulkUpload = useCallback(async (
    items: BulkUploadItem[],
    onProgress?: (done: number, total: number) => void
  ): Promise<BulkUploadResult[]> => {
    setUploading(true)
    setUploadError(null)
    const results: BulkUploadResult[] = []

    for (let i = 0; i < items.length; i++) {
      const { file, title, category, reciter, topic } = items[i]
      try {
        if (!file.type.startsWith('audio/')) {
          results.push({ fileName: file.name, success: false, error: 'Not a valid audio file' })
        } else if (!title.trim()) {
          results.push({ fileName: file.name, success: false, error: 'Title is required' })
        } else if (!reciter.trim()) {
          results.push({ fileName: file.name, success: false, error: 'Reciter/Artist is required' })
        } else {
          const id = crypto.randomUUID()
          const duration = await extractDuration(file)
          const { track } = await uploadAudioToCloud(file, id, { title, category, reciter, topic, duration })
          setTracks(prev => [track, ...prev])
          results.push({ fileName: file.name, success: true })
        }
      } catch (err: any) {
        results.push({ fileName: file.name, success: false, error: err.message || 'Upload failed' })
      }
      onProgress?.(i + 1, items.length)
    }

    setUploading(false)
    return results
  }, [])

  const deleteTrackById = useCallback(async (id: string) => {
    const track = tracks.find(t => t.id === id)
    if (track) {
      await deleteAudioFromCloud(track)
      setTracks(prev => prev.filter(t => t.id !== id))
    }
  }, [tracks])

  const editTrack = useCallback(async (
    id: string,
    patch: Partial<Pick<AudioTrack, 'title' | 'reciter' | 'category' | 'topic' | 'language'>>
  ) => {
    try {
      await updateTrackInCloud(id, patch)
      setTracks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    } catch (err) {
      console.error('[editTrack error]', err)
    }
  }, [])

  const viewedThisSession = useRef<Set<string>>(new Set())

  const recordTrackView = useCallback((id: string) => {
    if (!id || id.startsWith('draft-')) return
    if (viewedThisSession.current.has(id)) return
    viewedThisSession.current.add(id)

    // Optimistic local bump
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, views: (t.views || 0) + 1 } : t))
    )

    incrementTrackViews(id).catch((err) => {
      console.error('[recordTrackView error]', err)
      // Allow retry later if cloud write failed
      viewedThisSession.current.delete(id)
    })
  }, [])

  const getByCategory = useCallback(async (category: AudioCategory) => {
    return getTracksByCategory(category)
  }, [])

  return (
    <AudioLibraryContext.Provider value={{ tracks, loading, uploading, uploadError, refresh, uploadTrack, bulkUpload, deleteTrackById, editTrack, recordTrackView, getByCategory }}>
      {children}
    </AudioLibraryContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useAudioLibrary(): AudioLibraryState {
  const ctx = useContext(AudioLibraryContext)
  if (!ctx) throw new Error('useAudioLibrary must be used inside AudioLibraryProvider')
  return ctx
}
