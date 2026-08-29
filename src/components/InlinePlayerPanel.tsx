import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight,
  Volume2, VolumeX, Moon, Gauge, Car,
} from 'lucide-react'
import type { AudioTrack } from '../types'
import { useAudioPlayer, type SleepTimerOption } from '../context/AudioPlayerContext'
import { formatDuration } from '../lib/storage'
import SeekBar from './SeekBar'
import TrackBookmarkButton from './TrackBookmarkButton'

export type PlayerVariant = 'violet' | 'sky' | 'emerald'

interface InlinePlayerPanelProps {
  variant?: PlayerVariant
  tracks?: AudioTrack[]
  index?: number
  trackId?: string
  compact?: boolean
  className?: string
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const
const SLEEP_OPTIONS: { value: SleepTimerOption; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '60 min' },
  { value: 'end', label: 'End of track' },
]

const variantStyles: Record<PlayerVariant, {
  panel: string
  playBtn: string
  ctrl: string
  ctrlActive: string
  chip: string
  accent: string
}> = {
  violet: {
    panel: 'border-violet-200/80 dark:border-violet-500/25 bg-gradient-to-br from-violet-50/90 via-white/80 to-indigo-50/70 dark:from-violet-950/40 dark:via-[var(--theme-surface-2)] dark:to-indigo-950/30',
    playBtn: 'bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25',
    ctrl: 'hover:bg-violet-100/80 dark:hover:bg-violet-500/15 hover:text-violet-700 dark:hover:text-violet-300',
    ctrlActive: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300',
    chip: 'bg-violet-100/80 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-200/60 dark:border-violet-500/25',
    accent: 'from-violet-500 to-indigo-500',
  },
  sky: {
    panel: 'border-sky-200/80 dark:border-sky-500/25 bg-gradient-to-br from-sky-50/90 via-white/80 to-cyan-50/70 dark:from-sky-950/40 dark:via-[var(--theme-surface-2)] dark:to-cyan-950/30',
    playBtn: 'bg-gradient-to-br from-sky-600 to-cyan-600 shadow-lg shadow-sky-500/25',
    ctrl: 'hover:bg-sky-100/80 dark:hover:bg-sky-500/15 hover:text-sky-700 dark:hover:text-sky-300',
    ctrlActive: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300',
    chip: 'bg-sky-100/80 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-500/25',
    accent: 'from-sky-500 to-cyan-500',
  },
  emerald: {
    panel: 'border-emerald-200/80 dark:border-emerald-500/25 bg-gradient-to-br from-emerald-50/90 via-white/80 to-teal-50/70 dark:from-emerald-950/40 dark:via-[var(--theme-surface-2)] dark:to-teal-950/30',
    playBtn: 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/25',
    ctrl: 'hover:bg-emerald-100/80 dark:hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:text-emerald-300',
    ctrlActive: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    chip: 'bg-emerald-100/80 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-500/25',
    accent: 'from-emerald-500 to-teal-500',
  },
}

function EqualizerBars({ playing, variant }: { playing: boolean; variant: PlayerVariant }) {
  const barClass = {
    violet: 'bg-violet-500',
    sky: 'bg-sky-500',
    emerald: 'bg-emerald-500',
  }[variant]

  return (
    <div className={`player-eq flex h-4 items-end gap-0.5 ${playing ? '' : 'opacity-40'}`} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-0.5 rounded-full ${barClass} ${playing ? 'player-eq-bar' : ''}`}
          style={playing ? { animationDelay: `${i * 0.12}s` } : { height: '4px' }}
        />
      ))}
    </div>
  )
}

export default function InlinePlayerPanel({
  variant = 'violet',
  tracks,
  index = 0,
  trackId,
  compact = false,
  className = '',
}: InlinePlayerPanelProps) {
  const {
    currentTrack, isPlaying, currentTime, duration, togglePlay, seek,
    playNext, playPrev, hasNext, hasPrev, playFromList,
    skipTracks, jumpToNextSponsored, hasNextSponsored,
    playlist, playlistIndex,
    audioError,
    volume, setVolume, playbackRate, setPlaybackRate,
    sleepTimer, setSleepTimer, sleepEndsAt,
  } = useAudioPlayer()

  const [sleepOpen, setSleepOpen] = useState(false)
  const sleepRef = useRef<HTMLDivElement>(null)
  const v = variantStyles[variant]
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const activeTrackId = trackId ?? currentTrack?.id ?? ''

  useEffect(() => {
    if (!sleepOpen) return
    const close = (e: MouseEvent) => {
      if (sleepRef.current && !sleepRef.current.contains(e.target as Node)) setSleepOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [sleepOpen])

  const skipBack = () => seek(Math.max(0, currentTime - 10))
  const skipFwd = () => seek(Math.min(duration, currentTime + 10))

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(playbackRate as typeof SPEEDS[number])
    const next = SPEEDS[(idx + 1) % SPEEDS.length]
    setPlaybackRate(next)
  }

  const canListPrev = !!(tracks && index > 0)
  const canListNext = !!(tracks && index < tracks.length - 1)

  const handlePrev = () => {
    if (hasPrev) playPrev()
    else if (canListPrev && tracks) playFromList(tracks[index - 1], tracks, index - 1)
  }

  const handleNext = () => {
    if (hasNext) playNext()
    else if (canListNext && tracks) playFromList(tracks[index + 1], tracks, index + 1)
  }

  const ctrlBase =
    'flex items-center justify-center rounded-xl text-[var(--theme-muted)] transition-all active:scale-95 disabled:opacity-35 disabled:pointer-events-none'

  const sleepLabel = sleepTimer
    ? sleepTimer === 'end'
      ? 'End'
      : sleepEndsAt
        ? `${Math.max(1, Math.ceil((sleepEndsAt - Date.now()) / 60000))}m`
        : `${sleepTimer}m`
    : null

  const nextSponsoredMeta = React.useMemo(() => {
    const nextSponsoredIndex = playlist.findIndex((track, idx) => idx > playlistIndex && track.isSponsored)
    if (nextSponsoredIndex === -1) return null
    const tracksUntilAd = playlist
      .slice(playlistIndex + 1, nextSponsoredIndex)
      .filter((track) => !track.isSponsored)
      .length
    return {
      title: playlist[nextSponsoredIndex]?.title || 'Sponsored break',
      tracksUntilAd,
    }
  }, [playlist, playlistIndex])

  return (
    <div
      className={`player-panel rounded-xl border backdrop-blur-sm ${v.panel} ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3 sm:p-4 space-y-3">
        {nextSponsoredMeta && (
          <div className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs sm:text-sm ${v.chip}`}>
            <div className="min-w-0">
              <p className="font-semibold">Ads coming up after {nextSponsoredMeta.tracksUntilAd} track{nextSponsoredMeta.tracksUntilAd === 1 ? '' : 's'}</p>
              <p className="truncate text-[10px] sm:text-xs opacity-80">{nextSponsoredMeta.title}</p>
            </div>
            <button
              type="button"
              onClick={jumpToNextSponsored}
              className="shrink-0 rounded-lg border border-current/20 px-2 py-1 text-[10px] sm:text-xs font-semibold transition hover:bg-white/40 dark:hover:bg-white/10"
            >
              View ad
            </button>
          </div>
        )}

        {audioError && currentTrack && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-700">
            {audioError}
          </div>
        )}

        {/* Progress */}
        <SeekBar
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
          variant={variant}
          size={compact ? 'md' : 'lg'}
          showTimes={false}
        />

        {/* Time row */}
        <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs tabular-nums text-[var(--theme-muted)]">
          <span className="font-medium">{formatDuration(currentTime)}</span>
          <div className="flex items-center gap-2">
            <EqualizerBars playing={isPlaying} variant={variant} />
            <span className={`hidden sm:inline rounded-full border px-2 py-0.5 text-[10px] font-semibold ${v.chip}`}>
              {Math.round(progress)}%
            </span>
          </div>
          <span>{formatDuration(duration)}</span>
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          {!compact && (
            <button
              type="button"
              onClick={handlePrev}
              disabled={!hasPrev && !canListPrev}
              className={`${ctrlBase} h-9 w-9 sm:h-10 sm:w-10 ${v.ctrl}`}
              title="Previous"
              aria-label="Previous track"
            >
              <SkipBack size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={skipBack}
            className={`${ctrlBase} h-9 w-9 sm:h-10 sm:w-10 ${v.ctrl}`}
            title="Back 10 seconds"
            aria-label="Back 10 seconds"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full text-white transition-transform active:scale-95 ${v.playBtn} ${isPlaying ? 'pulse-ring' : ''}`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={skipFwd}
            className={`${ctrlBase} h-9 w-9 sm:h-10 sm:w-10 ${v.ctrl}`}
            title="Forward 10 seconds"
            aria-label="Forward 10 seconds"
          >
            <ChevronRight size={18} />
          </button>

          {!compact && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasNext && !canListNext}
              className={`${ctrlBase} h-9 w-9 sm:h-10 sm:w-10 ${v.ctrl}`}
              title="Next"
              aria-label="Next track"
            >
              <SkipForward size={16} />
            </button>
          )}
        </div>

        {/* Secondary controls */}
        {!compact && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-[var(--theme-border)]/60">
            <button
              type="button"
              onClick={cycleSpeed}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${playbackRate !== 1 ? v.chip : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-[var(--theme-brand)]/30'}`}
              title="Playback speed"
            >
              <Gauge size={13} />
              {playbackRate}x
            </button>

            <button
              type="button"
              onClick={() => skipTracks(3)}
              disabled={!hasNext}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${v.ctrl} border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)]`}
              title="Jump ahead 3 tracks"
            >
              <SkipForward size={13} />
              Next 3
            </button>

            <button
              type="button"
              onClick={jumpToNextSponsored}
              disabled={!hasNextSponsored}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${hasNextSponsored ? v.chip : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)]'}`}
              title="Jump to next ad break"
            >
              Ads
            </button>

            <div className="relative" ref={sleepRef}>
              <button
                type="button"
                onClick={() => setSleepOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${sleepTimer ? v.chip : 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-[var(--theme-brand)]/30'}`}
                title="Sleep timer"
              >
                <Moon size={13} />
                {sleepLabel || 'Sleep'}
              </button>
              {sleepOpen && (
                <div className="absolute bottom-full left-1/2 z-20 mb-2 w-36 -translate-x-1/2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] py-1 shadow-xl">
                  {SLEEP_OPTIONS.map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => {
                        setSleepTimer(sleepTimer === opt.value ? null : opt.value)
                        setSleepOpen(false)
                      }}
                      className={`block w-full px-3 py-2 text-left text-xs transition hover:bg-[var(--theme-soft)] ${sleepTimer === opt.value ? 'font-semibold text-[var(--theme-brand)]' : 'text-[var(--theme-ink)]'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  {sleepTimer && (
                    <button
                      type="button"
                      onClick={() => { setSleepTimer(null); setSleepOpen(false) }}
                      className="block w-full border-t border-[var(--theme-border)] px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      Cancel timer
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => setVolume(volume > 0 ? 0 : 1)}
                className="text-[var(--theme-muted)] hover:text-[var(--theme-ink)]"
                aria-label={volume > 0 ? 'Mute' : 'Unmute'}
              >
                {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="player-volume w-20"
                aria-label="Volume"
              />
            </div>

            {activeTrackId && (
              <TrackBookmarkButton trackId={activeTrackId} currentTime={currentTime} onSeek={seek} variant={variant} />
            )}

            <Link to="/car" className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${v.chip}`}>
              <Car size={13} /> Car mode
            </Link>
          </div>
        )}

        {compact && (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={cycleSpeed}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold ${playbackRate !== 1 ? v.chip : 'border-[var(--theme-border)] text-[var(--theme-muted)]'}`}
            >
              <Gauge size={11} />
              {playbackRate}x
            </button>
            {activeTrackId && (
              <TrackBookmarkButton trackId={activeTrackId} currentTime={currentTime} onSeek={seek} variant={variant} />
            )}
            <Link to="/car" className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold ${v.chip}`}>
              <Car size={11} /> Car
            </Link>
            <button type="button" onClick={skipBack} className={`text-[10px] font-medium text-[var(--theme-muted)] ${v.ctrl} px-2 py-1 rounded-lg`}>
              −10s
            </button>
            <button type="button" onClick={skipFwd} className={`text-[10px] font-medium text-[var(--theme-muted)] ${v.ctrl} px-2 py-1 rounded-lg`}>
              +10s
            </button>
            <button
              type="button"
              onClick={() => skipTracks(3)}
              disabled={!hasNext}
              className={`text-[10px] font-medium text-[var(--theme-muted)] ${v.ctrl} px-2 py-1 rounded-lg disabled:opacity-35`}
            >
              +3 tracks
            </button>
            <button
              type="button"
              onClick={jumpToNextSponsored}
              disabled={!hasNextSponsored}
              className={`text-[10px] font-medium px-2 py-1 rounded-lg ${hasNextSponsored ? v.ctrlActive : 'text-[var(--theme-muted)]'} disabled:opacity-35`}
            >
              Ads
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
