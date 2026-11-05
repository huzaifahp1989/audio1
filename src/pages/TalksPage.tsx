import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mic2, ChevronDown, Heart, Upload, Sparkles, X } from 'lucide-react'
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
import ContributorGrid from '../components/ContributorGrid'

const SERIES_CATEGORIES = [
  { id: 'sahabah', label: 'Sahabah', emoji: '👥', description: 'Lives of the Prophet\'s companions' },
  { id: 'tafseer', label: 'Tafseer', emoji: '📖', description: 'Quranic commentary and explanation' },
  { id: 'hadith-series', label: 'Hadith', emoji: '📜', description: 'Hadith studies and collections' },
]

const TABS = [
  { id: 'all' as const, label: 'All Talks' },
  { id: 'series' as const, label: 'Series' },
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

  /** Speakers who actually have talks, most prolific first, for the one-tap grid. */
  const speakerSummaries = useMemo(
    () =>
      speakerOptions
        .filter((name) => name !== 'All')
        .map((name) => ({ name, count: countTracksForContributor(allTracks, name) }))
        .filter((item) => item.count > 0),
    [speakerOptions, allTracks]
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

  const hasActiveFilters = Boolean(search.trim()) || selectedTopic !== 'All' || selectedSpeaker !== 'All' || selectedSeries !== 'All'

  const clearFilters = () => {
    setSearch('')
    setSelectedTopic('All')
    setSelectedSpeaker('All')
    setSelectedSeries('All')
  }

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

      <CategoryPlayerDock tracks={sortedFiltered} variant="sky" />

      {/* All filters in one place, directly above the tracks */}
      <section className="mb-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-sm sm:mb-5 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] p-0.5">
            {TABS.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-9 rounded-[10px] px-3 text-[13px] font-semibold transition ${
                    active ? 'bg-sky-600 text-white shadow-sm' : 'text-[var(--theme-muted)] hover:text-[var(--theme-ink)]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <Link
            to="/favorites?category=talks"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-3 text-[13px] font-semibold text-[var(--theme-muted)] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            <Heart size={14} className="text-rose-500" />
            Favorites
            {talksFavoriteCount > 0 && (
              <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                {talksFavoriteCount}
              </span>
            )}
          </Link>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-[13px] font-semibold text-[var(--theme-muted)] transition hover:text-[var(--theme-ink)]"
            >
              <X size={14} /> Clear filters
            </button>
          )}
        </div>

        <div className="mt-3 space-y-3">
          {activeTab === 'all' ? (
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
          ) : (
            <>
              <CategoryChips
                label="Series"
                options={seriesChips}
                value={selectedSeries}
                onChange={setSelectedSeries}
                activeClass="bg-sky-600 text-white border-sky-600"
              />
              {selectedSeries !== 'All' && (
                <p className="text-xs text-[var(--theme-muted)]">
                  {SERIES_CATEGORIES.find((s) => s.id === selectedSeries)?.description}
                </p>
              )}
            </>
          )}

          {activeTab === 'all' && (
            <div>
              <label htmlFor="talk-speaker" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--theme-muted)]">
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
                  className="w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] py-2.5 pl-4 pr-10 text-sm font-semibold text-[var(--theme-ink)] shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
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
          )}
        </div>
      </section>

      {activeTab === 'all' && (
        <ContributorGrid
          label="Speakers"
          items={speakerSummaries}
          selected={selectedSpeaker}
          onSelect={(name) => {
            setSelectedSpeaker(name)
            setSelectedTopic('All')
          }}
          activeClass="border-sky-600 bg-sky-600 text-white"
          className="mb-5 sm:mb-6"
        />
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-0.5">
          <h2 className="text-sm font-bold text-[var(--theme-ink)]">{listTitle}</h2>
          <div className="flex items-center gap-2">
            <PlayAllButton tracks={sortedFiltered} allowSponsoredBreaks defaultSponsoredBreakFrequency={2} />
            <span className="text-xs text-[var(--theme-muted)]">{sortedFiltered.length} shown</span>
          </div>
        </div>

        <SortFilterBar sort={sort} onSortChange={setSort} />

        <div className="mt-3">
          {sortedFiltered.length > 0 ? (
            <div className="flex flex-col gap-2 sm:gap-3">
              {sortedFiltered.map((track, index) => (
                <TalkTrackRow key={track.id} track={track} tracks={sortedFiltered} index={index} />
              ))}
            </div>
          ) : loading && allTracks.length === 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
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
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-4 text-sm font-semibold text-[var(--theme-ink)] transition hover:border-sky-300"
                >
                  <X size={15} /> Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Contribute — kept below the tracks so browsing comes first */}
      <section className="mt-8 space-y-4 border-t border-[var(--theme-border)] pt-6 sm:mt-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--theme-ink)]">Add to the collection</h2>
          <Link
            to="/submit-audio?category=talks"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            <Upload size={16} /> Submit a talk
          </Link>
        </div>
        <ContributorUploadNotice variant="talks" />
        <CategoryUploadPanel category="talks" />
      </section>
    </div>
  )
}
