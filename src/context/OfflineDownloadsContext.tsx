import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AudioTrack } from '../types'
import type { TrackDownloadMeta } from '../lib/indexedDb'
import {
  OfflineStorageError,
  clearOfflineDownloads,
  downloadTrackForOffline,
  estimateStorage,
  listOfflineDownloads,
  removeOfflineDownload,
} from '../lib/offlineDownloads'
import { trackEvent } from '../lib/analytics'

interface OfflineDownloadsContextValue {
  downloads: TrackDownloadMeta[]
  /** Track id -> download ratio (0–1), or null when the size is unknown. */
  progress: Record<string, number | null>
  error: string | null
  loading: boolean
  totalBytes: number
  storageUsedBytes: number | null
  storageQuotaBytes: number | null
  isDownloaded: (trackId: string) => boolean
  isDownloading: (trackId: string) => boolean
  downloadTrack: (track: AudioTrack) => Promise<void>
  removeDownload: (trackId: string) => Promise<void>
  clearAll: () => Promise<void>
  refresh: () => Promise<void>
  dismissError: () => void
}

const OfflineDownloadsContext = createContext<OfflineDownloadsContextValue | null>(null)

export function OfflineDownloadsProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<TrackDownloadMeta[]>([])
  const [progress, setProgress] = useState<Record<string, number | null>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [storage, setStorage] = useState<{ usedBytes: number; quotaBytes: number } | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const refreshStorage = useCallback(async () => {
    const estimate = await estimateStorage()
    if (mountedRef.current) setStorage(estimate)
  }, [])

  const refresh = useCallback(async () => {
    const list = await listOfflineDownloads()
    if (!mountedRef.current) return
    setDownloads(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    void refreshStorage()
  }, [refresh, refreshStorage])

  const downloadedIds = useMemo(() => new Set(downloads.map((d) => d.id)), [downloads])

  const isDownloaded = useCallback((trackId: string) => downloadedIds.has(trackId), [downloadedIds])
  const isDownloading = useCallback((trackId: string) => trackId in progress, [progress])

  const downloadTrack = useCallback(async (track: AudioTrack) => {
    if (trackIdInProgress(progress, track.id)) return

    setError(null)
    setProgress((prev) => ({ ...prev, [track.id]: null }))

    try {
      const meta = await downloadTrackForOffline(track, ({ ratio }) => {
        if (!mountedRef.current) return
        setProgress((prev) => ({ ...prev, [track.id]: ratio }))
      })

      if (!mountedRef.current) return
      setDownloads((prev) => [meta, ...prev.filter((d) => d.id !== meta.id)])
      trackEvent('offline_download_completed', {
        track_id: track.id,
        category: track.category,
        size_bytes: meta.size,
      })
    } catch (err) {
      if (!mountedRef.current) return
      const message = err instanceof OfflineStorageError
        ? err.message
        : 'Download failed. Please try again.'
      setError(message)
      trackEvent('offline_download_failed', { track_id: track.id, category: track.category })
    } finally {
      if (mountedRef.current) {
        setProgress((prev) => {
          const next = { ...prev }
          delete next[track.id]
          return next
        })
      }
      void refreshStorage()
    }
  }, [progress, refreshStorage])

  const removeDownload = useCallback(async (trackId: string) => {
    await removeOfflineDownload(trackId)
    if (!mountedRef.current) return
    setDownloads((prev) => prev.filter((d) => d.id !== trackId))
    void refreshStorage()
  }, [refreshStorage])

  const clearAll = useCallback(async () => {
    await clearOfflineDownloads()
    if (!mountedRef.current) return
    setDownloads([])
    void refreshStorage()
  }, [refreshStorage])

  const totalBytes = useMemo(() => downloads.reduce((sum, d) => sum + (d.size || 0), 0), [downloads])

  const value: OfflineDownloadsContextValue = {
    downloads,
    progress,
    error,
    loading,
    totalBytes,
    storageUsedBytes: storage?.usedBytes ?? null,
    storageQuotaBytes: storage?.quotaBytes ?? null,
    isDownloaded,
    isDownloading,
    downloadTrack,
    removeDownload,
    clearAll,
    refresh,
    dismissError: () => setError(null),
  }

  return (
    <OfflineDownloadsContext.Provider value={value}>
      {children}
    </OfflineDownloadsContext.Provider>
  )
}

export function useOfflineDownloads(): OfflineDownloadsContextValue {
  const ctx = useContext(OfflineDownloadsContext)
  if (!ctx) throw new Error('useOfflineDownloads must be used within an OfflineDownloadsProvider')
  return ctx
}

/**
 * Reads the in-flight map from a state snapshot so `downloadTrack` can bail out
 * without taking `progress` as a reactive dependency of the callback identity.
 */
function trackIdInProgress(progress: Record<string, number | null>, trackId: string): boolean {
  return trackId in progress
}
