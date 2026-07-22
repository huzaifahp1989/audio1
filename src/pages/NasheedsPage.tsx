import React, { useState, useEffect, useMemo } from 'react'
import { Music2, Search, ChevronDown } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackList from '../components/TrackList'
import { NASHEED_ARTISTS } from '../constants/categories'
import type { AudioTrack } from '../types'

const ARABIC_CHAR = /[\u0600-\u06FF]/

/** Known Arabic-language artists / traditional anasheed singers */
const ARABIC_ARTISTS = new Set([
  'traditional arabic',
  'إبراهيم الماجد',
  'ahmed bukhatir',
  'humood',
  'humood alkhudher',
  'maher zain',
  'mesut kurtis',
  'sami yusuf',
  'raef',
  'hamza namira',
  'raihan',
  'mishary rashid alafasy',
  'maher al-muaiqly',
  'mohamed absolution',
  'ahmed rajel',
])

const ARABIC_TITLE_HINT =
  /tal[a']?al|ya nabi|ya allah|subhan|allahu|allahumma|bismillah|qalbi|falasteen|aqsa|laytaka|walidd|ummat|hasbi|amantu|hala|marhaba|ghufran|la ilaha|inni muslim|hat al mona|nahalla|hiye daruna|ja.?al.?haq|يا |الله|سبحان|محمد|طلع|نبي|القرآن|غفران|رحمن|دارنا|الحق|منى/i

function isArabicNasheed(t: AudioTrack): boolean {
  if (t.language === 'arabic' || t.topic === 'arabic') return true
  if (ARABIC_CHAR.test(t.title) || ARABIC_CHAR.test(t.reciter || '')) return true
  if (ARABIC_ARTISTS.has((t.reciter || '').trim().toLowerCase()) && ARABIC_TITLE_HINT.test(t.title)) return true
  if (ARABIC_TITLE_HINT.test(t.title) && !/urdu|\(urdu\)/i.test(t.title)) return true
  return false
}

type LangFilter = 'all' | 'arabic' | 'other'

export default function NasheedsPage() {
  const { tracks, refresh } = useAudioLibrary()
  useEffect(() => { refresh() }, [])
  const allTracks = tracks.filter((t) => t.category === 'nasheeds')
  const [search, setSearch] = useState('')
  const [selectedArtist, setSelectedArtist] = useState<string>('all')
  const [langFilter, setLangFilter] = useState<LangFilter>('all')
  const [showArtistDropdown, setShowArtistDropdown] = useState(false)

  const arabicCount = useMemo(() => allTracks.filter(isArabicNasheed).length, [allTracks])

  const trackArtists = [...new Set(allTracks.map((t) => t.reciter).filter(Boolean))]
  const allArtists = [...new Set([...NASHEED_ARTISTS.filter(a => a !== 'Other'), ...trackArtists])].sort((a, b) =>
    a.localeCompare(b, 'ar')
  )

  const filtered = allTracks.filter((t) => {
    const matchesSearch = search
      ? t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.reciter.toLowerCase().includes(search.toLowerCase()) ||
        t.title.includes(search)
      : true

    const matchesArtist = selectedArtist !== 'all'
      ? t.reciter === selectedArtist
      : true

    const arabic = isArabicNasheed(t)
    const matchesLang =
      langFilter === 'all' ? true : langFilter === 'arabic' ? arabic : !arabic

    return matchesSearch && matchesArtist && matchesLang
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center shadow-sm">
            <Music2 size={22} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Nasheeds</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {allTracks.length} nasheed{allTracks.length !== 1 ? 's' : ''}
              {arabicCount > 0 && (
                <span className="text-emerald-600"> · {arabicCount} Arabic</span>
              )}
            </p>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search… ابحث"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 w-56 shadow-sm"
          />
        </div>
      </div>

      {/* Language filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(
          [
            { id: 'all' as const, label: 'All', count: allTracks.length },
            { id: 'arabic' as const, label: 'العربية Arabic', count: arabicCount },
            { id: 'other' as const, label: 'Other languages', count: allTracks.length - arabicCount },
          ]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setLangFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              langFilter === tab.id
                ? tab.id === 'arabic'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'bg-violet-600 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                langFilter === tab.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Artist Filter Dropdown */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="relative">
          <button
            onClick={() => setShowArtistDropdown(!showArtistDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-violet-300 hover:bg-violet-50 transition-all min-w-[180px]"
          >
            <span>🎤 {selectedArtist === 'all' ? 'All Artists' : selectedArtist}</span>
            <ChevronDown size={16} className={`ml-auto transition-transform ${showArtistDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showArtistDropdown && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-80 overflow-y-auto">
              <div className="p-2">
                <button
                  onClick={() => { setSelectedArtist('all'); setShowArtistDropdown(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedArtist === 'all' ? 'bg-violet-100 text-violet-700' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>🎤</span>
                  <span className="flex-1 text-left">All Artists</span>
                </button>

                {allArtists.map((artist) => {
                  const count = allTracks.filter((t) => t.reciter === artist).length
                  return (
                    <button
                      key={artist}
                      onClick={() => { setSelectedArtist(artist); setShowArtistDropdown(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedArtist === artist ? 'bg-violet-100 text-violet-700' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>🎵</span>
                      <span className={`flex-1 text-left truncate ${ARABIC_CHAR.test(artist) ? 'font-semibold' : ''}`} dir={ARABIC_CHAR.test(artist) ? 'rtl' : 'ltr'}>
                        {artist}
                      </span>
                      {count > 0 && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{count}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {selectedArtist !== 'all' && (
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm">
              <span>🎵</span>
              <span dir={ARABIC_CHAR.test(selectedArtist) ? 'rtl' : 'ltr'}>{selectedArtist}</span>
              <button onClick={() => setSelectedArtist('all')} className="hover:text-violet-900 ml-1">×</button>
            </span>
            <button
              onClick={() => setSelectedArtist('all')}
              className="text-sm text-slate-500 hover:text-violet-600 underline"
            >
              Clear filter
            </button>
          </>
        )}
      </div>

      {langFilter === 'arabic' && filtered.length > 0 && (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white shadow-md">
          <p className="font-bold text-lg" dir="rtl">أناشيد عربية</p>
          <p className="text-white/85 text-sm mt-0.5">
            {filtered.length} Arabic nasheed{filtered.length !== 1 ? 's' : ''} — classic anasheed & modern voices
          </p>
        </div>
      )}

      <TrackList
        tracks={filtered}
        emptyMessage={
          langFilter === 'arabic'
            ? 'No Arabic nasheeds found.'
            : selectedArtist !== 'all'
              ? 'No nasheeds found for the selected artist.'
              : 'No nasheeds uploaded yet.'
        }
      />
    </div>
  )
}
