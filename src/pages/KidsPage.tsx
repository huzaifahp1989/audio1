import React, { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Mic, Star, RefreshCw } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackList from '../components/TrackList'
import { KIDS_CATEGORIES } from '../constants/categories'
import type { AudioCategory, AudioTrack } from '../types'

type KidsTab = 'all' | AudioCategory

function isKidsCategory(category: string): boolean {
  return category === 'kids-stories' || category === 'kids-quran' || category === 'kids-nasheeds'
}

/** Detect kids content even if it was uploaded under quran/nasheeds by mistake. */
function looksLikeKidsTrack(track: AudioTrack): boolean {
  if (isKidsCategory(track.category)) return true
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
    title === 'allah made everything' ||
    title === 'hasbi rabbi jallallah' ||
    title === 'halal story'
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

export default function KidsPage() {
  const { tracks, loading, refresh } = useAudioLibrary()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')

  const initialTab = ((): KidsTab => {
    if (tabParam === 'all') return 'all'
    if (tabParam && isKidsCategory(tabParam)) return tabParam as AudioCategory
    return 'all'
  })()

  const [activeTab, setActiveTab] = useState<KidsTab>(initialTab)

  useEffect(() => {
    if (tabParam === 'all' || (tabParam && isKidsCategory(tabParam))) {
      setActiveTab(tabParam as KidsTab)
    }
  }, [tabParam])

  const kidsTracks = useMemo(() => {
    return tracks
      .filter(looksLikeKidsTrack)
      .map((t) =>
        isKidsCategory(t.category)
          ? t
          : { ...t, category: kidsTabForTrack(t), reciter: t.reciter?.trim() || 'Kids Audio' }
      )
  }, [tracks])

  const filteredTracks = useMemo(() => {
    if (activeTab === 'all') return kidsTracks
    return kidsTracks.filter((t) => t.category === activeTab)
  }, [kidsTracks, activeTab])

  const selectTab = (tab: KidsTab) => {
    setActiveTab(tab)
    setSearchParams(tab === 'all' ? {} : { tab })
  }

  const activeMeta =
    activeTab === 'all'
      ? { label: 'All Kids Audio', emoji: '⭐', color: 'from-amber-500 to-orange-500' }
      : KIDS_CATEGORIES.find((c) => c.id === activeTab)!

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
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
                : `${kidsTracks.length} recording${kidsTracks.length !== 1 ? 's' : ''} · stories, Quran & nasheeds`}
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
            to="/kids/studio"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-md hover:from-amber-600 hover:to-orange-600 transition-all"
          >
            <Mic size={18} />
            Kids Studio
            <span className="text-white/80 font-normal hidden sm:inline">· record & effects</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-8 flex-wrap">
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

      {/* Active section banner */}
      <div className={`rounded-xl p-5 mb-6 bg-gradient-to-r ${activeMeta.color} shadow-md flex items-center gap-3`}>
        <span className="text-3xl">{activeMeta.emoji}</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-white text-lg">{activeMeta.label}</h2>
          <p className="text-white/80 text-sm">
            {loading
              ? 'Loading…'
              : `${filteredTracks.length} audio file${filteredTracks.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">Loading kids audio…</div>
      ) : (
        <TrackList
          tracks={filteredTracks}
          emptyMessage={
            kidsTracks.length === 0
              ? 'No kids recordings yet — open Kids Studio to make the first one!'
              : `No ${activeMeta.label} yet — try All, or open Kids Studio to record one.`
          }
        />
      )}

      {!loading && kidsTracks.length === 0 && (
        <div className="mt-6 text-center">
          <Link
            to="/kids/studio"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100"
          >
            <Mic size={16} /> Go to Kids Studio
          </Link>
        </div>
      )}
    </div>
  )
}
