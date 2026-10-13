import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Eye, Sparkles, ChevronDown, Baby, GraduationCap, Upload } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackList from '../components/TrackList'
import CategoryUploadPanel from '../components/CategoryUploadPanel'
import SpeakerProfileLink from '../components/SpeakerProfileLink'
import SortFilterBar from '../components/SortFilterBar'
import PlayAllButton from '../components/PlayAllButton'
import { QURAN_RECITERS } from '../constants/categories'
import { formatViews } from '../lib/views'
import { sortTracks, type SortOption } from '../lib/trackSort'

export default function QuranPage() {
  const { tracks, loading } = useAudioLibrary()
  const quranTracks = tracks.filter((t) => t.category === 'quran')
  const kidsQuranTracks = tracks.filter((t) => t.category === 'kids-quran')
  const [selected, setSelected] = useState<string>('All')
  const [sort, setSort] = useState<SortOption>('newest')
  const [kidsSort, setKidsSort] = useState<SortOption>('newest')

  const filteredTracks =
    selected === 'All' ? quranTracks : quranTracks.filter((t) => t.reciter === selected)

  const sortedFiltered = useMemo(() => sortTracks(filteredTracks, sort), [filteredTracks, sort])
  const sortedKids = useMemo(() => sortTracks(kidsQuranTracks, kidsSort), [kidsQuranTracks, kidsSort])

  const recitersWithTracks = ['All', ...QURAN_RECITERS.filter((r) => r !== 'Other')]

  const totalViews = quranTracks.reduce((sum, t) => sum + (t.views || 0), 0)
  const kidsTotalViews = kidsQuranTracks.reduce((sum, t) => sum + (t.views || 0), 0)

  return (
    <div className="max-w-5xl mx-auto px-2.5 sm:px-4 py-5 sm:py-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-blue-600 to-blue-700 p-4 sm:p-8 mb-5 sm:mb-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_0%,white,transparent_35%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm mb-2.5 sm:mb-3">
            <Sparkles size={12} /> Holy Quran
          </div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Quran Recitations</h1>
          <p className="mt-1.5 sm:mt-2 text-[13px] sm:text-sm text-sky-100 max-w-md">
            Listen to beautiful recitations from renowned qaris around the world.
          </p>
          <p className="mt-2.5 sm:mt-3 text-[11px] sm:text-sm text-sky-200 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{quranTracks.length} recitation{quranTracks.length !== 1 ? 's' : ''}</span>
            <span className="inline-flex items-center gap-1">
              <Eye size={10} />
              {formatViews(totalViews)} plays
            </span>
          </p>
          <Link
            to="/submit-audio?category=quran"
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-sky-50"
          >
            <Upload size={16} /> Submit Quran audio
          </Link>
        </div>
      </section>

      <CategoryUploadPanel category="quran" className="mb-5 sm:mb-8" />

      {/* Kids Quran Section (first, prominent) */}
      <section className="mb-6 sm:mb-10 rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-3.5 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3 sm:mb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shrink-0">
              <Baby size={18} className="sm:hidden text-white" />
              <GraduationCap size={22} className="hidden sm:block text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] sm:text-xl font-bold text-emerald-900 flex items-center gap-2">
                Kids Quran
                <span className="inline-block rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                  For Children
                </span>
              </h2>
              <p className="text-[11px] sm:text-sm text-emerald-700/80 mt-0.5">
                Simple, kid-friendly Quran recitations to help children learn and memorise.
              </p>
              <p className="text-[10px] sm:text-xs text-emerald-700/70 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{kidsQuranTracks.length} track{kidsQuranTracks.length !== 1 ? 's' : ''}</span>
                <span className="inline-flex items-center gap-1">
                  <Eye size={9} />
                  {formatViews(kidsTotalViews)} plays
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PlayAllButton
              tracks={sortedKids}
              allowSponsoredBreaks
              className="!from-emerald-500 !to-teal-600 !py-2 !px-3 sm:!px-4 !text-xs sm:!text-sm"
            />
          </div>
        </div>

        <SortFilterBar sort={kidsSort} onSortChange={setKidsSort} count={sortedKids.length} label="kids tracks" compact />

        <div className="mt-3">
          <TrackList
            tracks={sortedKids}
            loading={loading && kidsQuranTracks.length === 0}
            emptyMessage="No Kids Quran tracks uploaded yet. Upload child-friendly recitations with category 'Kids - Quran'."
          />
        </div>

        <div className="mt-4 pt-4 border-t border-emerald-100/80">
          <CategoryUploadPanel category="kids-quran" className="!mb-0" />
        </div>
      </section>

      {/* Main Reciters Section */}
      <section className="mb-5 sm:mb-8">
        <label htmlFor="quran-reciter" className="text-[11px] font-semibold text-[var(--theme-muted)] uppercase tracking-wider mb-2 block">
          Reciter
        </label>
        <div className="relative max-w-md">
          <select
            id="quran-reciter"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] pl-3.5 pr-10 py-2.5 text-[13px] font-semibold text-[var(--theme-ink)] shadow-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            {recitersWithTracks.map((reciter) => {
              const count =
                reciter === 'All'
                  ? quranTracks.length
                  : quranTracks.filter((t) => t.reciter === reciter).length
              return (
                <option key={reciter} value={reciter}>
                  {reciter}
                  {count > 0 ? ` (${count})` : ''}
                </option>
              )
            })}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-muted)]" />
        </div>
        <SpeakerProfileLink name={selected} className="mt-2" />
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-0.5">
          <h2 className="text-[13px] sm:text-sm font-bold text-[var(--theme-ink)] flex items-center gap-2">
            <BookOpen size={15} className="sm:w-4 sm:h-4 text-blue-600" />
            {selected === 'All' ? 'All Recitations' : selected}
          </h2>
          <div className="flex items-center gap-2">
            <PlayAllButton tracks={sortedFiltered} allowSponsoredBreaks className="!from-sky-500 !to-blue-600" />
            <span className="text-[11px] text-[var(--theme-muted)]">{sortedFiltered.length} shown</span>
          </div>
        </div>

        <SortFilterBar sort={sort} onSortChange={setSort} count={sortedFiltered.length} label="recitations" compact />

        <div className="mt-3">
          <TrackList
            tracks={sortedFiltered}
            loading={loading && quranTracks.length === 0}
            emptyMessage={
              selected === 'All'
                ? 'No Quran recitations uploaded yet.'
                : `No recitations uploaded for ${selected} yet.`
            }
          />
        </div>
      </section>
    </div>
  )
}
