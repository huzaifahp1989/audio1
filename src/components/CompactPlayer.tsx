import React, { useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward, Volume2, VolumeX, ListMusic, ChevronDown, ChevronUp } from 'lucide-react'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration } from '../lib/storage'
import type { AudioTrack } from '../types'

interface CompactPlayerProps {
  tracks: AudioTrack[]
  /** Kept for backwards compatibility; the active track is derived from context. */
  currentIndex?: number
  variant?: 'violet' | 'sky' | 'emerald'
}

const VARIANT_COLORS = {
  violet: { bg: 'bg-violet-600', ring: 'accent-violet-600', soft: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-300' },
  sky: { bg: 'bg-sky-600', ring: 'accent-sky-600', soft: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-300' },
  emerald: { bg: 'bg-emerald-600', ring: 'accent-emerald-600', soft: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300' },
}

export default function CompactPlayer({ tracks, variant = 'violet' }: CompactPlayerProps) {
  const {
    currentTrack, isPlaying, currentTime, duration, volume,
    togglePlay, seek, setVolume, playNext, playPrev, hasNext, hasPrev,
    playFromList,
  } = useAudioPlayer()

  const [listOpen, setListOpen] = useState(true)
  const progressRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const colors = VARIANT_COLORS[variant]
  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0
  const activeIndex = tracks.findIndex((t) => t.id === currentTrack?.id)

  // Keep the playing row visible inside the scrollable list.
  useEffect(() => {
    if (!listOpen || !listRef.current) return
    const active = listRef.current.querySelector<HTMLElement>('[data-playing="true"]')
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [listOpen, currentTrack?.id])

  const handleSeek = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    seek((percent / 100) * duration)
  }

  if (!currentTrack) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-lg">
      {/* Seek bar */}
      <div
        ref={progressRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        tabIndex={0}
        onClick={handleSeek}
        onTouchStart={handleSeek}
        className="group relative h-2 cursor-pointer touch-none bg-[var(--theme-soft)]"
      >
        <div className={`h-full ${colors.bg} transition-[width] duration-100`} style={{ width: `${progress}%` }} />
        <span
          className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ${colors.bg} opacity-0 shadow transition-opacity group-hover:opacity-100`}
          style={{ left: `calc(${progress}% - 0.375rem)` }}
          aria-hidden="true"
        />
      </div>

      <div className="flex items-center gap-2.5 p-3 sm:gap-3 sm:p-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colors.soft} text-xl sm:h-12 sm:w-12`}>
          <span aria-hidden="true">🎵</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--theme-ink)] sm:text-base">{currentTrack.title}</p>
          <p className="truncate text-xs text-[var(--theme-muted)]">
            {currentTrack.reciter}
            {activeIndex >= 0 && tracks.length > 1 ? ` · ${activeIndex + 1} of ${tracks.length}` : ''}
          </p>
        </div>

        <span className="shrink-0 text-[11px] tabular-nums text-[var(--theme-muted)] sm:text-xs">
          {formatDuration(currentTime)} / {duration ? formatDuration(duration) : '--:--'}
        </span>

        <button
          type="button"
          onClick={() => setListOpen((open) => !open)}
          aria-expanded={listOpen}
          aria-label={listOpen ? 'Hide track list' : 'Show track list'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--theme-muted)] transition hover:bg-[var(--theme-soft)] hover:text-[var(--theme-ink)]"
        >
          {listOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Transport row */}
      <div className="flex items-center gap-1 px-3 pb-3 sm:gap-2 sm:px-4">
        <button
          type="button"
          onClick={playPrev}
          disabled={!hasPrev}
          aria-label="Previous track"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--theme-ink)] transition hover:bg-[var(--theme-soft)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <SkipBack size={18} />
        </button>
        <button
          type="button"
          onClick={() => seek(Math.max(0, currentTime - 10))}
          aria-label="Rewind 10 seconds"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--theme-muted)] transition hover:bg-[var(--theme-soft)] hover:text-[var(--theme-ink)]"
        >
          <Rewind size={17} />
        </button>

        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={`flex h-11 w-11 items-center justify-center rounded-full ${colors.bg} text-white shadow-md transition active:scale-95`}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => seek(Math.min(duration || 0, currentTime + 10))}
          aria-label="Forward 10 seconds"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--theme-muted)] transition hover:bg-[var(--theme-soft)] hover:text-[var(--theme-ink)]"
        >
          <FastForward size={17} />
        </button>
        <button
          type="button"
          onClick={playNext}
          disabled={!hasNext}
          aria-label="Next track"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--theme-ink)] transition hover:bg-[var(--theme-soft)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <SkipForward size={18} />
        </button>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => setVolume(volume === 0 ? 1 : 0)}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--theme-muted)] transition hover:bg-[var(--theme-soft)] hover:text-[var(--theme-ink)]"
          >
            {volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            aria-label="Volume"
            onChange={(event) => setVolume(Number(event.target.value))}
            className={`h-1 w-20 cursor-pointer ${colors.ring}`}
          />
        </div>
      </div>

      {listOpen && (
        <div className="border-t border-[var(--theme-border)]">
          <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-[var(--theme-muted)] sm:px-4">
            <ListMusic size={13} className="mr-1 inline align-[-2px]" />
            {tracks.length} track{tracks.length === 1 ? '' : 's'} in this list
          </p>
          <div ref={listRef} className="max-h-56 overflow-y-auto overscroll-contain px-2 pb-2 sm:max-h-72 sm:px-3 sm:pb-3">
            {/* Vertical single column on phones, two columns from sm up */}
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-1.5">
              {tracks.map((track, index) => {
                const isCurrent = track.id === currentTrack.id
                return (
                  <button
                    key={track.id}
                    type="button"
                    data-playing={isCurrent}
                    onClick={() => playFromList(track, tracks, index)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                      isCurrent ? colors.soft : 'hover:bg-[var(--theme-soft)]'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums ${
                        isCurrent ? `${colors.bg} text-white` : 'bg-[var(--theme-soft)] text-[var(--theme-muted)]'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <span className="flex gap-0.5" aria-hidden="true">
                          <span className="h-3 w-0.5 animate-pulse bg-white" />
                          <span className="h-3 w-0.5 animate-pulse bg-white [animation-delay:120ms]" />
                          <span className="h-3 w-0.5 animate-pulse bg-white [animation-delay:240ms]" />
                        </span>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[13px] font-semibold ${isCurrent ? colors.text : 'text-[var(--theme-ink)]'}`}>
                        {track.title}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--theme-muted)]">{track.reciter}</span>
                    </span>
                    {track.duration ? (
                      <span className="shrink-0 text-[11px] tabular-nums text-[var(--theme-muted)]">
                        {formatDuration(track.duration)}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
