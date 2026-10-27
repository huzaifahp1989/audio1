import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mic2, ChevronDown, Heart, Upload, Sparkles } from 'lucide-react'
import { useFavorites } from '../context/FavoritesContext'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import CategoryUploadPanel from '../components/CategoryUploadPanel'
import ContributorUploadNotice from '../components/ContributorUploadNotice'
import CategoryHero from '../components/CategoryHero'
import CategoryChips from '../components/CategoryChips'
import CategoryPlayerDock from '../components/CategoryPlayerDock'
import TalkTrackRow from '../components/TalkTrackRow'
import { TALKS_TOPICS, TALKS_SPEAKERS } from '../constants/categories'
import { buildContributorOptions, contributorMatches, countTracksForContributor } from '../lib/contributorMatch'
import { sortTracks, type SortOption } from '../lib/trackSort'
import SortFilterBar from '../components/SortFilterBar'
import PlayAllButton from '../components/PlayAllButton'
import SpeakerProfileLink from '../components/SpeakerProfileLink'

const SERIES_CATEGORIES = [
  { id: 'sahabah', label: 'Sahabah', emoji: '👥', description: 'Lives of the Prophet\'s companions' },
  { id: 'tafseer', label: 'Tafseer', emoji: '📖', description: 'Quranic commentary and explanation' },
  { id: 'hadith-series', label: 'Hadith', emoji: '📜', description: 'Hadith studies and collections' },
]

export default function TalksPage() {
  const { tracks, loading } = useAudioLibrary()
  const { resolveFavoriteTracks } = useFavorites()
  const talksFavoriteCount = useMemo(
    () => resolveFavoriteTracks(tracks).filter((t) => t.category === 'talks').length,
    [resolveFavoriteTracks, tracks]
  )

  const allTracks = tracks.filter((t) => t.category === 'talks')

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'series'>('all')
  const [selectedTopic, setSelectedTopic] = useState('All')
  const [selectedSpeaker, setSelectedSpeaker] = useState('All')
  const [selectedSeries, setSelectedSeries] = useState('All')
  const [sort, setSort] = useState<SortOption>('newest')

  const speakerOptions = useMemo(
    () => buildContributorOptions(allTracks, TALKS_SPEAKERS),
    [allTracks]
  )

  const topicOptions = useMemo(() => {
    const fromTracks = [...new Set(allTracks.map((t) => t.topic).filter(Boolean))] as string[]
    const featured = TALKS_TOPICS.map((t) => t.id)
    const withTracks = featured.filter((id) => fromTracks.includes(id))
    const extra = fromTracks.filter((id) => !featured.includes(id)).sort()
    return ['All', ...withTracks, ...extra]
  }, [allTracks])

  const topicChips = useMemo(
    () =>
      topicOptions.map((id) => {
        const topic = TALKS_TOPICS.find((t) => t.id === id)
        return {
          id,
          label: id === 'All' ? 'All Topics' : topic?.label ?? id,
          emoji: topic?.emoji,
          count: id === 'All' ? allTracks.length : allTracks.filter((t) => t.topic === id).length,
        }
      }),
    [topicOptions, allTracks]
  )

  const seriesChips = useMemo(
    () => [
      { id: 'All', label: 'All Series', count: allTracks.length },
      ...SERIES_CATEGORIES.map((series) => ({
        id: series.id,
        label: series.label,
        emoji: series.emoji,
        count: allTracks.filter((t) => t.topic === series.id).length,
      })),
    ],
    [allTracks]
  )

  const filtered = allTracks.filter((t) => {
    const q = search.trim().toLowerCase()
    const matchesSearch = q
      ? t.title.toLowerCase().includes(q) || (t.reciter || '').toLowerCase().includes(q)
      : true

    if (activeTab === 'series') {
      const matchesSeries = selectedSeries !== 'All' ? t.topic === selectedSeries : true
      return matchesSearch && matchesSeries
    }

    const matchesTopic = selectedTopic !== 'All' ? t.topic === selectedTopic : true
    const matchesSpeaker = contributorMatches(t.reciter, selectedSpeaker)
    return matchesSearch && matchesTopic && matchesSpeaker
  })

  const sortedFiltered = useMemo(() => sortTracks(filtered, sort), [filtered, sort])
  const totalViews = allTracks.reduce((sum, t) => sum + (t.views || 0), 0)

  const listTitle = (() => {
    if (activeTab === 'series') {
      if (selectedSeries === 'All') return 'All Series'
      const series = SERIES_CATEGORIES.find((s) => s.id === selectedSeries)
      return series ? `${series.emoji} ${series.label}` : selectedSeries
    }
    if (selectedSpeaker !== 'All') return selectedSpeaker
    if (selectedTopic !== 'All') {
      const topic = TALKS_TOPICS.find((t) => t.id === selectedTopic)
      return topic ? `${topic.emoji} ${topic.label}` : selectedTopic
    }
    return 'All Talks'
  })()

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <CategoryHero
        icon={<Sparkles size={14} />}
        badge="Islamic Talks"
        title="Talks"
        description="Browse by speaker or topic, listen instantly, and explore lecture series."
        gradient="from-sky-600 via-cyan-600 to-blue-600"
        itemCount={allTracks.length}
        itemNoun="talk"
        totalPlays={totalViews}
        search={{ value: search, onChange: setSearch, placeholder: 'Search title or speaker…' }}
      />

      <ContributorUploadNotice variant="talks" className="mb-4 sm:mb-6" />
      <CategoryUploadPanel category="talks" className="mb-4 sm:mb-6" />

      <CategoryPlayerDock tracks={sortedFiltered} variant="sky" />

      <section className="mb-5 sm:mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Browse</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            aria-pressed={activeTab === 'all'}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-200'
                : 'bg-[var(--theme-surface-2)] border border-[var(--theme-border)] text-[var(--theme-muted)] hover:bg-sky-50 hover:border-sky-200'
            }`}
          >
            All Talks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('series')}
            aria-pressed={activeTab === 'series'}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'series'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-200'
                : 'bg-[var(--theme-surface-2)] border border-[var(--theme-border)] text-[var(--theme-muted)] hover:bg-sky-50 hover:border-sky-200'
            }`}
          >
            Series
          </button>
          <Link
            to="/favorites?category=talks"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--theme-surface-2)] border border-[var(--theme-border)] text-[var(--theme-muted)] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-all"
          >
            <Heart size={15} className="text-rose-500" />
            Favorites
            {talksFavoriteCount > 0 && (
              <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                {talksFavoriteCount}
              </span>
            )}
          </Link>
        </div>
      </section>

      {activeTab === 'all' ? (
        <section className="mb-5 sm:mb-6 space-y-4">
          <CategoryChips
            label="Topic"
            options={topicChips}
            value={selectedTopic}
            onChange={(id) => {
              setSelectedTopic(id)
              setSelectedSpeaker('All')
            }}
            activeClass="bg-sky-600 text-white border-sky-600"
          />

          <div>
            <label htmlFor="talk-speaker" className="text-xs font-semibold text-[var(--theme-muted)] uppercase tracking-wider mb-2 block">
              Speaker
            </label>
            <div className="relative max-w-md">
              <select
                id="talk-speaker"
                value={selectedSpeaker}
                onChange={(e) => {
                  setSelectedSpeaker(e.target.value)
                  setSelectedTopic('All')
                }}
                className="w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] pl-4 pr-10 py-2.5 text-sm font-semibold text-[var(--theme-ink)] shadow-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                {speakerOptions.map((speaker) => {
                  const count = countTracksForContributor(allTracks, speaker)
                  return (
                    <option key={speaker} value={speaker}>
                      {speaker}
                      {count > 0 ? ` (${count})` : ''}
                    </option>
                  )
                })}
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />
            </div>
            <SpeakerProfileLink name={selectedSpeaker} className="mt-2" />
          </div>
        </section>
      ) : (
        <section className="mb-5 sm:mb-6">
          <CategoryChips
            label="Series"
            options={seriesChips}
            value={selectedSeries}
            onChange={setSelectedSeries}
            activeClass="bg-sky-600 text-white border-sky-600"
          />
          {selectedSeries !== 'All' && (
            <p className="mt-2 text-xs text-[var(--theme-muted)]">
              {SERIES_CATEGORIES.find((s) => s.id === selectedSeries)?.description}
            </p>
          )}
        </section>
      )}

      <div className="mb-3 flex justify-end">
        <Link
          to="/submit-audio?category=talks"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
        >
          <Upload size={16} /> Submit a talk
        </Link>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-0.5">
          <h2 className="text-sm font-bold text-[var(--theme-ink)]">{listTitle}</h2>
          <div className="flex items-center gap-2">
            <PlayAllButton tracks={sortedFiltered} allowSponsoredBreaks defaultSponsoredBreakFrequency={2} />
            <span className="text-xs text-[var(--theme-muted)]">{sortedFiltered.length} shown</span>
          </div>
        </div>

        <SortFilterBar sort={sort} onSortChange={setSort} count={sortedFiltered.length} label="talks" />

        <div className="mt-3">
          {sortedFiltered.length > 0 ? (
            <div className="flex flex-col gap-2 sm:gap-3">
              {sortedFiltered.map((track, index) => (
                <TalkTrackRow key={track.id} track={track} tracks={sortedFiltered} index={index} />
              ))}
            </div>
          ) : loading && allTracks.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-28 rounded-3xl skeleton" />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-soft)]/50 px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--theme-surface-2)] shadow-sm">
                <Mic2 size={26} className="text-[var(--theme-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--theme-ink)]">
                {search
                  ? 'No talks match your search.'
                  : activeTab === 'series' && selectedSeries !== 'All'
                    ? 'No talks in this series yet.'
                    : selectedSpeaker !== 'All' || selectedTopic !== 'All'
                      ? 'No talks for the selected filters.'
                      : 'No talks uploaded yet.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
