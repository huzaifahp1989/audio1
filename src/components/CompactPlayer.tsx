import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, Volume2, VolumeX, ListMusic, X } from 'lucide-react'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration } from '../lib/storage'
import type { AudioTrack } from '../types'

interface CompactPlayerProps {
  tracks: AudioTrack[]
  currentIndex: number
  variant?: 'violet' | 'sky' | 'emerald'
}

export default function CompactPlayer({ tracks, currentIndex, variant = 'violet' }: CompactPlayerProps) {
  const {
    currentTrack, isPlaying, currentTime, duration, volume,
    togglePlay, seek, setVolume, playNext, playPrev, hasNext, hasPrev,
    playFromList
  } = useAudioPlayer()

  const [showPlaylist, setShowPlaylist] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)

  const progress = duration ? (currentTime / duration) * 100 : 0

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    seek((percent / 100) * duration)
  }

  const variantColors = {
    violet: { bg: 'bg-violet-500', text: 'text-violet-600', light: 'bg-violet-100' },
    sky: { bg: 'bg-sky-500', text: 'text-sky-600', light: 'bg-sky-100' },
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-100' }
  }

  const colors = variantColors[variant]

  if (!currentTrack) return null

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
          <button onClick={() => setIsMinimized(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <ListMusic size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentTrack.title}</p>
            <p className="text-xs text-slate-500 truncate">{currentTrack.reciter}</p>
          </div>
          <button onClick={togglePlay} className={`w-10 h-10 rounded-full ${colors.bg} text-white flex items-center justify-center`}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Compact Player */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Progress Bar - Top */}
        <div
          ref={progressRef}
          className="h-1.5 bg-slate-200 dark:bg-slate-700 cursor-pointer group relative"
          onClick={handleSeek}
          onTouchStart={handleSeek}
        >
          <div
            className={`h-full ${colors.bg} transition-all duration-100 relative`}
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="p-3 sm:p-4">
          {/* Track Info */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-2xl shrink-0">
              🎵
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentTrack.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                {currentTrack.reciter}
              </p>
            </div>
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors sm:hidden"
            >
              <ListMusic size={20} className={showPlaylist ? colors.text : 'text-slate-500'} />
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={playPrev}
                disabled={!hasPrev}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <SkipBack size={18} />
              </button>

              <button
                onClick={() => seek(Math.max(0, currentTime - 10))}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={togglePlay}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${colors.bg} text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-95`}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              </button>

              <button
                onClick={() => seek(Math.min(duration, currentTime + 10))}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight size={18} />
              </button>

              <button
                onClick={playNext}
                disabled={!hasNext}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <SkipForward size={18} />
              </button>
            </div>

            {/* Volume + Playlist Toggle */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => setVolume(volume === 0 ? 1 : 0)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-20 accent-current"
                />
              </div>

              <button
                onClick={() => setShowPlaylist(!showPlaylist)}
                className="hidden sm:flex p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ListMusic size={20} className={showPlaylist ? colors.text : 'text-slate-500'} />
              </button>

              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist / Track List */}
      {showPlaylist && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <h4 className="font-semibold text-sm">Playlist ({tracks.length} tracks)</h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {tracks.map((track, idx) => (
              <button
                key={track.id}
                onClick={() => playFromList(track, tracks, idx)}
                className={`w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                  currentTrack?.id === track.id ? colors.light : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                  currentTrack?.id === track.id ? `${colors.bg} text-white` : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  {currentTrack?.id === track.id && isPlaying ? (
                    <span className="flex gap-0.5">
                      <span className="w-0.5 h-3 bg-white animate-pulse" />
                      <span className="w-0.5 h-3 bg-white animate-pulse delay-75" />
                      <span className="w-0.5 h-3 bg-white animate-pulse delay-150" />
                    </span>
                  ) : (
                    idx + 1
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${currentTrack?.id === track.id ? colors.text : 'text-slate-900 dark:text-slate-100'}`}>
                    {track.title}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{track.reciter}</p>
                </div>
                {track.duration && (
                  <span className="text-xs text-slate-400 tabular-nums">{formatDuration(track.duration)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
