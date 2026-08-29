import React, { useMemo } from 'react'
import type { AudioTrack } from '../types'
import { getRelatedTracks } from '../lib/relatedTracks'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { Play } from 'lucide-react'
import { formatDuration } from '../lib/storage'

interface RelatedTracksProps {
  track: AudioTrack
  limit?: number
}

export default function RelatedTracks({ track, limit = 6 }: RelatedTracksProps) {
  const { tracks } = useAudioLibrary()
  const { playFromList } = useAudioPlayer()

  const related = useMemo(() => getRelatedTracks(track, tracks, limit), [track, tracks, limit])
  if (related.length === 0) return null

  return (
    <section className="mt-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-soft)]/40 p-4">
      <h3 className="mb-3 text-sm font-bold text-[var(--theme-ink)]">Related tracks</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {related.map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => playFromList(t, related, i)}
            className="flex items-center gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] p-3 text-left transition hover:border-[var(--theme-brand)]/40 hover:shadow-sm"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-soft)] text-[var(--theme-brand)]">
              <Play size={14} className="ml-0.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--theme-ink)]">{t.title}</p>
              <p className="truncate text-xs text-[var(--theme-muted)]">{t.reciter}</p>
            </div>
            {t.duration !== undefined && (
              <span className="shrink-0 text-[10px] tabular-nums text-[var(--theme-muted)]">{formatDuration(t.duration)}</span>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}
