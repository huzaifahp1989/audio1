import React, { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Mic, Star, RefreshCw } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackList from '../components/TrackList'
import { KIDS_CATEGORIES } from '../constants/categories'
import type { AudioCategory, AudioTrack, NasheedLanguage } from '../types'
import { isKidsCategory, isRecordedTrack } from '../types'

type KidsTab = 'all' | 'recorded' | AudioCategory
type LangFilter = NasheedLanguage | 'all'

const ARABIC_CHAR = /[\u0600-\u06FF]/

function getKidsLanguage(t: AudioTrack): NasheedLanguage {
  const lang = (t.language || t.topic || '').toLowerCase()
  if (lang === 'arabic' || lang === 'english' || lang === 'urdu') return lang
  if (ARABIC_CHAR.test(t.title || '') || ARABIC_CHAR.test(t.reciter || '')) return 'arabic'
  return 'english'
}

/** Detect kids content even if it was uploaded under quran/nasheeds by mistake. */
function looksLikeKidsTrack(track: AudioTrack): boolean {
  if (isKidsCategory(track.category)) return true
  if (track.source === 'kids-studio') return true
  const title = (track.title || '').toLowerCase()
  const file = (track.fileName || '').toLowerCase()
  const hay = `${title} ${file}`
  return (
    hay.includes('for children') ||
    hay.includes('for kids') ||
    hay.includes('(kids)') ||
    hay.includes('kids quran') ||
    hay.includes('learn the quran for children') ||
    hay.includes('juz amma compilation (kids)') ||
    hay.includes('islamic poem for kids') ||
    hay.includes('islamic songs for kids') ||
    hay.includes("let's pray") ||
    hay.includes('lets pray') ||
    title === 'allah made everything' ||
    title === 'hasbi rabbi jallallah' ||
    title === 'halal story' ||
    title === 'a is for allah' ||
    title === 'mum and dad' ||
    title === 'my brother' ||
    title.startsWith('aisha') ||
    hay.includes('kids, vocals only') ||
    (hay.includes('vocals only') && hay.includes('kids'))
  )
}

function kidsTabForTrack(track: AudioTrack): AudioCategory {
  if (isKidsCategory(track.category)) return track.category
  if (track.category === 'nasheeds') return 'kids-nasheeds'
  if (track.category === 'quran') return 'kids-quran'
  const title = (track.title || '').toLowerCase()
  if (title.includes('story')) return 'kids-stories'
  if (title.includes('nasheed') || title.includes('poem') || title === 'allah made everything' || title === 'hasbi rabbi jallallah') {
    return 'kids-nasheeds'
  }
  return 'kids-quran'
}

function normalizeKidsTrack(t: AudioTrack): AudioTrack {
  if (isKidsCategory(t.category)) {
    return { ...t, reciter: t.reciter?.trim() || 'Kids Audio' }
  }
  return {
    ...t,
    category: kidsTabForTrack(t),
    reciter: t.reciter?.trim() || 'Kids Audio',
  }
}

export default function KidsPage() {
  const { tracks, loading, refresh } = useAudioLibrary()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const langParam = searchParams.get('lang') as LangFilter | null

  useEffect(() => { refresh() }, [])

  const initialTab = ((): KidsTab => {
    if (tabParam === 'all' || tabParam === 'recorded') return tabParam
    if (tabParam && isKidsCategory(tabParam)) return tabParam as AudioCategory
    return 'all'
  })()

  const [activeTab, setActiveTab] = useState<KidsTab>(initialTab)
  const [langFilter, setLangFilter] = useState<LangFilter>(
    langParam === 'arabic' || langParam === 'english' || langParam === 'urdu' ? langParam : 'all'
  )

  useEffect(() => {
    if (tabParam === 'all' || tabParam === 'recorded' || (tabParam && isKidsCategory(tabParam))) {
      setActiveTab(tabParam as KidsTab)
    }
  }, [tabParam])

  useEffect(() => {
    if (langParam === 'arabic' || langParam === 'english' || langParam === 'urdu' || langParam === 'all') {
      setLangFilter(langParam)
    }
  }, [langParam])

  const kidsTracks = useMemo(() => {
    return tracks.filter(looksLikeKidsTrack).map(normalizeKidsTrack)
  }, [tracks])

  const recordedTracks = useMemo(() => {
    return tracks
      .filter((t) => {
        if (!isRecordedTrack(t)) return false
        return (
          isKidsCategory(t.category) ||
          t.source === 'kids-studio' ||
          t.source === 'record' ||
          looksLikeKidsTrack(t)
        )
      })
      .map(normalizeKidsTrack)
  }, [tracks])

  const kidsNasheedTracks = useMemo(
    () => kidsTracks.filter((t) => t.category === 'kids-nasheeds'),
    [kidsTracks]
  )

  const langCounts = useMemo(() => {
    const c = { all: kidsNasheedTracks.length, arabic: 0, english: 0, urdu: 0 }
    for (const t of kidsNasheedTracks) c[getKidsLanguage(t)]++
    return c
  }, [kidsNasheedTracks])

  const filteredTracks = useMemo(() => {
    let list =
      activeTab === 'all'
        ? kidsTracks
        : activeTab === 'recorded'
          ? recordedTracks
          : kidsTracks.filter((t) => t.category === activeTab)

    if (langFilter !== 'all') {
      if (activeTab === 'kids-nasheeds' || activeTab === 'all') {
        list = list.filter((t) => {
          if (activeTab === 'all' && t.category !== 'kids-nasheeds') return true
          return getKidsLanguage(t) === langFilter
        })
      }
    }

    return [...list].sort((a, b) => {
      const aAr = getKidsLanguage(a) === 'arabic' ? 0 : 1
      const bAr = getKidsLanguage(b) === 'arabic' ? 0 : 1
      if (aAr !== bAr) return aAr - bAr
      return (b.uploadedAt || 0) - (a.uploadedAt || 0)
    })
  }, [kidsTracks, recordedTracks, activeTab, langFilter])

  const selectTab = (tab: KidsTab) => {
    setActiveTab(tab)
    const params: Record<string, string> = {}
    if (tab !== 'all') params.tab = tab
    if (langFilter !== 'all' && (tab === 'all' || tab === 'kids-nasheeds')) params.lang = langFilter
    setSearchParams(params)
  }

  const selectLang = (lang: LangFilter) => {
    setLangFilter(lang)
    const params: Record<string, string> = {}
    if (lang !== 'all') {
      setActiveTab('kids-nasheeds')
      params.tab = 'kids-nasheeds'
      params.lang = lang
    } else if (activeTab !== 'all') {
      params.tab = activeTab
    }
    setSearchParams(params)
  }

  const activeMeta =
    activeTab === 'all'
      ? { label: 'All Kids Audio', emoji: '⭐', color: 'from-amber-500 to-orange-500' }
      : activeTab === 'recorded'
        ? { label: 'Your Recordings', emoji: '🎙️', color: 'from-violet-500 to-fuchsia-500' }
        : KIDS_CATEGORIES.find((c) => c.id === activeTab)!

  const showLangFilters = activeTab === 'all' || activeTab === 'kids-nasheeds'

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shadow-sm">
            <Star size={22} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Kids Audio</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {loading
                ? 'Loading kids recordings…'
                : `${kidsTracks.length} in library · ${langCounts.arabic} Arabic nasheeds · ${recordedTracks.length} recorded`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <Link
            to="/record?category=kids-stories"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100"
          >
            <Mic size={16} />
            Record page
          </Link>
          <Link
            to="/kids-recordings/studio"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-md hover:from-amber-600 hover:to-orange-600 transition-all"
          >
            <Mic size={18} />
            Kids Studio
          </Link>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => selectTab('all')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
            activeTab === 'all'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <span className="text-base">⭐</span>
          All
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {kidsTracks.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => selectTab('recorded')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
            activeTab === 'recorded'
              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <span className="text-base">🎙️</span>
          Your Recordings
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'recorded' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {recordedTracks.length}
          </span>
        </button>
        {KIDS_CATEGORIES.map(({ id, label, emoji, color }) => {
          const count = kidsTracks.filter((t) => t.category === id).length
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === id
                  ? `bg-gradient-to-r ${color} text-white shadow-md`
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span className="text-base">{emoji}</span>
              {label}
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {showLangFilters && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Nasheed language</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all' as const, label: 'All languages', activeClass: 'bg-slate-800 text-white shadow-md' },
                { id: 'arabic' as const, label: 'العربية · Arabic', activeClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' },
                { id: 'english' as const, label: 'English', activeClass: 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectLang(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  langFilter === tab.id
                    ? tab.activeClass
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                    langFilter === tab.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {langCounts[tab.id]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`rounded-xl p-5 mb-6 bg-gradient-to-r ${activeMeta.color} shadow-md flex items-center gap-3`}>
        <span className="text-3xl">{activeMeta.emoji}</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-white text-lg">
            {activeTab === 'kids-nasheeds' && langFilter === 'arabic'
              ? 'Kids Arabic Nasheeds'
              : activeTab === 'kids-nasheeds' && langFilter === 'english'
                ? 'Kids English Nasheeds'
                : activeMeta.label}
          </h2>
          <p className="text-white/80 text-sm">
            {loading
              ? 'Loading…'
              : `${filteredTracks.length} audio file${filteredTracks.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {activeTab === 'recorded' && !loading && recordedTracks.length === 0 && (
        <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 text-sm text-violet-800">
          <p className="font-semibold mb-1">No uploaded recordings yet</p>
          <p className="text-violet-700 mb-3">
            Use <strong>Kids Studio</strong> or the <strong>Record</strong> page and choose a Kids category
            (Stories / Kids Quran / Kids Nasheeds), then Upload — not only Save Draft.
            Drafts stay on this device only and won’t appear here.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/kids-recordings/studio"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white font-semibold text-xs"
            >
              Open Kids Studio
            </Link>
            <Link
              to="/record?category=kids-stories"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 text-white font-semibold text-xs"
            >
              Open Record (Kids Stories)
            </Link>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">Loading kids audio…</div>
      ) : (
        <TrackList
          tracks={filteredTracks}
          emptyMessage={
            activeTab === 'recorded'
              ? 'No recordings uploaded yet — record in Kids Studio or Record, pick a Kids category, then Upload.'
              : langFilter === 'arabic' && filteredTracks.length === 0
                ? 'No Arabic kids nasheeds found — try All languages.'
                : kidsTracks.length === 0
                  ? 'No kids recordings yet — open Kids Studio to make the first one!'
                  : `No ${activeMeta.label} yet — try All, or open Kids Studio to record one.`
          }
        />
      )}
    </div>
  )
}
