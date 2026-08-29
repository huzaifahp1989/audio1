import React from 'react'
import { Play } from 'lucide-react'
import type { AudioTrack } from '../types'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration } from '../lib/storage'

interface ContinueListeningCardProps {
  track: AudioTrack
  position: number
  duration: number
  list: AudioTrack[]
  index: number
}

export default function ContinueListeningCard({ track, position, duration, list, index }: ContinueListeningCardProps) {
  const { playFromList } = useAudioPlayer()
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0
  const remaining = Math.max(0, duration - position)

  return (
    <button
      type="button"
      onClick={() => playFromList(track, list, index)}
      className="group flex w-64 shrink-0 flex-col rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow">
          <Play size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--theme-ink)]">{track.title}</p>
          <p className="truncate text-xs text-[var(--theme-muted)]">{track.reciter}</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--theme-soft)]">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-[var(--theme-muted)]">
        {formatDuration(remaining)} left
      </p>
    </button>
  )
}
