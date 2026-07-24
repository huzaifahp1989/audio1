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
            </button>
            <button
              type="button"
              onClick={playNext}
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
    </div>
  )
}
