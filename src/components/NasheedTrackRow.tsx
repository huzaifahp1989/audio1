import React from 'react'
import { Play, Pause, Eye, List, Music2 } from 'lucide-react'
import type { AudioTrack } from '../types'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration } from '../lib/storage'
import { formatViews } from '../lib/views'
import FavoriteButton from './FavoriteButton'
import VoteButton from './VoteButton'
import ShareButton from './ShareButton'
import DownloadButton from './DownloadButton'
import InlinePlayerPanel from './InlinePlayerPanel'
import RelatedTracks from './RelatedTracks'
import ReactionBar from './ReactionBar'

interface NasheedTrackRowProps {
  track: AudioTrack
  tracks: AudioTrack[]
  index: number
}

export default function NasheedTrackRow({ track, tracks, index }: NasheedTrackRowProps) {
  const { currentTrack, isPlaying, playFromList, togglePlay, addTrackToPlaylist, playlist } = useAudioPlayer()
  const isActive = currentTrack?.id === track.id
  const isInPlaylist = playlist.some((item) => item.id === track.id)

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isActive) togglePlay()
    else playFromList(track, tracks, index)
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border transition-all duration-300 ${
        isActive
          ? 'border-violet-300/90 dark:border-violet-500/40 bg-[var(--theme-surface-2)] shadow-lg shadow-violet-500/10 ring-1 ring-violet-200/80 dark:ring-violet-500/25'
          : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] hover:border-violet-200/80 hover:shadow-md'
      }`}
    >
      {isActive && (
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-500 to-indigo-500" aria-hidden />
      )}

      <div className="flex items-center gap-3 p-3 sm:p-4 pl-4 sm:pl-5">
        <button
          type="button"
          onClick={handlePlayPause}
          className={`relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl transition-all active:scale-95 ${
            isActive
              ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30'
              : 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20'
          }`}
          aria-label={isActive && isPlaying ? 'Pause' : 'Play'}
        >
          {isActive && isPlaying ? (
            <>
              <span className="absolute inset-0 rounded-2xl player-disc-ring" aria-hidden />
              <Pause size={22} />
            </>
          ) : (
            <Play size={22} className="ml-0.5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className={`line-clamp-2 text-sm sm:text-base font-semibold leading-snug ${isActive ? 'text-violet-800 dark:text-violet-200' : 'text-[var(--theme-ink)]'}`}>
              {track.title}
            </p>
            {isActive && (
              <span className="mt-0.5 shrink-0 inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                <Music2 size={10} />
                Live
              </span>
            )}
          </div>
          <p className="truncate text-xs sm:text-sm text-[var(--theme-muted)] mt-0.5">{track.reciter}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--theme-muted)]">
            {track.duration !== undefined && (
              <span className="rounded-full bg-[var(--theme-soft)] px-2 py-0.5 tabular-nums">{formatDuration(track.duration)}</span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--theme-soft)] px-2 py-0.5">
              <Eye size={10} />
              {formatViews(track.views)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <VoteButton track={track} variant="nasheeds" />
          <FavoriteButton track={track} variant="nasheeds" />
          <DownloadButton track={track} />
          <div className="hidden sm:flex items-center gap-2">
            <ShareButton track={track} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); addTrackToPlaylist(track) }}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                isInPlaylist
                  ? 'border-violet-200 bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300'
                  : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-violet-300 hover:text-violet-700'
              }`}
              aria-label="Add to playlist"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {isActive && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-3">
          <InlinePlayerPanel variant="violet" tracks={tracks} index={index} compact />
          <ReactionBar trackId={track.id} />
          <RelatedTracks track={track} limit={4} />
        </div>
      )}
    </div>
  )
}
