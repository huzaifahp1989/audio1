import React, { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, User } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { findSpeakerName, slugToSpeakerMatch } from '../lib/speakerSlug'
import { sortTracks, type SortOption } from '../lib/trackSort'
import SortFilterBar from '../components/SortFilterBar'
import TrackCard from '../components/TrackCard'
import TalkTrackRow from '../components/TalkTrackRow'
import NasheedTrackRow from '../components/NasheedTrackRow'

export default function SpeakerPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { tracks, loading } = useAudioLibrary()
  const [sort, setSort] = React.useState<SortOption>('newest')

  const allNames = useMemo(() => [...new Set(tracks.map((t) => t.reciter).filter(Boolean))], [tracks])
  const speakerName = findSpeakerName(slug, allNames) ?? slugToSpeakerMatch(slug)

  const speakerTracks = useMemo(() => {
    const list = tracks.filter((t) => t.reciter?.toLowerCase() === speakerName.toLowerCase())
    return sortTracks(list, sort)
  }, [tracks, speakerName, sort])

  const primaryCategory = speakerTracks[0]?.category

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--theme-muted)] hover:text-[var(--theme-ink)]">
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg">
          <User size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--theme-ink)]">{speakerName}</h1>
          <p className="text-sm text-[var(--theme-muted)]">{speakerTracks.length} track{speakerTracks.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      <SortFilterBar sort={sort} onSortChange={setSort} count={speakerTracks.length} label="tracks" />

      <div className="mt-4 space-y-3">
        {loading && speakerTracks.length === 0 ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 rounded-3xl skeleton" />
          ))
        ) : speakerTracks.length === 0 ? (
          <p className="py-12 text-center text-[var(--theme-muted)]">No tracks found for this speaker.</p>
        ) : primaryCategory === 'talks' ? (
          speakerTracks.map((track, index) => (
            <TalkTrackRow key={track.id} track={track} tracks={speakerTracks} index={index} />
          ))
        ) : primaryCategory === 'nasheeds' ? (
          speakerTracks.map((track, index) => (
            <NasheedTrackRow key={track.id} track={track} tracks={speakerTracks} index={index} />
          ))
        ) : (
          speakerTracks.map((track, index) => (
            <TrackCard key={track.id} track={track} tracks={speakerTracks} index={index} />
          ))
        )}
      </div>
    </div>
  )
}
