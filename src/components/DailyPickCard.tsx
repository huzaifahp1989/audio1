import React from 'react'
import { Sparkles, Play } from 'lucide-react'
import type { AudioTrack } from '../types'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { Link } from 'react-router-dom'

interface DailyPickCardProps {
  track: AudioTrack
  allTracks: AudioTrack[]
}

export default function DailyPickCard({ track, allTracks }: DailyPickCardProps) {
  const { playFromList } = useAudioPlayer()
  const index = allTracks.findIndex((t) => t.id === track.id)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/30 dark:via-[var(--theme-surface-2)] dark:to-orange-950/20 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
          <Sparkles size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Daily pick</p>
          <h3 className="mt-1 line-clamp-2 text-lg font-bold text-[var(--theme-ink)]">{track.title}</h3>
          <p className="mt-0.5 truncate text-sm text-[var(--theme-muted)]">{track.reciter}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => playFromList(track, allTracks, index >= 0 ? index : 0)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
            >
              <Play size={16} className="ml-0.5" /> Listen now
            </button>
            <Link
              to={`/track/${track.id}`}
              className="inline-flex items-center rounded-xl border border-amber-200 dark:border-amber-500/30 px-4 py-2 text-sm font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-500/10"
            >
              View track
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
