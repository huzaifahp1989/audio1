import React from 'react'
import { Check, Download, Loader2, Trash2 } from 'lucide-react'
import type { AudioTrack } from '../types'
import { useOfflineDownloads } from '../context/OfflineDownloadsContext'

interface DownloadButtonProps {
  track: AudioTrack
  /** `icon` is the compact square used in track rows, `pill` shows a label. */
  variant?: 'icon' | 'pill'
  size?: number
  className?: string
}

export default function DownloadButton({
  track,
  variant = 'icon',
  size = 16,
  className = '',
}: DownloadButtonProps) {
  const { isDownloaded, isDownloading, downloadTrack, removeDownload, progress } = useOfflineDownloads()

  const downloaded = isDownloaded(track.id)
  const downloading = isDownloading(track.id)
  const ratio = progress[track.id]

  const handleClick = async (event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    if (downloading) return
    if (downloaded) {
      await removeDownload(track.id)
      return
    }
    await downloadTrack(track)
  }

  const percentLabel = ratio != null ? `${Math.round(ratio * 100)}%` : ''
  const title = downloading
    ? ratio != null
      ? `Downloading ${percentLabel}`
      : 'Downloading…'
    : downloaded
      ? 'Remove download'
      : 'Download for offline'

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={downloading}
        title={title}
        aria-label={title}
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
          downloaded
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
            : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-emerald-300 hover:text-emerald-700'
        } ${downloading ? 'cursor-wait opacity-80' : ''} ${className}`}
      >
        {downloading ? (
          <>
            <Loader2 size={size} className="animate-spin" />
            {ratio != null ? `Downloading ${percentLabel}` : 'Downloading…'}
          </>
        ) : downloaded ? (
          <>
            <Check size={size} />
            Saved offline
          </>
        ) : (
          <>
            <Download size={size} />
            Download
          </>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={downloading}
      title={title}
      aria-label={title}
      className={`group/download relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
        downloaded
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400'
          : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-emerald-300 hover:text-emerald-700'
      } ${downloading ? 'cursor-wait' : ''} ${className}`}
    >
      {downloading ? (
        <>
          <Loader2 size={size} className="animate-spin" />
          {ratio != null && (
            <span className="absolute -bottom-1 -right-1 rounded-full bg-emerald-600 px-1 text-[9px] font-bold leading-4 text-white tabular-nums">
              {Math.round(ratio * 100)}
            </span>
          )}
        </>
      ) : downloaded ? (
        <>
          <Check size={size} className="group-hover/download:hidden" />
          <Trash2 size={size} className="hidden text-rose-500 group-hover/download:block" />
        </>
      ) : (
        <Download size={size} />
      )}
    </button>
  )
}
