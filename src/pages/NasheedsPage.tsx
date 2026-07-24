import React, { useState, useEffect, useMemo } from 'react'
import { Music2, Search, ChevronDown } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackList from '../components/TrackList'
import { NASHEED_ARTISTS } from '../constants/categories'
import type { AudioTrack, NasheedLanguage } from '../types'

const ARABIC_CHAR = /[\u0600-\u06FF]/

export const LANGUAGE_TABS: {
  id: NasheedLanguage | 'all'
  label: string
  labelNative: string
  color: string
  activeClass: string
}[] = [
  { id: 'all', label: 'All', labelNative: 'All', color: 'violet', activeClass: 'bg-violet-600 text-white shadow-md' },
  { id: 'arabic', label: 'Arabic', labelNative: 'العربية', color: 'emerald', activeClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' },
  { id: 'english', label: 'English', labelNative: 'English', color: 'sky', activeClass: 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md' },
  { id: 'urdu', label: 'Urdu', labelNative: 'اردو', color: 'amber', activeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' },
]

/** Resolve a track's language category (stored field first, then light fallback). */
export function getNasheedLanguage(t: AudioTrack): NasheedLanguage {
  const lang = (t.language || t.topic || '').toLowerCase()
  if (lang === 'arabic' || lang === 'english' || lang === 'urdu') return lang
  if (ARABIC_CHAR.test(t.title) || ARABIC_CHAR.test(t.reciter || '')) return 'arabic'
  return 'english'
}

/** Vocals-only / without music: explicit flag or title/topic hints. */
export function isVocalsOnlyNasheed(t: AudioTrack): boolean {
  if (t.vocalsOnly === true) return true
  const hay = `${t.title || ''} ${t.topic || ''} ${t.fileName || ''}`.toLowerCase()
  return (
    hay.includes('vocals only') ||
    hay.includes('vocal only') ||
    hay.includes('a cappella') ||
    hay.includes('acapella') ||
    hay.includes('without music') ||
    hay.includes('no music') ||
    hay.includes('no instrument')
  )
}

type LangFilter = NasheedLanguage | 'all'

export default function NasheedsPage() {
  const { tracks, refresh } = useAudioLibrary()
  useEffect(() => { refresh() }, [])
  const allTracks = tracks.filter((t) => t.category === 'nasheeds')
  const [search, setSearch] = useState('')
  const [selectedArtist, setSelectedArtist] = useState<string>('all')
  const [langFilter, setLangFilter] = useState<LangFilter>('all')
  const [vocalsOnly, setVocalsOnly] = useState(false)
  const [showArtistDropdown, setShowArtistDropdown] = useState(false)

  const counts = useMemo(() => {
    const c = { all: allTracks.length, arabic: 0, english: 0, urdu: 0, vocalsOnly: 0 }
    for (const t of allTracks) {
      c[getNasheedLanguage(t)]++
      if (isVocalsOnlyNasheed(t)) c.vocalsOnly++
    }
    return c
  }, [allTracks])

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

    const lang = getNasheedLanguage(t)
    const matchesLang = langFilter === 'all' ? true : lang === langFilter
    const matchesVocals = vocalsOnly ? isVocalsOnlyNasheed(t) : true

    return matchesSearch && matchesArtist && matchesLang && matchesVocals
  })

  const activeTab = LANGUAGE_TABS.find((t) => t.id === langFilter)!

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
              <span className="text-slate-400"> · </span>
              <span className="text-emerald-600">{counts.arabic} Arabic</span>
              <span className="text-slate-400"> · </span>
              <span className="text-sky-600">{counts.english} English</span>
              <span className="text-slate-400"> · </span>
              <span className="text-amber-600">{counts.urdu} Urdu</span>
              <span className="text-slate-400"> · </span>
              <span className="text-rose-600">{counts.vocalsOnly} without music</span>
            </p>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search… ابحث · تلاش"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 w-56 shadow-sm"
          />
        </div>
      </div>

      {/* Language categories */}
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Language</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {LANGUAGE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLangFilter(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                langFilter === tab.id
                  ? tab.activeClass
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span dir={tab.id === 'arabic' || tab.id === 'urdu' ? 'rtl' : 'ltr'}>
                {tab.id === 'all' ? tab.label : `${tab.labelNative}`}
              </span>
              {tab.id !== 'all' && tab.labelNative !== tab.label && (
                <span className="opacity-80 font-normal"> · {tab.label}</span>
              )}
              <span
                className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  langFilter === tab.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setVocalsOnly((v) => !v)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              vocalsOnly
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Without music
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                vocalsOnly ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {counts.vocalsOnly}
            </span>
          </button>
          <p className="text-xs text-slate-400 mt-1.5">Vocals-only / a cappella nasheeds (no instruments)</p>
        </div>
      </div>

      {/* Artist Filter */}
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

      {langFilter !== 'all' && filtered.length > 0 && (
        <div
          className={`mb-6 rounded-xl p-4 text-white shadow-md ${
            langFilter === 'arabic'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
              : langFilter === 'english'
                ? 'bg-gradient-to-r from-sky-600 to-blue-600'
                : 'bg-gradient-to-r from-amber-500 to-orange-500'
          }`}
        >
          <p
            className="font-bold text-lg"
            dir={langFilter === 'english' ? 'ltr' : 'rtl'}
          >
            {activeTab.labelNative} Nasheeds
          </p>
          <p className="text-white/85 text-sm mt-0.5">
            {filtered.length} track{filtered.length !== 1 ? 's' : ''} in {activeTab.label}
          </p>
        </div>
      )}

      <TrackList
        tracks={filtered}
        emptyMessage={
          vocalsOnly
            ? 'No vocals-only (without music) nasheeds found for this filter.'
            : langFilter !== 'all'
            ? `No ${activeTab.label} nasheeds found.`
            : selectedArtist !== 'all'
              ? 'No nasheeds found for the selected artist.'
              : 'No nasheeds uploaded yet.'
        }
      />
    </div>
  )
}
