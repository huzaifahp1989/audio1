import React, { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Eye } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import CompactPlayer from '../components/CompactPlayer'
import RelatedTracks from '../components/RelatedTracks'
import ReactionBar from '../components/ReactionBar'
import ShareButton from '../components/ShareButton'
import { formatDuration, formatUploadDate } from '../lib/storage'
import { formatViews } from '../lib/views'
import { speakerToSlug } from '../lib/speakerSlug'

const categoryVariant: Record<string, 'violet' | 'sky' | 'emerald'> = {
  talks: 'sky',
  nasheeds: 'violet',
  quran: 'emerald',
}

export default function TrackPage() {
  const { id } = useParams<{ id: string }>()
  const { tracks, loading } = useAudioLibrary()
  const { currentTrack, playFromList } = useAudioPlayer()

  const track = useMemo(() => tracks.find((t) => t.id === id) ?? null, [tracks, id])
  const index = track ? tracks.findIndex((t) => t.id === track.id) : -1
  const variant = categoryVariant[track?.category ?? ''] ?? 'violet'
  const isActive = currentTrack?.id === track?.id

  React.useEffect(() => {
    if (track && currentTrack?.id !== track.id) {
      playFromList(track, tracks, index >= 0 ? index : 0)
    }
  }, [track?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !track) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-[var(--theme-muted)]">Loading…</div>
  }

  if (!track) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-[var(--theme-muted)]">Track not found.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-[var(--theme-brand)]">← Home</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--theme-muted)] hover:text-[var(--theme-ink)]">
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted)]">{track.category}</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--theme-ink)]">{track.title}</h1>
        <Link
          to={`/speaker/${speakerToSlug(track.reciter)}`}
          className="mt-1 inline-block text-sm font-medium text-[var(--theme-brand)] hover:underline"
        >
          {track.reciter}
        </Link>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--theme-muted)]">
          {track.duration !== undefined && (
            <span className="rounded-full bg-[var(--theme-soft)] px-2.5 py-1 tabular-nums">{formatDuration(track.duration)}</span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--theme-soft)] px-2.5 py-1">
            <Eye size={12} /> {formatViews(track.views)}
          </span>
          <span className="rounded-full bg-[var(--theme-soft)] px-2.5 py-1">{formatUploadDate(track.uploadedAt)}</span>
        </div>

        {track.text && (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-xl bg-[var(--theme-soft)]/50 p-4 text-sm text-[var(--theme-ink)] whitespace-pre-wrap">
            {track.text}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <ShareButton track={track} />
        </div>

        <div className="mt-4">
          <ReactionBar trackId={track.id} />
        </div>

        <div className="mt-6">
          <CompactPlayer tracks={tracks} currentIndex={index >= 0 ? index : 0} variant={variant} />
        </div>
      </div>

      <RelatedTracks track={track} />
    </div>
  )
}
