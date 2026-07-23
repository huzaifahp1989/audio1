import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import type { AudioTrack, AudioCategory, NasheedLanguage, TrackStatus } from '../types'
import { isTrackApproved, isKidsCategory } from '../types'
import {
  uploadAudioToCloud,
  deleteAudioFromCloud,
  updateTrackInCloud,
  setTrackStatusInCloud,
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
  status?: TrackStatus
  source?: string
}

export interface BulkUploadResult {
  fileName: string
  success: boolean
  error?: string
}

export type UploadTrackMeta = {
  title: string
  category: AudioCategory
  reciter: string
  topic?: string
  text?: string
  language?: NasheedLanguage | string
  status?: TrackStatus
  source?: string
}

interface AudioLibraryState {
  /** Approved tracks only — for public pages */
  tracks: AudioTrack[]
  /** All tracks including pending — for Admin */
  allTracks: AudioTrack[]
  /** Pending moderation queue */
  pendingTracks: AudioTrack[]
  /** Pending kids recordings specifically */
  pendingKidsTracks: AudioTrack[]
  loading: boolean
  uploading: boolean
  uploadError: string | null
  refresh: () => void
  uploadTrack: (file: File, metadata: UploadTrackMeta) => Promise<boolean>
  bulkUpload: (items: BulkUploadItem[], onProgress?: (done: number, total: number) => void) => Promise<BulkUploadResult[]>
  deleteTrackById: (id: string) => Promise<void>
  editTrack: (id: string, patch: Partial<Pick<AudioTrack, 'title' | 'reciter' | 'category' | 'topic' | 'language' | 'status'>>) => Promise<void>
  approveTrack: (id: string) => Promise<boolean>
  rejectTrack: (id: string) => Promise<boolean>
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
  const [allTracks, setAllTracks] = useState<AudioTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const loadTracks = useCallback(async () => {
    setLoading(true)
    try {
      const all = await getAllTracks()
      setAllTracks(all)
    } catch (err) {
      console.error('[AudioLibrary] Failed to load tracks:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTracks() }, [loadTracks])

  const refresh = useCallback(() => { loadTracks() }, [loadTracks])

  const tracks = useMemo(() => allTracks.filter(isTrackApproved), [allTracks])
  const pendingTracks = useMemo(
    () => allTracks.filter((t) => t.status === 'pending'),
    [allTracks]
  )
  const pendingKidsTracks = useMemo(
    () => pendingTracks.filter((t) => isKidsCategory(t.category) || t.source === 'kids-studio'),
    [pendingTracks]
  )

  const uploadTrack = useCallback(async (
    file: File,
    metadata: UploadTrackMeta
  ): Promise<boolean> => {
    setUploadError(null)
    if (!file.type.startsWith('audio/')) { setUploadError('Please select a valid audio file.'); return false }
    if (!metadata.title.trim()) { setUploadError('Please enter a title.'); return false }
    if (!metadata.reciter.trim()) { setUploadError('Please enter a speaker/artist name.'); return false }

    setUploading(true)
    try {
      const id = crypto.randomUUID()
      const duration = await extractDuration(file)
      const { track } = await uploadAudioToCloud(file, id, {
        ...metadata,
        duration,
        status: metadata.status || 'approved',
        source: metadata.source || 'admin',
      })
      setAllTracks((prev) => [track, ...prev])
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
      const { file, title, category, reciter, topic, language, status, source } = items[i]
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
          const { track } = await uploadAudioToCloud(file, id, {
            title,
            category,
            reciter,
            topic,
            language,
            duration,
            status: status || 'approved',
            source: source || 'admin',
          })
          setAllTracks((prev) => [track, ...prev])
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
    const track = allTracks.find((t) => t.id === id)
    if (track) {
      await deleteAudioFromCloud(track)
      setAllTracks((prev) => prev.filter((t) => t.id !== id))
    }
  }, [allTracks])

  const editTrack = useCallback(async (
    id: string,
    patch: Partial<Pick<AudioTrack, 'title' | 'reciter' | 'category' | 'topic' | 'language' | 'status'>>
  ) => {
    try {
      await updateTrackInCloud(id, patch)
      setAllTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    } catch (err) {
      console.error('[editTrack error]', err)
    }
  }, [])

  const approveTrack = useCallback(async (id: string): Promise<boolean> => {
    try {
      await setTrackStatusInCloud(id, 'approved')
      setAllTracks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'approved' as const } : t)))
      return true
    } catch (err) {
      console.error('[approveTrack error]', err)
      return false
    }
  }, [])

  const rejectTrack = useCallback(async (id: string): Promise<boolean> => {
    try {
      const track = allTracks.find((t) => t.id === id)
      if (!track) return false
      // Reject = remove from library entirely
      await deleteAudioFromCloud(track)
      setAllTracks((prev) => prev.filter((t) => t.id !== id))
      return true
    } catch (err) {
      console.error('[rejectTrack error]', err)
      return false
    }
  }, [allTracks])

  const getByCategory = useCallback(async (category: AudioCategory) => {
    return getTracksByCategory(category)
  }, [])

  return (
    <AudioLibraryContext.Provider
      value={{
        tracks,
        allTracks,
        pendingTracks,
        pendingKidsTracks,
        loading,
        uploading,
        uploadError,
        refresh,
        uploadTrack,
        bulkUpload,
        deleteTrackById,
        editTrack,
        approveTrack,
        rejectTrack,
        getByCategory,
      }}
    >
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
