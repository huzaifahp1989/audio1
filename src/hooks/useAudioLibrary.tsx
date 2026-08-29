import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { AudioTrack, AudioCategory, NasheedLanguage } from '../types'
import {
  uploadAudioToCloud,
  createTrackFromRemote,
  deleteAudioFromCloud,
  updateTrackInCloud,
  incrementTrackViews,
  getAllTracks,
  getTracksByCategory,
} from '../lib/storage'
import { normalizeAudioFileForPlayback, trimSilenceFromFile } from '../lib/audioProcessing'
import { subscribeToVotes } from '../lib/votes'
import { trackEvent } from '../lib/analytics'

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
<<<<<<< HEAD
  uploadTrack: (file: File, metadata: { title: string; category: AudioCategory; reciter: string; topic?: string; text?: string; imageFile?: File; autoTrimLeadingSilence?: boolean; autoTrimTrailingSilence?: boolean }) => Promise<boolean>
  importTrackFromUrl: (data: { audioUrl: string; title: string; category: AudioCategory; reciter: string; topic?: string; duration?: number; fileName: string; fileSize: number; mimeType: string }) => Promise<boolean>
  bulkUpload: (items: BulkUploadItem[], onProgress?: (done: number, total: number) => void, options?: { autoTrimLeadingSilence?: boolean; autoTrimTrailingSilence?: boolean }) => Promise<BulkUploadResult[]>
=======
  uploadTrack: (file: File, metadata: { title: string; category: AudioCategory; reciter: string; topic?: string; text?: string; language?: NasheedLanguage | string; source?: string }) => Promise<boolean>
  bulkUpload: (items: BulkUploadItem[], onProgress?: (done: number, total: number) => void) => Promise<BulkUploadResult[]>
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
  deleteTrackById: (id: string) => Promise<void>
  editTrack: (id: string, patch: Partial<Pick<AudioTrack, 'title' | 'reciter' | 'category' | 'topic' | 'language'>>) => Promise<void>
  /** Record a play/view for a track (increments once per track per session) */
  recordTrackView: (id: string) => void
  getByCategory: (category: AudioCategory) => Promise<AudioTrack[]>
  incrementTrackView: (id: string, newViews?: number) => void
  updateTrackVote: (id: string, newVotes: number) => void
}

// ── Context ───────────────────────────────────────────────────────────────
const AudioLibraryContext = createContext<AudioLibraryState | null>(null)

function isLikelyAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) return true
  return /\.(mp3|wav|m4a|aac|ogg|opus|webm|flac)$/i.test(file.name)
}

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

  // Live vote counts for all visitors (public Firestore reads)
  useEffect(() => {
    const unsubscribe = subscribeToVotes((voteMap) => {
      setTracks((prev) =>
        prev.map((t) => ({
          ...t,
          votes: voteMap[t.id] !== undefined ? voteMap[t.id] : (t.votes ?? 0),
        })),
      )
    })
    return unsubscribe
  }, [])

  const refresh = useCallback(() => { loadTracks() }, [loadTracks])

  const uploadTrack = useCallback(async (
    file: File,
<<<<<<< HEAD
    metadata: { title: string; category: AudioCategory; reciter: string; topic?: string; text?: string; imageFile?: File; autoTrimLeadingSilence?: boolean; autoTrimTrailingSilence?: boolean }
=======
    metadata: { title: string; category: AudioCategory; reciter: string; topic?: string; text?: string; language?: NasheedLanguage | string; source?: string }
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
  ): Promise<boolean> => {
    setUploadError(null)
    if (!isLikelyAudioFile(file)) { setUploadError('Please select a valid audio file.'); return false }
    if (!metadata.title.trim()) { setUploadError('Please enter a title.'); return false }

    setUploading(true)
    try {
      let uploadFile = await normalizeAudioFileForPlayback(file)
      if (metadata.autoTrimLeadingSilence || metadata.autoTrimTrailingSilence) {
        try {
          const trimmed = await trimSilenceFromFile(uploadFile, {
            trimLeading: !!metadata.autoTrimLeadingSilence,
            trimTrailing: !!metadata.autoTrimTrailingSilence,
          })
          uploadFile = trimmed.file
        } catch (trimErr) {
          console.warn('[uploadTrack] Failed to trim leading silence, using original file:', trimErr)
        }
      }

      const id = crypto.randomUUID()
      const duration = await extractDuration(uploadFile)
      const { track } = await uploadAudioToCloud(uploadFile, id, { ...metadata, duration })
      // Add to shared state immediately — all pages see it instantly
      setTracks(prev => [track, ...prev])
      trackEvent('upload_track', { category: metadata.category, source: 'library_upload', track_id: track.id })
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

  const importTrackFromUrl = useCallback(async (
    data: { audioUrl: string; title: string; category: AudioCategory; reciter: string; topic?: string; duration?: number; fileName: string; fileSize: number; mimeType: string }
  ): Promise<boolean> => {
    setUploadError(null)
    if (!data.audioUrl) { setUploadError('Missing audio URL from import.'); return false }
    if (!data.title.trim()) { setUploadError('Please enter a title.'); return false }
    if (!data.reciter.trim()) { setUploadError('Please choose a reciter / artist / speaker.'); return false }

    setUploading(true)
    try {
      const track = await createTrackFromRemote(data)
      setTracks(prev => [track, ...prev])
      trackEvent('import_track_url', { category: data.category, track_id: track.id })
      return true
    } catch (err: any) {
      const msg = err?.message || 'Import failed. Please try again.'
      setUploadError(msg)
      console.error('[importTrackFromUrl error]', err)
      return false
    } finally {
      setUploading(false)
    }
  }, [])

  const bulkUpload = useCallback(async (
    items: BulkUploadItem[],
    onProgress?: (done: number, total: number) => void,
    options?: { autoTrimLeadingSilence?: boolean; autoTrimTrailingSilence?: boolean }
  ): Promise<BulkUploadResult[]> => {
    setUploading(true)
    setUploadError(null)
    const results: BulkUploadResult[] = []

    for (let i = 0; i < items.length; i++) {
      const { file, title, category, reciter, topic } = items[i]
      try {
        if (!isLikelyAudioFile(file)) {
          results.push({ fileName: file.name, success: false, error: 'Not a valid audio file' })
        } else if (!title.trim()) {
          results.push({ fileName: file.name, success: false, error: 'Title is required' })
        } else {
          let uploadFile = await normalizeAudioFileForPlayback(file)
          if (options?.autoTrimLeadingSilence || options?.autoTrimTrailingSilence) {
            try {
              const trimmed = await trimSilenceFromFile(uploadFile, {
                trimLeading: !!options?.autoTrimLeadingSilence,
                trimTrailing: !!options?.autoTrimTrailingSilence,
              })
              uploadFile = trimmed.file
            } catch (trimErr) {
              console.warn('[bulkUpload] Failed to trim leading silence, using original file:', trimErr)
            }
          }

          const id = crypto.randomUUID()
          const duration = await extractDuration(uploadFile)
          const { track } = await uploadAudioToCloud(uploadFile, id, { title, category, reciter, topic, duration })
          setTracks(prev => [track, ...prev])
          trackEvent('bulk_upload_track', { category, track_id: track.id })
          results.push({ fileName: uploadFile.name, success: true })
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

  // Increment track view locally (database is updated separately via API)
  const incrementTrackView = useCallback((id: string, newViews?: number) => {
    setTracks(prev => prev.map(t => 
      t.id === id ? { ...t, views: newViews || (t.views || 0) + 1 } : t
    ))
  }, [])

  const updateTrackVote = useCallback((id: string, newVotes: number) => {
    setTracks(prev => prev.map(t =>
      t.id === id ? { ...t, votes: Math.max(0, newVotes) } : t
    ))
  }, [])

  return (
<<<<<<< HEAD
    <AudioLibraryContext.Provider value={{ tracks, loading, uploading, uploadError, refresh, uploadTrack, importTrackFromUrl, bulkUpload, deleteTrackById, editTrack, getByCategory, incrementTrackView, updateTrackVote }}>
=======
    <AudioLibraryContext.Provider value={{ tracks, loading, uploading, uploadError, refresh, uploadTrack, bulkUpload, deleteTrackById, editTrack, recordTrackView, getByCategory }}>
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
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
