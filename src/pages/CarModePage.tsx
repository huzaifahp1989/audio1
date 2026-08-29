<<<<<<< HEAD
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
=======
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Play, Pause, SkipBack, SkipForward, Car, Radio, ShieldAlert,
} from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import type { AudioCategory, AudioTrack } from '../types'
import { isKidsCategory } from '../types'
import { formatDuration } from '../lib/storage'

type QueueKey = AudioCategory | 'all' | 'kids'

const QUEUES: { id: QueueKey; label: string; emoji: string; color: string; match: (t: AudioTrack) => boolean }[] = [
  { id: 'quran', label: 'Quran', emoji: '📖', color: 'from-emerald-600 to-teal-700', match: (t) => t.category === 'quran' },
  { id: 'nasheeds', label: 'Nasheeds', emoji: '🎵', color: 'from-violet-600 to-indigo-700', match: (t) => t.category === 'nasheeds' || t.category === 'kids-nasheeds' },
  { id: 'talks', label: 'Talks', emoji: '🎙️', color: 'from-sky-600 to-blue-700', match: (t) => t.category === 'talks' },
  { id: 'kids', label: 'Kids', emoji: '🌟', color: 'from-amber-500 to-orange-600', match: (t) => isKidsCategory(t.category) },
  { id: 'audiobooks', label: 'Audiobooks', emoji: '📚', color: 'from-fuchsia-600 to-pink-700', match: (t) => t.category === 'audiobooks' },
  { id: 'hadith', label: 'Hadith', emoji: '📜', color: 'from-rose-600 to-red-700', match: (t) => t.category === 'hadith' },
  { id: 'dua', label: 'Dua', emoji: '🤲', color: 'from-cyan-600 to-teal-700', match: (t) => t.category === 'dua' },
  { id: 'all', label: 'Everything', emoji: '🎧', color: 'from-slate-700 to-slate-900', match: () => true },
]

export default function CarModePage() {
  const { tracks, loading, refresh } = useAudioLibrary()
  const {
    currentTrack, isPlaying, currentTime, duration,
    playNext, playPrev, togglePlay, hasNext, hasPrev,
    isAdPlaying, continuousPlay, adsEnabled,
    setContinuousPlay, setAdsEnabled, startQueue, skipAd, playlist, playlistIndex,
  } = useAudioPlayer()

  const [activeQueue, setActiveQueue] = useState<QueueKey>('quran')

  useEffect(() => { refresh() }, [])
  useEffect(() => { setContinuousPlay(true) }, [setContinuousPlay])

  // Keep screen awake while driving / listening in car mode
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const request = async () => {
      try {
        if ('wakeLock' in navigator) {
          lock = await navigator.wakeLock.request('screen')
        }
      } catch { /* unsupported / denied */ }
    }
    void request()
    const onVis = () => { if (document.visibilityState === 'visible') void request() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      void lock?.release()
    }
  }, [])

  const start = (key: QueueKey) => {
    setActiveQueue(key)
    const def = QUEUES.find((q) => q.id === key) || QUEUES[0]
    const list = tracks.filter(def.match).filter((t) => !!t.audioUrl)
    if (!list.length) return
    startQueue(list, 0, { continuous: true })
  }

  const progress = duration ? (currentTime / duration) * 100 : 0
  const queueLabel = QUEUES.find((q) => q.id === activeQueue)?.label || 'Queue'

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-950 via-slate-900 to-violet-950 text-white px-4 py-6 pb-36">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center shrink-0">
              <Car size={22} className="text-violet-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">Car Mode</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Android Auto / Bluetooth controls · continuous play · ads every 4–6 tracks
              </p>
            </div>
          </div>
          <Link to="/" className="text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-white/10 shrink-0">
            Exit
          </Link>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 mb-6 flex gap-3 text-sm text-amber-100">
          <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-300" />
          <p>
            Connect your phone to the car via <strong>Android Auto</strong> or Bluetooth.
            Use the car’s play / pause / next / previous buttons — they control this library.
            Keep this page open while driving for the best experience.
          </p>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Start a queue</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {QUEUES.map((q) => {
            const count = tracks.filter(q.match).filter((t) => !!t.audioUrl).length
            const active = activeQueue === q.id && playlist.length > 0
            return (
              <button
                key={q.id}
                type="button"
                disabled={loading || count === 0}
                onClick={() => start(q.id)}
                className={`rounded-2xl p-4 text-left border transition-all min-h-[5.5rem] disabled:opacity-40 ${
                  active
                    ? `bg-gradient-to-br ${q.color} border-white/20 shadow-lg`
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="text-2xl mb-2">{q.emoji}</div>
                <div className="font-bold text-sm">{q.label}</div>
                <div className="text-xs text-white/70 mt-0.5">{count} tracks</div>
              </button>
            )
          })}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-5 sm:p-7 shadow-2xl mb-6">
          {isAdPlaying && (
            <div className="mb-4 rounded-xl bg-rose-500/20 border border-rose-400/30 px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-rose-100 flex items-center gap-2">
                <Radio size={16} /> Sponsored message
              </span>
              <button
                type="button"
                onClick={skipAd}
                className="text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25"
              >
                Skip ad
              </button>
            </div>
          )}

          <p className="text-xs uppercase tracking-widest text-violet-300/80 font-semibold mb-2">
            Now playing · {queueLabel}
            {playlist.length > 0 && (
              <span className="text-slate-500 font-normal"> · {Math.max(1, playlistIndex + 1)}/{playlist.length}</span>
            )}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-1 break-words">
            {currentTrack?.title || (loading ? 'Loading library…' : 'Pick a queue above')}
          </h2>
          <p className="text-slate-400 text-sm mb-5">
            {currentTrack?.reciter || '—'}
          </p>

          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all ${isAdPlaying ? 'bg-rose-400' : 'bg-violet-400'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 tabular-nums mb-6">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>

          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={playPrev}
              disabled={!hasPrev && !continuousPlay}
              className="w-16 h-16 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/20 disabled:opacity-30"
              aria-label="Previous track"
            >
              <SkipBack size={28} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={!currentTrack}
              className="w-20 h-20 rounded-full bg-violet-500 hover:bg-violet-400 text-white flex items-center justify-center shadow-xl shadow-violet-900/40 disabled:opacity-40"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={36} /> : <Play size={36} className="ml-1" />}
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
            </button>
            <button
              type="button"
              onClick={playNext}
<<<<<<< HEAD
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
=======
              disabled={!hasNext && !continuousPlay}
              className="w-16 h-16 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/20 disabled:opacity-30"
              aria-label="Next track"
            >
              <SkipForward size={28} />
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span>
              <span className="font-semibold block">Continuous play</span>
              <span className="text-slate-400 text-xs">Loop the queue for long drives</span>
            </span>
            <input
              type="checkbox"
              checked={continuousPlay}
              onChange={(e) => setContinuousPlay(e.target.checked)}
              className="w-5 h-5 accent-violet-500"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span>
              <span className="font-semibold block">Playback ads</span>
              <span className="text-slate-400 text-xs">Short promo every 4–6 tracks</span>
            </span>
            <input
              type="checkbox"
              checked={adsEnabled}
              onChange={(e) => setAdsEnabled(e.target.checked)}
              className="w-5 h-5 accent-violet-500"
            />
          </label>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 leading-relaxed">
          Tip: Install this site to your phone home screen, open Car Mode, start Quran or Nasheeds,
          then switch to Android Auto — media buttons will move between tracks.
        </p>
      </div>
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
    </div>
  )
}
