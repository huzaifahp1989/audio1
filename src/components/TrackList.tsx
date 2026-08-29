import React from 'react'
import type { AudioTrack } from '../types'
import TrackCard from './TrackCard'
import { Music } from 'lucide-react'

interface TrackListProps {
  tracks: AudioTrack[]
  emptyMessage?: string
  loading?: boolean
}

export default function TrackList({
  tracks,
  emptyMessage = 'No audio files uploaded yet.',
  loading = false,
}: TrackListProps) {
  if (loading && tracks.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-40 rounded-3xl skeleton" />
        ))}
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--theme-soft)] flex items-center justify-center mb-4">
          <Music size={28} className="text-[var(--theme-muted)]" />
        </div>
<<<<<<< HEAD
        <p className="text-[var(--theme-muted)] text-sm">{emptyMessage}</p>
        <p className="text-[var(--theme-muted)] text-xs mt-1 opacity-70">Upload audio files from the Admin panel.</p>
=======
        <p className="text-slate-500 text-sm max-w-md">{emptyMessage}</p>
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tracks.map((track, index) => (
        <TrackCard key={track.id} track={track} tracks={tracks} index={index} />
      ))}
    </div>
  )
}
