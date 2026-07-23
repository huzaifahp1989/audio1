import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, X, Minus, Maximize2, GripHorizontal, SkipBack, SkipForward, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration, formatViews } from '../lib/storage'

export default function AudioPlayer() {
  const { currentTrack, isPlaying, currentTime, duration, volume, togglePlay, seek, setVolume, stopTrack, playNext, playPrev, hasNext, hasPrev } = useAudioPlayer()
  const [minimized, setMinimized] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 })
  const playerRef = useRef<HTMLDivElement>(null)

  // Reset position when track changes (snap to bottom-right corner)
  useEffect(() => {
    if (currentTrack) {
      setPosition({ x: 0, y: 0 })
      setMinimized(false)
    }
  }, [currentTrack?.id])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    }
  }, [position])

  useEffect(() => {
    if (!isDragging) return
    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.mouseX
      const dy = e.clientY - dragStart.current.mouseY
      setPosition({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy })
    }
    const onMouseUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isDragging])

  // Touch drag support
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    setIsDragging(true)
    dragStart.current = {
      mouseX: t.clientX,
      mouseY: t.clientY,
      posX: position.x,
      posY: position.y,
    }
  }, [position])

  useEffect(() => {
    if (!isDragging) return
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      const dx = t.clientX - dragStart.current.mouseX
      const dy = t.clientY - dragStart.current.mouseY
      setPosition({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy })
    }
    const onTouchEnd = () => setIsDragging(false)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [isDragging])

  if (!currentTrack) return null

  const progress = duration ? (currentTime / duration) * 100 : 0

  // Skip forward/backward by 10 seconds
  const skipBack = () => seek(Math.max(0, currentTime - 10))
  const skipFwd = () => seek(Math.min(duration, currentTime + 10))

  const style: React.CSSProperties = {
    transform: `translate(calc(-100% + ${-position.x}px), calc(-100% + ${-position.y}px))`,
    bottom: `calc(1.5rem + ${position.y}px)`,
    right: `calc(1.5rem + ${-position.x}px)`,
    userSelect: 'none',
    cursor: isDragging ? 'grabbing' : 'default',
  }

  if (minimized) {
    return (
      <div
        ref={playerRef}
        className="fixed z-50 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl shadow-2xl px-3 py-2"
        style={{
          bottom: `calc(1.5rem + ${position.y}px)`,
          right: `calc(1.5rem + ${-position.x}px)`,
          userSelect: 'none',
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        {/* Drag handle */}
        <div
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          <GripHorizontal size={14} />
        </div>
        <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center text-sm shrink-0">🎵</div>
        <div className="max-w-[120px] min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">{currentTrack.title}</p>
          <div className="h-0.5 bg-slate-200 rounded-full mt-0.5 overflow-hidden">
            <div className="h-full bg-violet-600 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button onClick={togglePlay} className="w-7 h-7 rounded-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center shrink-0">
          {isPlaying ? <Pause size={13} className="text-white" /> : <Play size={13} className="text-white ml-0.5" />}
        </button>
        <button onClick={() => setMinimized(false)} className="text-slate-400 hover:text-violet-600 p-0.5" title="Expand">
          <Maximize2 size={14} />
        </button>
        <button onClick={stopTrack} className="text-slate-400 hover:text-red-500 p-0.5" title="Close">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div
      ref={playerRef}
      className="fixed z-50 w-80 sm:w-96 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
      style={style}
    >
      {/* Gradient top accent */}
      <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />

      {/* Drag handle bar */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-grab active:cursor-grabbing bg-slate-50/80 border-b border-slate-100 select-none"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div className="flex items-center gap-1.5 text-slate-400">
          <GripHorizontal size={14} />
          <span className="text-xs font-medium text-slate-500">Now Playing</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(true)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors" title="Minimize">
            <Minus size={14} />
          </button>
          <button onClick={stopTrack} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Track info */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center text-2xl shrink-0 shadow-sm">
          🎵
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 truncate leading-tight">{currentTrack.title}</p>
          <p className="text-xs text-violet-500 font-medium truncate mt-0.5 flex items-center gap-2">
            <span className="truncate">{currentTrack.reciter}</span>
            <span className="inline-flex items-center gap-1 text-slate-400 shrink-0">
              <Eye size={11} /> {formatViews(currentTrack.views ?? 0)}
            </span>
          </p>
          <p className="text-xs text-slate-400 truncate capitalize">{currentTrack.category}</p>
        </div>
      </div>

      {/* Seek bar - enhanced with visible handle */}
      <div className="px-4 py-2 bg-slate-50/50">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-500 tabular-nums w-10 text-right">{formatDuration(currentTime)}</span>
          <div className="relative flex-1 h-3 bg-slate-200 rounded-full overflow-hidden group cursor-pointer">
            {/* Progress fill */}
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            {/* Draggable handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-violet-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
            <input
              type="range"
              min={0} max={duration || 0} step={0.1}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              style={{ height: '100%' }}
            />
          </div>
          <span className="text-xs text-slate-500 tabular-nums w-10">{formatDuration(duration)}</span>
        </div>
        {/* Visual hint */}
        <p className="text-[10px] text-slate-400 text-center">Drag to seek forward/backward</p>
      </div>

      {/* Controls */}
      <div className="px-4 pb-3 flex items-center justify-center gap-2">
        {/* Prev track */}
        <button onClick={playPrev} disabled={!hasPrev} className="p-2 text-slate-400 hover:text-violet-600 disabled:text-slate-200 disabled:cursor-not-allowed transition-colors" title="Previous track">
          <SkipBack size={18} />
        </button>
        {/* Skip back 10s */}
        <button onClick={skipBack} className="p-2 text-slate-400 hover:text-slate-700 transition-colors" title="-10s">
          <ChevronLeft size={20} />
        </button>
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 flex items-center justify-center shadow-lg transition-all active:scale-95"
        >
          {isPlaying
            ? <Pause size={22} className="text-white" />
            : <Play size={22} className="text-white ml-0.5" />}
        </button>
        {/* Skip forward 10s */}
        <button onClick={skipFwd} className="p-2 text-slate-400 hover:text-slate-700 transition-colors" title="+10s">
          <ChevronRight size={20} />
        </button>
        {/* Next track */}
        <button onClick={playNext} disabled={!hasNext} className="p-2 text-slate-400 hover:text-violet-600 disabled:text-slate-200 disabled:cursor-not-allowed transition-colors" title="Next track">
          <SkipForward size={18} />
        </button>
      </div>

      {/* Volume */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <button onClick={() => setVolume(volume === 0 ? 0.8 : 0)} className="text-slate-400 hover:text-slate-700 shrink-0">
          {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <div className="relative flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="absolute left-0 top-0 h-full bg-violet-500 rounded-full" style={{ width: `${volume * 100}%` }} />
          <input
            type="range"
            min={0} max={1} step={0.02}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
        <span className="text-xs text-slate-400 tabular-nums w-8 text-right">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  )
}
