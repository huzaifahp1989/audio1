import React from 'react'
import { Play, Pause, Music, SkipBack, SkipForward, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import type { AudioTrack } from '../types'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration, formatFileSize, formatViews } from '../lib/storage'

interface TrackCardProps {
  track: AudioTrack
  tracks: AudioTrack[]
  index: number
}

export default function TrackCard({ track, tracks, index }: TrackCardProps) {
  const { currentTrack, isPlaying, currentTime, duration, playFromList, togglePlay, seek } = useAudioPlayer()
  const isActive = currentTrack?.id === track.id
  const views = track.views ?? 0

  const canPrev = index > 0
  const canNext = index < tracks.length - 1
  const progress = duration ? (currentTime / duration) * 100 : 0

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (canPrev) {
      playFromList(tracks[index - 1], tracks, index - 1)
    }
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (canNext) {
      playFromList(tracks[index + 1], tracks, index + 1)
    }
  }

  const skipBack = (e: React.MouseEvent) => {
    e.stopPropagation()
    seek(Math.max(0, currentTime - 10))
  }

  const skipFwd = (e: React.MouseEvent) => {
    e.stopPropagation()
    seek(Math.min(duration, currentTime + 10))
  }

  return (
    <div
      className={`group relative bg-white border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer ${
        isActive ? 'border-violet-400 shadow-md ring-1 ring-violet-300' : 'border-slate-200 hover:border-violet-200'
      }`}
      onClick={() => playFromList(track, tracks, index)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Artwork */}
          <div
            className={`relative w-14 h-14 rounded-lg flex items-center justify-center shrink-0 ${
              isActive ? 'bg-violet-600' : 'bg-violet-50 group-hover:bg-violet-100'
            } transition-colors`}
          >
            <Music size={22} className={isActive ? 'text-white' : 'text-violet-400'} />
            <div
              className={`absolute inset-0 flex items-center justify-center rounded-lg bg-violet-900/30 transition-opacity ${
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              {isActive && isPlaying ? (
                <Pause size={20} className="text-white" />
              ) : (
                <Play size={20} className="text-white ml-0.5" />
              )}
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h3
              dir={/[\u0600-\u06FF]/.test(track.title) ? 'rtl' : 'ltr'}
              className={`font-semibold text-sm leading-tight truncate ${
                isActive ? 'text-violet-700' : 'text-slate-800'
              }`}
            >
              {track.title}
            </h3>
            <p
              dir={/[\u0600-\u06FF]/.test(track.reciter || '') ? 'rtl' : 'ltr'}
              className="text-xs text-slate-500 mt-0.5 truncate"
            >
              {track.reciter}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {(() => {
                const lang = (track.language || track.topic || '').toLowerCase()
                if (lang === 'arabic') return <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">Arabic</span>
                if (lang === 'english') return <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">English</span>
                if (lang === 'urdu') return <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">Urdu</span>
                return null
              })()}
              {(track.category === 'kids-nasheeds' || track.category === 'kids-quran' || track.category === 'kids-stories') && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-100">
                  Kids
                </span>
              )}
              <span
                className="inline-flex items-center gap-1 text-xs text-slate-500 tabular-nums"
                title={`${views} view${views === 1 ? '' : 's'}`}
              >
                <Eye size={12} className="text-slate-400" />
                {formatViews(views)}
              </span>
              {track.duration !== undefined && (
                <span className="text-xs text-slate-400 tabular-nums">{formatDuration(track.duration)}</span>
              )}
              <span className="text-xs text-slate-300">{formatFileSize(track.fileSize)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inline mini-player - shown when active */}
      {isActive && (
        <div className="px-4 pb-3 pt-1 border-t border-violet-100 bg-violet-50/50" onClick={(e) => e.stopPropagation()}>
          {/* Seek bar */}
          <div className="mb-2">
            <div className="relative h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={(e) => { e.stopPropagation(); seek(Number(e.target.value)) }}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                style={{ height: '100%' }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-400 tabular-nums">{formatDuration(currentTime)}</span>
              <span className="text-xs text-slate-400 tabular-nums">{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Controls with skip buttons */}
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={handlePrev}
              disabled={!canPrev}
              className="p-1.5 text-slate-500 hover:text-violet-600 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
              title="Previous track"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={skipBack}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              title="-10s"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay() }}
              className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center shadow transition-all active:scale-95 mx-1"
            >
              {isPlaying
                ? <Pause size={16} className="text-white" />
                : <Play size={16} className="text-white ml-0.5" />}
            </button>
            <button
              onClick={skipFwd}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              title="+10s"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={handleNext}
              disabled={!canNext}
              className="p-1.5 text-slate-500 hover:text-violet-600 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
              title="Next track"
            >
              <SkipForward size={16} />
            </button>
          </div>
        </div>
      )}

      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500" />
      )}
    </div>
  )
}
