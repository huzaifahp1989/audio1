import React from 'react'
import { Play, Pause, Eye, List, Mic2 } from 'lucide-react'
import type { AudioTrack } from '../types'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration } from '../lib/storage'
import { formatViews } from '../lib/views'
import { TALKS_TOPICS } from '../constants/categories'
import FavoriteButton from './FavoriteButton'
import VoteButton from './VoteButton'
import ShareButton from './ShareButton'
import InlinePlayerPanel from './InlinePlayerPanel'
import RelatedTracks from './RelatedTracks'
import ReactionBar from './ReactionBar'

interface TalkTrackRowProps {
  track: AudioTrack
  tracks: AudioTrack[]
  index: number
}

function topicLabel(topicId?: string) {
  if (!topicId) return null
  const topic = TALKS_TOPICS.find((t) => t.id === topicId)
  return topic ? `${topic.emoji} ${topic.label}` : topicId
}

export default function TalkTrackRow({ track, tracks, index }: TalkTrackRowProps) {
  const { currentTrack, isPlaying, playFromList, togglePlay, addTrackToPlaylist, playlist } = useAudioPlayer()
  const isActive = currentTrack?.id === track.id
  const isInPlaylist = playlist.some((item) => item.id === track.id)
  const topic = topicLabel(track.topic)

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isActive) togglePlay()
    else playFromList(track, tracks, index)
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border transition-all duration-300 ${
        isActive
          ? 'border-sky-300/90 dark:border-sky-500/40 bg-[var(--theme-surface-2)] shadow-lg shadow-sky-500/10 ring-1 ring-sky-200/80 dark:ring-sky-500/25'
          : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] hover:border-sky-200/80 hover:shadow-md'
      }`}
    >
      {isActive && (
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-500 to-cyan-500" aria-hidden />
      )}

      <div className="flex items-center gap-3 p-3 sm:p-4 pl-4 sm:pl-5">
        {/* Art / play disc */}
        <button
          type="button"
          onClick={handlePlayPause}
          className={`relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl transition-all active:scale-95 ${
            isActive
              ? 'bg-gradient-to-br from-sky-600 to-cyan-600 text-white shadow-lg shadow-sky-500/30'
              : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20'
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
            <p className={`line-clamp-2 text-sm sm:text-base font-semibold leading-snug ${isActive ? 'text-sky-800 dark:text-sky-200' : 'text-[var(--theme-ink)]'}`}>
              {track.title}
            </p>
            {isActive && (
              <span className="mt-0.5 shrink-0 inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                <Mic2 size={10} />
                Live
              </span>
            )}
          </div>
          <p className="truncate text-xs sm:text-sm text-[var(--theme-muted)] mt-0.5">{track.reciter}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--theme-muted)]">
            {topic && (
              <span className="rounded-full bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 px-2 py-0.5 text-sky-700 dark:text-sky-300">{topic}</span>
            )}
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
          <VoteButton track={track} variant="talks" />
          <FavoriteButton track={track} variant="talks" />
          <div className="hidden sm:flex items-center gap-2">
            <ShareButton track={track} />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); addTrackToPlaylist(track) }}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                isInPlaylist
                  ? 'border-sky-200 bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300'
                  : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-sky-300 hover:text-sky-700'
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
          <InlinePlayerPanel variant="sky" tracks={tracks} index={index} compact />
          <ReactionBar trackId={track.id} />
          <RelatedTracks track={track} limit={4} />
        </div>
      )}
    </div>
  )
}
