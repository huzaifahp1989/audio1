import React, { useRef } from 'react'
import { formatDuration } from '../lib/storage'
import type { PlayerVariant } from './InlinePlayerPanel'

interface SeekBarProps {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  showTimes?: boolean
  className?: string
  variant?: PlayerVariant
  size?: 'sm' | 'md' | 'lg'
}

const variantGradients: Record<PlayerVariant, string> = {
  violet: 'from-violet-500 to-indigo-500',
  sky: 'from-sky-500 to-cyan-500',
  emerald: 'from-emerald-500 to-teal-500',
}

const variantThumb: Record<PlayerVariant, string> = {
  violet: 'seek-thumb-violet',
  sky: 'seek-thumb-sky',
  emerald: 'seek-thumb-emerald',
}

function finiteDuration(duration: number): number {
  return Number.isFinite(duration) && duration > 0 ? duration : 0
}

export default function SeekBar({
  currentTime,
  duration,
  onSeek,
  showTimes = true,
  className = '',
  variant = 'violet',
  size = 'md',
}: SeekBarProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const safeDuration = finiteDuration(duration)
  const progress = safeDuration ? Math.min(100, (currentTime / safeDuration) * 100) : 0
  const canSeek = safeDuration > 0

  const seekFromClientX = (clientX: number) => {
    const el = trackRef.current
    if (!el || !canSeek) return
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    onSeek(ratio * safeDuration)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>) => {
    if (!canSeek) return
    onSeek(Number((e.target as HTMLInputElement).value))
  }

  const handlePointer = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!canSeek) return
    // Prefer mouse/touch position on the bar (more reliable than tiny range thumbs on mobile)
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      if (touch) seekFromClientX(touch.clientX)
    } else {
      seekFromClientX(e.clientX)
    }
  }

  const trackHeight = size === 'lg' ? 'seek-bar-track-lg' : size === 'sm' ? 'seek-bar-track-sm' : 'seek-bar-track'

  return (
    <div className={className}>
      <div
        ref={trackRef}
        className={`seek-bar-track relative rounded-full bg-[var(--theme-soft)] ${trackHeight} ${canSeek ? 'cursor-pointer' : 'cursor-wait opacity-70'}`}
        onClick={handlePointer}
        onTouchEnd={handlePointer}
        role="presentation"
      >
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${variantGradients[variant]} shadow-sm`}
          style={{ width: `${progress}%` }}
        />
        <div
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-md transition-[left] duration-75 ${size === 'lg' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'}`}
          style={{ left: `calc(${progress}% - ${size === 'lg' ? '7px' : '5px'})` }}
          aria-hidden
        />
        <input
          type="range"
          min={0}
          max={canSeek ? safeDuration : 1}
          step={0.1}
          value={canSeek ? Math.min(currentTime, safeDuration) : 0}
          onChange={handleSeek}
          onInput={handleSeek}
          disabled={!canSeek}
          className={`seek-bar-input absolute inset-0 w-full ${canSeek ? 'cursor-pointer' : 'cursor-wait'} ${variantThumb[variant]}`}
          aria-label="Seek audio position"
          aria-valuemin={0}
          aria-valuemax={safeDuration || 1}
          aria-valuenow={currentTime}
        />
      </div>
      {showTimes && (
        <div className="mt-1.5 flex justify-between text-[10px] sm:text-[11px] text-[var(--theme-muted)] tabular-nums font-medium">
          <span>{formatDuration(currentTime)}</span>
          <span>{canSeek ? formatDuration(safeDuration) : '--:--'}</span>
        </div>
      )}
    </div>
  )
}
