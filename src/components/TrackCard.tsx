import React from 'react'
<<<<<<< HEAD
import { Play, Pause, Eye, List } from 'lucide-react'
import type { AudioTrack } from '../types'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration, formatUploadDate } from '../lib/storage'
import { formatViews } from '../lib/views'
import ShareButton from './ShareButton'
import InlinePlayerPanel from './InlinePlayerPanel'
=======
import { Play, Pause, Music, SkipBack, SkipForward, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import type { AudioTrack } from '../types'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration, formatFileSize, formatViews } from '../lib/storage'
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3

interface TrackCardProps {
  track: AudioTrack
  tracks: AudioTrack[]
  index: number
}

export default function TrackCard({ track, tracks, index }: TrackCardProps) {
  const { currentTrack, isPlaying, playFromList, togglePlay, addTrackToPlaylist, playlist } = useAudioPlayer()
  const isActive = currentTrack?.id === track.id
<<<<<<< HEAD
  const displayTrack = isActive && currentTrack ? currentTrack : track
  const isAddedToPlaylist = playlist.some((item) => item.id === track.id)
=======
  const views = track.views ?? 0
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isActive) togglePlay()
    else playFromList(track, tracks, index)
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 ${
        isActive
          ? 'border-emerald-300/90 dark:border-emerald-500/40 bg-[var(--theme-surface-2)] shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-200/80 dark:ring-emerald-500/25'
          : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] shadow-sm hover:-translate-y-0.5 hover:shadow-md'
      }`}
      onClick={() => playFromList(track, tracks, index)}
    >
      {isActive && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" aria-hidden />
      )}

      <div className="p-3.5 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:block sm:w-auto">
            <button
              type="button"
              onClick={handlePlayPause}
              className={`relative flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl transition-all active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
              }`}
              aria-label={isActive && isPlaying ? 'Pause track' : 'Play track'}
            >
              {isActive && isPlaying ? (
                <>
                  <span className="absolute inset-0 rounded-2xl player-disc-ring" aria-hidden />
                  <Pause size={20} className="sm:size-6" />
                </>
              ) : (
                <Play size={20} className="sm:size-6 ml-0.5" />
              )}
            </button>

            <div className="sm:hidden min-w-0">
              <p className="text-[10px] leading-tight text-[var(--theme-muted)] truncate">{displayTrack.reciter}</p>
              {!isActive && (
                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addTrackToPlaylist(track) }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-semibold transition ${
                      isAddedToPlaylist
                        ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-emerald-300 hover:text-emerald-700'
                    }`}
                  >
                    <List size={12} />
                    {isAddedToPlaylist ? 'Added' : 'Playlist'}
                  </button>
                  <ShareButton track={track} className="h-8 w-8 !p-1.5" />
                </div>
              )}
              {isActive && (
                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addTrackToPlaylist(track) }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-semibold transition ${
                      isAddedToPlaylist
                        ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)]'
                    }`}
                  >
                    <List size={12} />
                    {isAddedToPlaylist ? 'In playlist' : 'Playlist'}
                  </button>
                  <ShareButton track={track} className="h-8 w-8 !p-1.5" />
                </div>
              )}
            </div>
          </div>

<<<<<<< HEAD
          <div className="min-w-0 flex-1 w-full">
            <div className="flex flex-col-reverse items-start gap-1">
              {isActive && (
                <span className="shrink-0 self-start rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Playing
                </span>
              )}
              <h3 className={`w-full text-[13px] leading-snug sm:text-sm font-semibold break-words whitespace-normal hyphens-auto ${isActive ? 'text-emerald-800 dark:text-emerald-200' : 'text-[var(--theme-ink)]'}`}>
                {displayTrack.title}
              </h3>
            </div>
            <p className="hidden sm:block text-[11px] leading-tight sm:text-xs text-[var(--theme-muted)] mt-1 break-words whitespace-normal">{displayTrack.reciter}</p>
            <div className="mt-2.5 sm:mt-3 flex flex-wrap gap-1.5 text-[10px] sm:text-[11px] text-[var(--theme-muted)]">
              {displayTrack.duration !== undefined && (
                <span className="rounded-full bg-[var(--theme-soft)] px-2 py-1 sm:px-2.5 sm:py-1 tabular-nums">{formatDuration(displayTrack.duration)}</span>
              )}
              <span className="rounded-full bg-[var(--theme-soft)] px-2 py-1 sm:px-2.5 sm:py-1 flex items-center gap-1">
                <Eye size={10} />
                {formatViews(displayTrack.views)}
              </span>
              <span className="rounded-full bg-[var(--theme-soft)] px-2 py-1 sm:px-2.5 sm:py-1">{formatUploadDate(displayTrack.uploadedAt)}</span>
            </div>
            <div className="hidden sm:block">
              {!isActive && (
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addTrackToPlaylist(track) }}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                      isAddedToPlaylist
                        ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-emerald-300 hover:text-emerald-700'
                    }`}
                  >
                    <List size={14} />
                    {isAddedToPlaylist ? 'Added' : 'Add to playlist'}
                  </button>
                  <ShareButton track={track} className="h-9 w-9" />
                </div>
=======
          {/* Info */}
          <div className="min-w-0 flex-1">
            <h3
              dir={/[\u0600-\u06FF]/.test(track.title) ? 'rtl' : 'ltr'}
              className={`font-semibold text-sm leading-tight truncate ${
                isActive ? 'text-violet-700' : 'text-slate-800'
              }`}
            >
              {track.title}
            </h3>
            <p
              dir={/[\u0600-\u06FF]/.test(track.reciter || '') ? 'rtl' : 'ltr'}
              className="text-xs text-slate-500 mt-0.5 truncate"
            >
              {track.reciter}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {(() => {
                const lang = (track.language || track.topic || '').toLowerCase()
                if (lang === 'arabic') return <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">Arabic</span>
                if (lang === 'english') return <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">English</span>
                if (lang === 'urdu') return <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">Urdu</span>
                return null
              })()}
              {(track.category === 'kids-nasheeds' || track.category === 'kids-quran' || track.category === 'kids-stories') && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-100">
                  Kids
                </span>
              )}
              <span
                className="inline-flex items-center gap-1 text-xs text-slate-500 tabular-nums"
                title={`${views} view${views === 1 ? '' : 's'}`}
              >
                <Eye size={12} className="text-slate-400" />
                {formatViews(views)}
              </span>
              {track.duration !== undefined && (
                <span className="text-xs text-slate-400 tabular-nums">{formatDuration(track.duration)}</span>
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
              )}
            </div>
          </div>
        </div>

        {isActive && (
          <div className="mt-4 space-y-3">
            <InlinePlayerPanel variant="emerald" tracks={tracks} index={index} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); addTrackToPlaylist(track) }}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  isAddedToPlaylist
                    ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)]'
                }`}
              >
                <List size={14} />
                {isAddedToPlaylist ? 'In playlist' : 'Add to playlist'}
              </button>
              <ShareButton track={track} className="h-9 w-9" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
