import { useState } from 'react'
import { Pause, Play, SkipBack, SkipForward, Square, ListMusic, ChevronDown, HardDriveDownload } from 'lucide-react'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration } from '../lib/storage'

export default function GlobalPlayerBar() {
  const {
    currentTrack, isPlaying, currentTime, duration,
    playNext, playPrev, hasNext, hasPrev,
    togglePlay, stopTrack, playlist, playlistIndex, playFromList,
    isCurrentOffline,
  } = useAudioPlayer()

  const [queueOpen, setQueueOpen] = useState(false)

  if (!currentTrack) return null

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0

  return (
    <aside
      className="sticky top-[7.5rem] z-20 mx-auto w-full max-w-5xl px-2 pt-2 sm:top-[8.25rem] sm:px-4 md:top-[4.5rem]"
      aria-label="Now playing"
    >
      <div className="relative">
        <div className="overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/95 shadow-md backdrop-blur-sm">
          {/* Progress line */}
          <div className="h-1 bg-[var(--theme-soft)]" aria-hidden="true">
            <div className="h-full bg-emerald-500 transition-[width] duration-150" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex min-w-0 items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-3">
            <button
              type="button"
              onClick={playPrev}
              disabled={!hasPrev}
              aria-label="Previous track"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--theme-ink)] transition hover:bg-[var(--theme-soft)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <SkipBack size={16} />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause playback' : 'Resume playback'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition active:scale-95"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={playNext}
              disabled={!hasNext}
              aria-label="Next track"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--theme-ink)] transition hover:bg-[var(--theme-soft)] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <SkipForward size={16} />
            </button>

            <div className="min-w-0 flex-1">
              <p className="overflow-hidden text-sm font-bold text-[var(--theme-ink)]">
                <span className="sr-only">{currentTrack.title}</span>
                <span className="now-playing-marquee" aria-hidden="true">
                  <span className={`now-playing-marquee-track${isPlaying ? ' is-playing' : ''}`}>
                    <span>{currentTrack.title}</span>
                    <span>{currentTrack.title}</span>
                  </span>
                </span>
              </p>
              <p className="flex items-center gap-1.5 truncate text-xs text-[var(--theme-muted)]">
                {isCurrentOffline && (
                  <span
                    title="Playing from a downloaded copy"
                    className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                  >
                    <HardDriveDownload size={9} /> Offline
                  </span>
                )}
                <span className="truncate">
                  {currentTrack.reciter}
                  {duration ? ` · ${formatDuration(currentTime)} / ${formatDuration(duration)}` : ''}
                </span>
              </p>
            </div>

            {playlist.length > 1 && (
              <button
                type="button"
                onClick={() => setQueueOpen((open) => !open)}
                aria-expanded={queueOpen}
                aria-label={queueOpen ? 'Hide queue' : 'Show queue'}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--theme-muted)] transition hover:bg-[var(--theme-soft)] hover:text-[var(--theme-ink)]"
              >
                {queueOpen ? <ChevronDown size={18} /> : <ListMusic size={18} />}
              </button>
            )}

            <button
              type="button"
              onClick={stopTrack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--theme-muted)] transition hover:bg-[var(--theme-soft)] hover:text-[var(--theme-ink)]"
              aria-label="Stop playback"
              title="Stop playback"
            >
              <Square size={15} />
            </button>
          </div>
        </div>

        {/* Queue dropdown — floats so it never pushes the page around */}
        {queueOpen && playlist.length > 1 && (
          <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-1.5 shadow-xl sm:max-h-80 sm:p-2">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {playlist.map((track, index) => {
                const isCurrent = index === playlistIndex
                return (
                  <button
                    key={`${track.id}-${index}`}
                    type="button"
                    onClick={() => playFromList(track, playlist, index)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                      isCurrent ? 'bg-emerald-500/10' : 'hover:bg-[var(--theme-soft)]'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums ${
                        isCurrent ? 'bg-emerald-600 text-white' : 'bg-[var(--theme-soft)] text-[var(--theme-muted)]'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[13px] font-semibold ${isCurrent ? 'text-emerald-700 dark:text-emerald-300' : 'text-[var(--theme-ink)]'}`}>
                        {track.title}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--theme-muted)]">{track.reciter}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
