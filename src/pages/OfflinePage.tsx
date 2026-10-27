import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  HardDriveDownload,
  Pause,
  Play,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react'
import CategoryHero from '../components/CategoryHero'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { useOfflineDownloads } from '../context/OfflineDownloadsContext'
import type { TrackDownloadMeta } from '../lib/indexedDb'
import { formatBytes } from '../lib/offlineDownloads'
import { formatDuration } from '../lib/storage'
import type { AudioTrack } from '../types'

/** Rebuild a playable track from stored download metadata. */
function metaToTrack(meta: TrackDownloadMeta): AudioTrack {
  return {
    id: meta.id,
    title: meta.title,
    category: meta.category,
    reciter: meta.reciter,
    topic: meta.topic,
    imageUrl: meta.imageUrl,
    duration: meta.duration,
    mimeType: meta.mimeType,
    fileName: '',
    fileSize: meta.size,
    uploadedAt: meta.downloadedAt,
    audioUrl: meta.remoteUrl,
  }
}

export default function OfflinePage() {
  const {
    downloads,
    loading,
    error,
    totalBytes,
    storageUsedBytes,
    storageQuotaBytes,
    removeDownload,
    clearAll,
    dismissError,
  } = useOfflineDownloads()
  const { currentTrack, isPlaying, playFromList, togglePlay } = useAudioPlayer()
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [confirmingClear, setConfirmingClear] = useState(false)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const tracks = useMemo(() => downloads.map(metaToTrack), [downloads])

  const sizeById = useMemo(() => {
    const map: Record<string, number> = {}
    downloads.forEach((d) => { map[d.id] = d.size })
    return map
  }, [downloads])

  const quotaRatio =
    storageUsedBytes != null && storageQuotaBytes
      ? Math.min(1, storageUsedBytes / storageQuotaBytes)
      : null

  const handlePlayAll = () => {
    if (tracks.length > 0) playFromList(tracks[0], tracks, 0)
  }

  const handleClearAll = async () => {
    await clearAll()
    setConfirmingClear(false)
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4 sm:py-10">
      <CategoryHero
        icon={<Download size={14} />}
        badge="Offline"
        title="Downloads"
        description="Tracks saved on this device. They play instantly and work with no signal."
        gradient="from-slate-700 via-slate-800 to-emerald-800"
        itemCount={downloads.length}
        itemNoun="download"
        stats={
          <>
            <span className="inline-flex items-center gap-1">
              <HardDriveDownload size={12} />
              {formatBytes(totalBytes)} on this device
            </span>
            {storageQuotaBytes != null && (
              <span className="inline-flex items-center gap-1">
                <Database size={12} />
                {formatBytes(storageQuotaBytes)} storage available
              </span>
            )}
          </>
        }
        actions={
          downloads.length > 0 ? (
            <>
              <button
                type="button"
                onClick={handlePlayAll}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-800 shadow-lg"
              >
                <Play size={16} /> Play all
              </button>
              {confirmingClear ? (
                <span className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white shadow-lg"
                  >
                    <Trash2 size={16} /> Remove all {downloads.length}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/35 bg-white/15 px-3 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/25"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingClear(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/15 px-4 text-sm font-bold text-white backdrop-blur-sm hover:bg-white/25"
                >
                  <Trash2 size={16} /> Clear all
                </button>
              )}
            </>
          ) : undefined
        }
      />

      {!isOnline && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <WifiOff size={16} className="mt-0.5 shrink-0" />
          <p>You are offline. Only downloaded tracks can be played right now.</p>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <span className="flex items-start gap-2.5">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </span>
          <button
            type="button"
            onClick={dismissError}
            aria-label="Dismiss error"
            className="shrink-0 rounded-lg p-1 hover:bg-rose-100 dark:hover:bg-rose-500/20"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {quotaRatio != null && (
        <div className="mb-5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] p-4 shadow-sm sm:mb-6">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[var(--theme-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <Database size={13} /> Storage used by this app
            </span>
            <span className="tabular-nums">
              {formatBytes(storageUsedBytes ?? 0)} of {formatBytes(storageQuotaBytes ?? 0)}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-[var(--theme-soft)]"
            role="progressbar"
            aria-valuenow={Math.round(quotaRatio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Storage used"
          >
            <div
              className={`h-full rounded-full transition-all ${quotaRatio > 0.9 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.max(2, quotaRatio * 100)}%` }}
            />
          </div>
          {quotaRatio > 0.9 && (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
              Storage is almost full. Remove some downloads to free up space.
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 rounded-2xl skeleton" />
          ))}
        </div>
      ) : downloads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-soft)]/50 px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--theme-surface-2)] shadow-sm">
            <HardDriveDownload size={26} className="text-[var(--theme-muted)]" />
          </div>
          <p className="text-sm font-medium text-[var(--theme-ink)]">No downloads yet</p>
          <p className="mx-auto mt-2 max-w-sm text-xs text-[var(--theme-muted)]">
            Tap the download icon on any track to save it here. Downloaded tracks play instantly and work without a connection.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            Browse the library
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:gap-3">
          {downloads.map((meta, index) => {
            const isCurrent = currentTrack?.id === meta.id
            const isThisPlaying = isCurrent && isPlaying
            return (
              <div
                key={meta.id}
                data-playing={isCurrent}
                className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                  isCurrent
                    ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                    : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] hover:border-emerald-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => (isCurrent ? togglePlay() : playFromList(tracks[index], tracks, index))}
                  aria-label={isThisPlaying ? `Pause ${meta.title}` : `Play ${meta.title}`}
                  className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition active:scale-95 ${
                    isCurrent
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400'
                  }`}
                >
                  {isThisPlaying ? (
                    <>
                      <span className="absolute inset-0 rounded-xl player-disc-ring" aria-hidden />
                      <Pause size={17} />
                    </>
                  ) : (
                    <Play size={17} className="ml-0.5" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[13px] font-semibold sm:text-sm ${isCurrent ? 'text-emerald-800 dark:text-emerald-200' : 'text-[var(--theme-ink)]'}`}>
                    {meta.title}
                  </p>
                  <p className="truncate text-[11px] text-[var(--theme-muted)] sm:text-xs">{meta.reciter}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--theme-muted)] sm:text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                      <CheckCircle2 size={10} /> Offline
                    </span>
                    {meta.duration != null && (
                      <span className="rounded-full bg-[var(--theme-soft)] px-2 py-0.5 tabular-nums">
                        {formatDuration(meta.duration)}
                      </span>
                    )}
                    <span className="rounded-full bg-[var(--theme-soft)] px-2 py-0.5 tabular-nums">
                      {formatBytes(sizeById[meta.id] ?? meta.size)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeDownload(meta.id)}
                  aria-label={`Remove download of ${meta.title}`}
                  title="Remove download"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] transition hover:border-rose-300 hover:text-rose-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
