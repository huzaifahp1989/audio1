import React, { useEffect, useMemo, useState } from 'react'
import { Heart, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { useFavorites } from '../context/FavoritesContext'
import NasheedTrackRow from '../components/NasheedTrackRow'
import TalkTrackRow from '../components/TalkTrackRow'

type Filter = 'all' | 'nasheeds' | 'talks'

function parseCategoryFilter(value: string | null): Filter {
  if (value === 'nasheeds' || value === 'talks') return value
  return 'all'
}

export default function FavoritesPage() {
  const { tracks, loading } = useAudioLibrary()
  const { resolveFavoriteTracks, favoriteCount } = useFavorites()
  const [searchParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>(() => parseCategoryFilter(searchParams.get('category')))

  useEffect(() => {
    setFilter(parseCategoryFilter(searchParams.get('category')))
  }, [searchParams])

  const favoriteTracks = useMemo(() => resolveFavoriteTracks(tracks), [resolveFavoriteTracks, tracks])

  const filtered = favoriteTracks.filter((t) => {
    if (filter === 'all') return true
    return t.category === filter
  })

  const nasheedCount = favoriteTracks.filter((t) => t.category === 'nasheeds').length
  const talksCount = favoriteTracks.filter((t) => t.category === 'talks').length

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-pink-600 to-red-600 p-6 sm:p-8 mb-6 sm:mb-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_0%,white,transparent_35%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm mb-3">
            <Sparkles size={14} /> Your collection
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Favorites</h1>
          <p className="mt-2 text-sm text-rose-100 max-w-md">
            Nasheeds and talks you&apos;ve saved. Tap the heart on any track to add it here — no sign-in needed.
          </p>
          <p className="mt-3 text-xs sm:text-sm text-rose-200">
            {favoriteCount} saved · {nasheedCount} nasheed{nasheedCount !== 1 ? 's' : ''} · {talksCount} talk{talksCount !== 1 ? 's' : ''}
          </p>
        </div>
      </section>

      <section className="mb-5 sm:mb-6">
        <p className="text-xs font-semibold text-[var(--theme-muted)] uppercase tracking-wider mb-2">Show</p>
        <div className="flex flex-wrap gap-2">
          {([
            ['all', `All (${favoriteCount})`],
            ['nasheeds', `Nasheeds (${nasheedCount})`],
            ['talks', `Talks (${talksCount})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === key
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                  : 'bg-[var(--theme-surface-2)] border border-[var(--theme-border)] text-[var(--theme-muted)] hover:bg-rose-50 hover:border-rose-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 className="text-sm font-bold text-[var(--theme-ink)] flex items-center gap-2">
            <Heart size={16} className="text-rose-500 fill-rose-500" />
            {filter === 'all' ? 'All favorites' : filter === 'nasheeds' ? 'Favorite nasheeds' : 'Favorite talks'}
          </h2>
          <span className="text-xs text-[var(--theme-muted)]">{filtered.length} shown</span>
        </div>

        {filtered.length > 0 ? (
          <div className="flex flex-col gap-2 sm:gap-3">
            {filtered.map((track, index) =>
              track.category === 'nasheeds' ? (
                <NasheedTrackRow key={track.id} track={track} tracks={filtered} index={index} />
              ) : (
                <TalkTrackRow key={track.id} track={track} tracks={filtered} index={index} />
              )
            )}
          </div>
        ) : loading && tracks.length === 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 rounded-3xl skeleton" />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-soft)]/50 px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--theme-surface-2)] shadow-sm">
              <Heart size={26} className="text-rose-300" />
            </div>
            <p className="text-sm font-medium text-[var(--theme-ink)]">
              {favoriteCount === 0
                ? 'No favorites yet.'
                : `No favorite ${filter === 'nasheeds' ? 'nasheeds' : 'talks'} yet.`}
            </p>
            <p className="mt-2 text-xs text-[var(--theme-muted)]">
              Browse{' '}
              <Link to="/nasheeds" className="text-rose-600 font-semibold hover:underline">
                Nasheeds
              </Link>{' '}
              or{' '}
              <Link to="/talks" className="text-rose-600 font-semibold hover:underline">
                Talks
              </Link>{' '}
              and tap the heart on any track.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
