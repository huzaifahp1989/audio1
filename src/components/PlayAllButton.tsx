import React from 'react'
import { ListMusic, Play } from 'lucide-react'
import type { AudioTrack } from '../types'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { buildPlaylistQueue, type SponsoredBreakFrequency } from '../lib/playlistQueue'

interface PlayAllButtonProps {
  tracks: AudioTrack[]
  label?: string
  className?: string
  allowSponsoredBreaks?: boolean
  defaultSponsoredBreakFrequency?: SponsoredBreakFrequency | null
}

export default function PlayAllButton({
  tracks,
  label = 'Play all',
  className = '',
  allowSponsoredBreaks = false,
  defaultSponsoredBreakFrequency = 4,
}: PlayAllButtonProps) {
  const { playFromList } = useAudioPlayer()
  const [sponsoredBreakFrequency, setSponsoredBreakFrequency] = React.useState<SponsoredBreakFrequency | null>(defaultSponsoredBreakFrequency)

  if (tracks.length === 0) return null

  const handlePlayAll = () => {
    const queue = buildPlaylistQueue(tracks, allowSponsoredBreaks ? sponsoredBreakFrequency : null)
    if (queue.length === 0) return
    playFromList(queue[0], queue, 0)
  }

  return (
    <div className="flex items-center gap-2">
      {allowSponsoredBreaks && (
        <select
          value={sponsoredBreakFrequency ?? 'off'}
          onChange={(event) => {
            const value = event.target.value
            setSponsoredBreakFrequency(value === 'off' ? null : Number(value) as SponsoredBreakFrequency)
          }}
          className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-3 py-2 text-xs font-semibold text-[var(--theme-muted)] shadow-sm outline-none focus:border-[var(--theme-brand)]/40"
          aria-label="Sponsored break frequency"
        >
          <option value="off">No ads</option>
          <option value="2">Ad every 2</option>
          <option value="3">Ad every 3</option>
          <option value="4">Ad every 4</option>
        </select>
      )}
      <button
        type="button"
        onClick={handlePlayAll}
        className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105 active:scale-[0.98] ${className}`}
      >
        <Play size={16} className="ml-0.5" />
        {label} ({tracks.length})
        <ListMusic size={16} className="opacity-80" />
      </button>
    </div>
  )
}
