import React from 'react'
import type { AudioTrack } from '../types'
import TrackCard from './TrackCard'
import { Music } from 'lucide-react'

interface TrackListProps {
  tracks: AudioTrack[]
  emptyMessage?: string
}

export default function TrackList({ tracks, emptyMessage = 'No audio files uploaded yet.' }: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Music size={28} className="text-slate-400" />
        </div>
        <p className="text-slate-500 text-sm">{emptyMessage}</p>
        <p className="text-slate-400 text-xs mt-1">Upload audio files from the Admin panel.</p>
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
