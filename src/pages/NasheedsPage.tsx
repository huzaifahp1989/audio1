import React, { useMemo, useState } from 'react'

import { Link } from 'react-router-dom'
import { Music2, Search, Eye, Sparkles, ChevronDown, Heart, Upload, ListMusic, FolderOpen, Compass } from 'lucide-react'
import { useFavorites } from '../context/FavoritesContext'

import { useAudioLibrary } from '../hooks/useAudioLibrary'

import CategoryUploadPanel from '../components/CategoryUploadPanel'

import ContributorUploadNotice from '../components/ContributorUploadNotice'

import NasheedRequestPanel from '../components/NasheedRequestPanel'

import NasheedTrackRow from '../components/NasheedTrackRow'

import { NASHEED_ARTISTS } from '../constants/categories'

import { buildContributorOptions, contributorMatches, countTracksForContributor } from '../lib/contributorMatch'

import { formatViews } from '../lib/views'
import { sortTracks, type SortOption } from '../lib/trackSort'
import SortFilterBar from '../components/SortFilterBar'
import PlayAllButton from '../components/PlayAllButton'
import SpeakerProfileLink from '../components/SpeakerProfileLink'
import { buildReadyMadeNasheedPlaylists, getNasheedLanguage, type NasheedLanguage } from '../lib/readyMadePlaylists'

type NasheedLanguageCategory = 'all' | NasheedLanguage

export default function NasheedsPage() {

  const { tracks, loading } = useAudioLibrary()
  const { resolveFavoriteTracks } = useFavorites()
  const nasheedFavoriteCount = useMemo(
    () => resolveFavoriteTracks(tracks).filter((t) => t.category === 'nasheeds').length,
    [resolveFavoriteTracks, tracks]
  )

  const allTracks = tracks.filter((t) => t.category === 'nasheeds')
  const readyMadePlaylists = useMemo(() => buildReadyMadeNasheedPlaylists(tracks), [tracks])

  const [search, setSearch] = useState('')

  const [selectedArtist, setSelectedArtist] = useState<string>('All')
  const [selectedCategory, setSelectedCategory] = useState<NasheedLanguageCategory>('all')
  const [sort, setSort] = useState<SortOption>('newest')



  const artistOptions = useMemo(

    () => buildContributorOptions(allTracks, NASHEED_ARTISTS),

    [allTracks]

  )



  const filtered = allTracks.filter((t) => {

    const q = search.trim().toLowerCase()

    const matchesSearch = q

      ? t.title.toLowerCase().includes(q) ||

        (t.reciter || '').toLowerCase().includes(q)

      : true

    const matchesArtist = contributorMatches(t.reciter, selectedArtist)
    const language = getNasheedLanguage(t)
    const matchesCategory =
      selectedCategory === 'all'
        ? true
        : language === selectedCategory

    return matchesSearch && matchesArtist && matchesCategory

  })

  const sortedFiltered = useMemo(() => sortTracks(filtered, sort), [filtered, sort])

  const totalViews = allTracks.reduce((sum, t) => sum + (t.views || 0), 0)

  const artistKey = selectedArtist === 'All' ? 'all' : selectedArtist



  return (

    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-blue-600 to-blue-700 p-6 sm:p-8 mb-6 sm:mb-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_0%,white,transparent_35%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm mb-3">
              <Sparkles size={14} /> Islamic Nasheeds
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Nasheeds</h1>
            <p className="mt-2 text-sm text-sky-100 max-w-md">
              Browse by artist, listen instantly, or request a nasheed you&apos;d like added.
            </p>
            <p className="mt-3 text-xs sm:text-sm text-sky-200 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{allTracks.length} track{allTracks.length !== 1 ? 's' : ''}</span>
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

              placeholder="Search title or artist…"

              value={search}

              onChange={(e) => setSearch(e.target.value)}

              className="w-full rounded-2xl border-0 bg-white/95 text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2.5 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"

            />

          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link
              to="/submit-audio?category=nasheeds"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-blue-700 shadow-lg"
            >
              <Upload size={17} /> Guided upload
            </Link>
            <Link
              to="/admin?upload=nasheeds"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-blue-700 shadow-lg"
            >
              <FolderOpen size={17} /> Add from desktop
            </Link>
            <Link
              to="/admin?upload=nasheeds&tab=youtube"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/15 px-4 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/25"
            >
              <Compass size={17} /> Find more tracks
            </Link>
          </div>

        </div>

      </section>



      <ContributorUploadNotice variant="nasheeds" className="mb-4 sm:mb-6" />

      <CategoryUploadPanel category="nasheeds" className="mb-4 sm:mb-6" />

      <NasheedRequestPanel defaultArtist={artistKey} className="mb-6 sm:mb-8" />

      {readyMadePlaylists.length > 0 && (
        <section className="mb-6 sm:mb-8">
          <div className="mb-3 flex items-center gap-2">
            <ListMusic size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-[var(--theme-ink)]">Ready-made playlists</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {readyMadePlaylists.map((playlist) => (
              <div key={playlist.id} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-sm">
                <p className="font-bold text-[var(--theme-ink)]">{playlist.name}</p>
                <p className="mt-1 text-xs text-[var(--theme-muted)]">{playlist.description} · {playlist.tracks.length} tracks</p>
                <PlayAllButton tracks={playlist.tracks} allowSponsoredBreaks className="mt-3 w-full !from-blue-600 !to-sky-500" />
              </div>
            ))}
          </div>
        </section>
      )}



      <section className="mb-5 sm:mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Browse</p>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/favorites?category=nasheeds"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--theme-surface-2)] border border-[var(--theme-border)] text-[var(--theme-muted)] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-all"
          >
            <Heart size={15} className="text-rose-500" />
            Favorites
            {nasheedFavoriteCount > 0 && (
              <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                {nasheedFavoriteCount}
              </span>
            )}
          </Link>
        </div>
      </section>

      <section className="mb-5 sm:mb-6">
        <label htmlFor="nasheed-category" className="text-xs font-semibold text-[var(--theme-muted)] uppercase tracking-wider mb-2 block">
          Category
        </label>
        <div className="relative max-w-md">
          <select
            id="nasheed-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as NasheedLanguageCategory)}
            className="w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] pl-4 pr-10 py-2.5 text-sm font-semibold text-[var(--theme-ink)] shadow-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Nasheeds</option>
            <option value="english">English Nasheeds ({allTracks.filter((track) => getNasheedLanguage(track) === 'english').length})</option>
            <option value="urdu">Urdu Nasheeds ({allTracks.filter((track) => getNasheedLanguage(track) === 'urdu').length})</option>
            <option value="arabic">Arabic Nasheeds ({allTracks.filter((track) => getNasheedLanguage(track) === 'arabic').length})</option>
            <option value="other">Other Nasheeds ({allTracks.filter((track) => getNasheedLanguage(track) === 'other').length})</option>
          </select>
          <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />
        </div>
      </section>



      <section className="mb-5 sm:mb-6">

        <label htmlFor="nasheed-artist" className="text-xs font-semibold text-[var(--theme-muted)] uppercase tracking-wider mb-2 block">

          Artist

        </label>

        <div className="relative max-w-md">

          <select

            id="nasheed-artist"

            value={selectedArtist}

            onChange={(e) => setSelectedArtist(e.target.value)}

            className="w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] pl-4 pr-10 py-2.5 text-sm font-semibold text-[var(--theme-ink)] shadow-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"

          >

            {artistOptions.map((artist) => {

              const count = countTracksForContributor(allTracks, artist)

              return (

                <option key={artist} value={artist}>

                  {artist}

                  {count > 0 ? ` (${count})` : ''}

                </option>

              )

            })}

          </select>

          <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />

        </div>
        <SpeakerProfileLink name={selectedArtist} className="mt-2" />

      </section>



      <section>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-0.5">

          <h2 className="text-sm font-bold text-[var(--theme-ink)]">

            {selectedArtist === 'All'
              ? selectedCategory === 'all'
                ? 'All Nasheeds'
                : `${selectedCategory.charAt(0).toUpperCase()}${selectedCategory.slice(1)} Nasheeds`
              : selectedArtist}

          </h2>

          <div className="flex items-center gap-2">
            <PlayAllButton tracks={sortedFiltered} allowSponsoredBreaks className="!from-violet-600 !to-indigo-600" />
            <span className="text-xs text-[var(--theme-muted)]">{sortedFiltered.length} shown</span>
          </div>

        </div>

        <SortFilterBar sort={sort} onSortChange={setSort} count={sortedFiltered.length} label="nasheeds" />

        <div className="mt-3">



        {sortedFiltered.length > 0 ? (

          <div className="flex flex-col gap-2 sm:gap-3">

            {sortedFiltered.map((track, index) => (

              <NasheedTrackRow key={track.id} track={track} tracks={sortedFiltered} index={index} />

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

              <Music2 size={26} className="text-[var(--theme-muted)]" />

            </div>

            <p className="text-sm font-medium text-[var(--theme-ink)]">

              {search

                ? 'No nasheeds match your search.'

                : selectedArtist !== 'All'

                  ? `No tracks for ${selectedArtist} yet.`

                  : selectedCategory === 'all'

                    ? 'No nasheeds uploaded yet.'

                    : `No ${selectedCategory} nasheeds found yet.`}

            </p>

            {selectedArtist !== 'All' && !search && (

              <p className="mt-2 text-xs text-[var(--theme-muted)]">

                Use &quot;Request a Nasheed&quot; above to ask for this artist.

              </p>

            )}

          </div>

          )

        )}

        </div>

      </section>

    </div>

  )

}


