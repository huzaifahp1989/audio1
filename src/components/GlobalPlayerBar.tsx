import { Pause, Play, Square } from 'lucide-react'
import { useAudioPlayer } from '../context/AudioPlayerContext'

export default function GlobalPlayerBar() {
  const { currentTrack, isPlaying, togglePlay, stopTrack } = useAudioPlayer()

  if (!currentTrack) return null

  return (
    <aside
      className="sticky top-[7.5rem] z-20 mx-auto w-full max-w-5xl px-2 pt-2 sm:top-[8.25rem] sm:px-4 md:top-[4.5rem]"
      aria-label="Now playing"
    >
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/95 px-3 py-2 shadow-md backdrop-blur-sm sm:gap-3">
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
          <p className="truncate text-xs text-[var(--theme-muted)]">{currentTrack.reciter}</p>
        </div>
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--theme-ink)] hover:bg-[var(--theme-soft)]"
          aria-label={isPlaying ? 'Pause playback' : 'Resume playback'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          type="button"
          onClick={stopTrack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--theme-muted)] hover:bg-[var(--theme-soft)] hover:text-[var(--theme-ink)]"
          aria-label="Stop playback"
          title="Stop playback"
        >
          <Square size={16} />
        </button>
      </div>
    </aside>
  )
}