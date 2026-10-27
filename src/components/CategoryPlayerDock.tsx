import CompactPlayer from './CompactPlayer'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import type { AudioTrack } from '../types'

interface CategoryPlayerDockProps {
  /** Tracks that belong to this category page, in display order. */
  tracks: AudioTrack[]
  variant?: 'violet' | 'sky' | 'emerald'
  className?: string
}

/**
 * Renders the compact player inline on a category page, but only while a track
 * from that page is actually playing. Keeps every category page self-contained
 * without duplicating the guard logic.
 */
export default function CategoryPlayerDock({ tracks, variant = 'sky', className = 'mb-4 sm:mb-6' }: CategoryPlayerDockProps) {
  const { currentTrack } = useAudioPlayer()

  const isActiveHere = Boolean(currentTrack) && tracks.some((track) => track.id === currentTrack?.id)
  if (!isActiveHere) return null

  return (
    <div className={className}>
      <CompactPlayer tracks={tracks} variant={variant} />
    </div>
  )
}
