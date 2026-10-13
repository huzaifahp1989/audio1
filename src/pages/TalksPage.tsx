import React, { useMemo, useState } from 'react'

import { Link } from 'react-router-dom'
import { Mic2, Search, Eye, Sparkles, ChevronDown, Heart, Upload } from 'lucide-react'
import { useFavorites } from '../context/FavoritesContext'

import { useAudioLibrary } from '../hooks/useAudioLibrary'

import CategoryUploadPanel from '../components/CategoryUploadPanel'

import ContributorUploadNotice from '../components/ContributorUploadNotice'

import TalkTrackRow from '../components/TalkTrackRow'

import { TALKS_TOPICS, TALKS_SPEAKERS } from '../constants/categories'

import { buildContributorOptions, contributorMatches, countTracksForContributor } from '../lib/contributorMatch'

import { formatViews } from '../lib/views'
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



  const filtered = allTracks.filter((t) => {

    const q = search.trim().toLowerCase()

    const matchesSearch = q

      ? t.title.toLowerCase().includes(q) ||

        (t.reciter || '').toLowerCase().includes(q)

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



  const topicOptionLabel = (id: string) => {

    if (id === 'All') return 'All Topics'

    const topic = TALKS_TOPICS.find((t) => t.id === id)

    return topic ? `${topic.emoji} ${topic.label}` : id

  }



  return (

    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-cyan-600 to-blue-600 p-6 sm:p-8 mb-6 sm:mb-8 text-white shadow-xl">

        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_0%,white,transparent_35%)]" />

        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">

          <div>

            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm mb-3">

              <Sparkles size={14} /> Islamic Talks

            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Talks</h1>

            <p className="mt-2 text-sm text-sky-100 max-w-md">

              Browse by speaker or topic, listen instantly, and explore lecture series.

            </p>

            <p className="mt-3 text-xs sm:text-sm text-sky-200 flex flex-wrap items-center gap-x-3 gap-y-1">

              <span>{allTracks.length} talk{allTracks.length !== 1 ? 's' : ''}</span>

              <span className="inline-flex items-center gap-1">

                <Eye size={12} />

                {formatViews(totalViews)} plays

              </span>

            </p>

          </div>

          <div className="relative w-full sm:w-72">

            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" />

            <input

              type="text"

              placeholder="Search title or speaker…"

              value={search}

              onChange={(e) => setSearch(e.target.value)}

              className="w-full rounded-2xl border-0 bg-white/95 text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2.5 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"

            />

          </div>

        </div>

      </section>



      <ContributorUploadNotice variant="talks" className="mb-4 sm:mb-6" />

      <CategoryUploadPanel category="talks" className="mb-4 sm:mb-6" />



      <section className="mb-5 sm:mb-6">

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Browse</p>

        <div className="flex flex-wrap gap-2">

          <button

            type="button"

            onClick={() => setActiveTab('all')}

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

        <section className="mb-5 sm:mb-6 grid gap-4 sm:grid-cols-2">

          <div>

            <label htmlFor="talk-topic" className="text-xs font-semibold text-[var(--theme-muted)] uppercase tracking-wider mb-2 block">

              Topic

            </label>

            <div className="relative">

              <select

                id="talk-topic"

                value={selectedTopic}

                onChange={(e) => {

                  setSelectedTopic(e.target.value)

                  setSelectedSpeaker('All')

                }}

                className="w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] pl-4 pr-10 py-2.5 text-sm font-semibold text-[var(--theme-ink)] shadow-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"

              >

                {topicOptions.map((topicId) => {

                  const count =

                    topicId === 'All'

                      ? allTracks.length

                      : allTracks.filter((t) => t.topic === topicId).length

                  return (

                    <option key={topicId} value={topicId}>

                      {topicOptionLabel(topicId)}

                      {count > 0 ? ` (${count})` : ''}

                    </option>

                  )

                })}

              </select>

              <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />

            </div>

          </div>

          <div>

            <label htmlFor="talk-speaker" className="text-xs font-semibold text-[var(--theme-muted)] uppercase tracking-wider mb-2 block">

              Speaker

            </label>

            <div className="relative">

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

          <label htmlFor="talk-series" className="text-xs font-semibold text-[var(--theme-muted)] uppercase tracking-wider mb-2 block">

            Series

          </label>

          <div className="relative max-w-md">

            <select

              id="talk-series"

              value={selectedSeries}

              onChange={(e) => setSelectedSeries(e.target.value)}

              className="w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] pl-4 pr-10 py-2.5 text-sm font-semibold text-[var(--theme-ink)] shadow-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"

            >

              <option value="All">All Series ({allTracks.length})</option>

              {SERIES_CATEGORIES.map((series) => {

                const count = allTracks.filter((t) => t.topic === series.id).length

                return (

                  <option key={series.id} value={series.id}>

                    {series.emoji} {series.label}

                    {count > 0 ? ` (${count})` : ''}

                  </option>

                )

              })}

            </select>

            <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />

          </div>

          {selectedSeries !== 'All' && (

            <p className="mt-2 text-xs text-[var(--theme-muted)]">

              {SERIES_CATEGORIES.find((s) => s.id === selectedSeries)?.description}

            </p>

          )}

        </section>

      )}



      <section>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-0.5">
      <div className="mb-4 flex justify-end sm:mb-6">
        <Link
          to="/submit-audio?category=talks"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
        >
          <Upload size={16} /> Submit a talk
        </Link>
      </div>


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

        ) : (

          loading && allTracks.length === 0 ? (
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

          )

        )}

        </div>

      </section>

    </div>

  )

}


