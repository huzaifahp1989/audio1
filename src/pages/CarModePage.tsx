import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration } from '../lib/storage'
import SeekBar from '../components/SeekBar'

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

const ctrlBtn =
  'flex items-center justify-center rounded-2xl bg-white/10 text-white transition-transform active:scale-95 touch-manipulation disabled:opacity-30 disabled:pointer-events-none'

export default function CarModePage() {
  const {
    currentTrack, isPlaying, currentTime, duration,
    togglePlay, seek, playNext, playPrev, hasNext, hasPrev,
    skipTracks, jumpToNextSponsored, hasNextSponsored,
    playbackRate, setPlaybackRate,
  } = useAudioPlayer()

  const skipBack = () => seek(Math.max(0, currentTime - 15))
  const skipFwd = () => seek(Math.min(duration, currentTime + 15))

  if (!currentTrack) {
    return (
      <div className="car-mode-screen flex min-h-dvh flex-col items-center justify-center px-6 text-center select-none">
        <p className="text-xl sm:text-2xl font-semibold text-white/80">Nothing playing</p>
        <p className="mt-2 text-sm text-white/50 max-w-xs">Start a track from the library, then open car mode.</p>
        <Link
          to="/"
          className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-emerald-500 px-8 py-3 text-lg font-bold text-white shadow-lg active:scale-95 touch-manipulation"
        >
          Browse library
        </Link>
      </div>
    )
  }

  return (
    <div className="car-mode-screen flex min-h-dvh flex-col select-none">
      {/* Top bar */}
      <header className="car-mode-safe-top flex shrink-0 items-center justify-between px-4 pb-2">
        <Link
          to="/"
          className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-semibold text-white active:scale-95 touch-manipulation"
          aria-label="Exit car mode"
        >
          <X size={20} />
          Exit
        </Link>
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-400/90">Car mode</span>
        <div className="w-[48px]" aria-hidden />
      </header>

      {/* Track info — grows on tall screens, stays compact on short phones */}
      <div className="flex flex-1 flex-col justify-center px-4 sm:px-6 min-h-0">
        <div className="mx-auto w-full max-w-md text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">Now playing</p>
          <h1 className="mt-2 line-clamp-4 text-2xl sm:text-3xl font-bold leading-tight text-white">
            {currentTrack.title}
          </h1>
          <p className="mt-2 line-clamp-2 text-base sm:text-lg text-white/65">{currentTrack.reciter}</p>
        </div>

        {/* Progress */}
        <div className="mx-auto mt-6 w-full max-w-md px-1">
          <SeekBar
            currentTime={currentTime}
            duration={duration}
            onSeek={seek}
            variant="emerald"
            size="lg"
            showTimes={false}
            className="car-mode-seek"
          />
          <p className="mt-3 text-center text-lg sm:text-xl font-semibold tabular-nums text-white/80">
            {formatDuration(currentTime)}
            <span className="mx-2 text-white/35">/</span>
            {formatDuration(duration)}
          </p>
        </div>

        {/* Primary controls — fits narrow phones */}
        <div className="mx-auto mt-6 w-full max-w-md">
          <div className="grid grid-cols-3 items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={skipBack}
              className={`${ctrlBtn} col-start-1 h-14 sm:h-16 flex-col gap-0.5 text-xs font-semibold`}
              aria-label="Back 15 seconds"
            >
              <ChevronLeft size={28} className="sm:hidden" />
              <ChevronLeft size={32} className="hidden sm:block" />
              <span className="text-[10px] sm:text-xs text-white/70">15s</span>
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="col-start-2 mx-auto flex h-[72px] w-[72px] sm:h-24 sm:w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-[0_8px_32px_rgba(52,211,153,0.45)] active:scale-95 touch-manipulation"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={36} className="sm:w-10 sm:h-10" /> : <Play size={36} className="ml-1 sm:w-10 sm:h-10" />}
            </button>

            <button
              type="button"
              onClick={skipFwd}
              className={`${ctrlBtn} col-start-3 h-14 sm:h-16 flex-col gap-0.5 text-xs font-semibold`}
              aria-label="Forward 15 seconds"
            >
              <ChevronRight size={28} className="sm:hidden" />
              <ChevronRight size={32} className="hidden sm:block" />
              <span className="text-[10px] sm:text-xs text-white/70">15s</span>
            </button>
          </div>

          {/* Prev / next — second row, wide tap targets */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={playPrev}
              disabled={!hasPrev}
              className={`${ctrlBtn} h-14 sm:h-16 gap-2 text-sm font-semibold`}
              aria-label="Previous track"
            >
              <SkipBack size={22} />
              Previous
            </button>
            <button
              type="button"
              onClick={playNext}
              disabled={!hasNext}
              className={`${ctrlBtn} h-14 sm:h-16 gap-2 text-sm font-semibold`}
              aria-label="Next track"
            >
              Next
              <SkipForward size={22} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => skipTracks(3)}
              disabled={!hasNext}
              className={`${ctrlBtn} h-12 gap-2 text-sm font-semibold`}
              aria-label="Jump ahead 3 tracks"
            >
              <SkipForward size={18} />
              Next 3
            </button>
            <button
              type="button"
              onClick={jumpToNextSponsored}
              disabled={!hasNextSponsored}
              className={`${ctrlBtn} h-12 gap-2 text-sm font-semibold`}
              aria-label="Jump to next ad break"
            >
              Ads
            </button>
          </div>
        </div>
      </div>

      {/* Speed — horizontal scroll on small screens */}
      <footer className="car-mode-safe-bottom shrink-0 px-4 pt-4 pb-2">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Speed</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide justify-start sm:justify-center">
          {SPEEDS.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setPlaybackRate(rate)}
              className={`shrink-0 min-h-[48px] min-w-[56px] rounded-xl px-4 text-base font-bold transition-transform active:scale-95 touch-manipulation ${
                playbackRate === rate
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                  : 'bg-white/10 text-white/80'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </footer>
    </div>
  )
}
