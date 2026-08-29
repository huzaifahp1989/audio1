import React, { useState } from 'react'
import { BookOpen, Music2, Search, Sparkles, Play, Pause, FileText, Eye, SkipBack, SkipForward, Volume2, VolumeX, Mic, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import type { AudioTrack } from '../types'
import { formatDuration } from '../lib/storage'
import { formatViews } from '../lib/views'
import CategoryUploadPanel from '../components/CategoryUploadPanel'
import type { AudioCategory } from '../types'

const ADS_HREF = 'https://traeadvert8pia.vercel.app/'
const ADS_LOGOS = [
  {
    alt: 'Nasihah World',
    src: 'https://bisytxrgpvkxwxhudlmt.supabase.co/storage/v1/object/public/ad-images/uploads/ads/1778662656611-4e567b41-d951-4ed1-b7d0-de876e13df61.jpg',
  },
  {
    alt: 'Tile Planet',
    src: 'https://tile-planet.co.uk/images/tp/home/logo-bottom.png',
  },
]

function KidsLoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-48 rounded-3xl skeleton" />
      ))}
    </div>
  )
}

export default function KidsLearningPage() {
  const { tracks, loading } = useAudioLibrary()
  const { currentTrack, isPlaying, currentTime, duration, volume, playFromList, togglePlay, seek, setVolume, playNext, playPrev, hasNext, hasPrev } = useAudioPlayer()

  const [activeTab, setActiveTab] = useState<'quran' | 'nasheeds' | 'stories'>('quran')
  const [search, setSearch] = useState('')

  // Filter tracks for kids
  const quranTracks = tracks.filter((t) => t.category === 'kids-quran')
  const nasheedTracks = tracks.filter((t) => t.category === 'kids-nasheeds')
  const storyTracks = tracks.filter((t) => t.category === 'kids-stories' || t.category === 'kids-talks')

  const applySearch = (list: AudioTrack[]) => list.filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.title.toLowerCase().includes(q) ||
      t.reciter.toLowerCase().includes(q) ||
      (t.text ? t.text.toLowerCase().includes(q) : false)
    )
  })

  const filteredQuran = applySearch(quranTracks)
  const filteredNasheeds = applySearch(nasheedTracks)
  const filteredStories = applySearch(storyTracks)
  const getTheme = (cat?: string) => {
    if (cat === 'kids-quran') return { gradient: 'from-emerald-500 to-teal-500', soft: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-100', icon: <BookOpen size={18} className="text-emerald-600" /> }
    if (cat === 'kids-nasheeds') return { gradient: 'from-violet-500 to-indigo-500', soft: 'bg-violet-50', border: 'border-violet-200', iconBg: 'bg-violet-100', icon: <Music2 size={18} className="text-violet-600" /> }
    return { gradient: 'from-amber-500 to-orange-500', soft: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100', icon: <FileText size={18} className="text-amber-600" /> }
  }

  const kidsNowPlaying = currentTrack?.category?.startsWith('kids-') ? currentTrack : null
  const theme = getTheme(kidsNowPlaying?.category)
  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0

  // Calculate total views
  const totalViews =
    quranTracks.reduce((sum, t) => sum + (t.views || 0), 0) +
    nasheedTracks.reduce((sum, t) => sum + (t.views || 0), 0) +
    storyTracks.reduce((sum, t) => sum + (t.views || 0), 0)

  const kidsUploadCategory: AudioCategory =
    activeTab === 'quran' ? 'kids-quran' : activeTab === 'nasheeds' ? 'kids-nasheeds' : 'kids-stories'

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <style>{`
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee-scroll 20s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Ads */}
      <section className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-slate-800">Offers & Ads</h2>
          <a
            href={ADS_HREF}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-amber-600 hover:text-amber-700"
          >
            View all →
          </a>
        </div>
        <div style={{ overflow: 'hidden', width: '100%' }}>
          <div
            className="marquee-track"
            style={{ display: 'flex', width: 'max-content', alignItems: 'center' }}
          >
            {[0, 1].map((copy) => (
              <div
                key={copy}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '12px' }}
                aria-hidden={copy === 1 ? true : undefined}
              >
                {ADS_LOGOS.map((logo) => (
                  <a
                    key={copy === 0 ? logo.alt : `${logo.alt}-dup`}
                    href={ADS_HREF}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={copy === 0 ? `Open ads: ${logo.alt}` : undefined}
                    tabIndex={copy === 1 ? -1 : undefined}
                    style={{
                      flexShrink: 0,
                      height: '64px',
                      width: '200px',
                      borderRadius: '16px',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 12px',
                    }}
                  >
                    <img
                      src={logo.src}
                      alt={copy === 0 ? logo.alt : ''}
                      style={{ maxHeight: '52px', width: '100%', objectFit: 'contain' }}
                      loading="eager"
                    />
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Sparkles size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Kids Recordings</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {quranTracks.length + nasheedTracks.length + storyTracks.length} lessons for children · {' '}
              <span className="inline-flex items-center gap-1">
                <Eye size={12} />
                {formatViews(totalViews)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm hover:bg-amber-50">
            <ArrowLeft size={16} /> Back to library
          </Link>
          <Link to="/quran-recording" className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600">
            <Mic size={16} /> Record Quran
          </Link>
          <div className="relative w-full sm:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 w-full sm:w-56 shadow-sm"
            />
          </div>
        </div>
      </div>

      {kidsNowPlaying && (
        <section className="mb-8">
          <div className={`bg-white border ${theme.border} rounded-2xl shadow-sm overflow-hidden`}>
            <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />
            <div className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${theme.iconBg} shrink-0`}>
                  {theme.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">Kids Player</p>
                  <p className="text-base font-bold text-slate-900 truncate">{kidsNowPlaying.title}</p>
                  <p className="text-sm text-slate-500 truncate">{kidsNowPlaying.reciter}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={playPrev}
                  disabled={!hasPrev}
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                  title="Previous"
                >
                  <SkipBack size={18} />
                </button>
                <button
                  onClick={togglePlay}
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${theme.gradient} text-white flex items-center justify-center shadow-md transition-all active:scale-95`}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
                </button>
                <button
                  onClick={playNext}
                  disabled={!hasNext}
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                  title="Next"
                >
                  <SkipForward size={18} />
                </button>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 tabular-nums w-10 text-right">{formatDuration(currentTime)}</span>
                <div className="relative flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`absolute left-0 top-0 h-full bg-gradient-to-r ${theme.gradient}`} style={{ width: `${progress}%` }} />
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => seek(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    style={{ height: '100%' }}
                  />
                </div>
                <span className="text-xs text-slate-500 tabular-nums w-10">{formatDuration(duration)}</span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => setVolume(volume === 0 ? 0.8 : 0)} className="text-slate-400 hover:text-slate-700 shrink-0">
                  {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <div className="relative flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`absolute left-0 top-0 h-full bg-gradient-to-r ${theme.gradient}`} style={{ width: `${volume * 100}%` }} />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
                <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <CategoryUploadPanel key={kidsUploadCategory} category={kidsUploadCategory} className="mb-8" />

      {/* Tabs */}
      <div className="-mx-4 px-4 flex gap-2 mb-8 overflow-x-auto flex-nowrap scrollbar-hide sm:mx-0 sm:px-0 sm:overflow-visible">
        <button
          onClick={() => setActiveTab('quran')}
          className={`flex shrink-0 items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'quran'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200'
          }`}
        >
          <BookOpen size={16} className="sm:hidden" />
          <BookOpen size={18} className="hidden sm:block" />
          Quran
          <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
            {filteredQuran.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('nasheeds')}
          className={`flex shrink-0 items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'nasheeds'
              ? 'bg-violet-500 text-white shadow-lg shadow-violet-200'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-200'
          }`}
        >
          <Music2 size={16} className="sm:hidden" />
          <Music2 size={18} className="hidden sm:block" />
          Nasheeds
          <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
            {filteredNasheeds.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('stories')}
          className={`flex shrink-0 items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'stories'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200'
          }`}
        >
          <FileText size={16} className="sm:hidden" />
          <FileText size={18} className="hidden sm:block" />
          Stories
          <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
            {filteredStories.length}
          </span>
        </button>
      </div>

      {/* Quran Tab */}
      {activeTab === 'quran' && (
        <div className="space-y-6">
          {/* Quran Tracks */}
          {filteredQuran.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuran.map((track, index) => {
                const isActive = currentTrack?.id === track.id
                return (
                  <div
                    key={track.id}
                    className={`group bg-white border rounded-xl overflow-hidden transition-all hover:shadow-md ${
                      isActive ? 'border-emerald-400 ring-1 ring-emerald-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isActive ? 'bg-emerald-100' : 'bg-emerald-50 group-hover:bg-emerald-100'
                          }`}>
                            <BookOpen size={18} className="text-emerald-600" />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-800'}`}>
                              {track.title}
                            </h3>
                            <p className="text-xs text-slate-500">{track.reciter}</p>
                          </div>
                        </div>
                        {track.duration && (
                          <span className="text-xs text-slate-400">{formatDuration(track.duration)}</span>
                        )}
                        <span className="text-xs text-slate-400 flex items-center gap-0.5">
                          <Eye size={10} />
                          {formatViews(track.views)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (isActive) {
                              togglePlay()
                            } else {
                              playFromList(track, filteredQuran, index)
                            }
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-emerald-500 text-white hover:bg-emerald-600'
                          }`}
                        >
                          {isActive && isPlaying ? (
                            <><Pause size={16} /> Pause</>
                          ) : (
                            <><Play size={16} /> Play</>
                          )}
                        </button>
                      </div>
                    </div>
                    {isActive && (
                      <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                    )}
                  </div>
                )
              })}
            </div>
          ) : loading && quranTracks.length === 0 ? (
            <KidsLoadingGrid />
          ) : (
            <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl bg-slate-50">
              <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">
                {search
                  ? "No Quran tracks found for your search."
                  : "No Quran tracks uploaded yet."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Nasheeds Tab */}
      {activeTab === 'nasheeds' && (
        <div className="space-y-6">
          {filteredNasheeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNasheeds.map((track, index) => {
                const isActive = currentTrack?.id === track.id
                return (
                  <div
                    key={track.id}
                    className={`group bg-white border rounded-xl overflow-hidden transition-all hover:shadow-md ${
                      isActive ? 'border-violet-400 ring-1 ring-violet-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isActive ? 'bg-violet-100' : 'bg-violet-50 group-hover:bg-violet-100'
                          }`}>
                            <Music2 size={18} className="text-violet-600" />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${isActive ? 'text-violet-700' : 'text-slate-800'}`}>
                              {track.title}
                            </h3>
                            <p className="text-xs text-slate-500">{track.reciter}</p>
                          </div>
                        </div>
                        {track.duration && (
                          <span className="text-xs text-slate-400">{formatDuration(track.duration)}</span>
                        )}
                        <span className="text-xs text-slate-400 flex items-center gap-0.5">
                          <Eye size={10} />
                          {formatViews(track.views)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (isActive) {
                              togglePlay()
                            } else {
                              playFromList(track, filteredNasheeds, index)
                            }
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                              : 'bg-violet-500 text-white hover:bg-violet-600'
                          }`}
                        >
                          {isActive && isPlaying ? (
                            <><Pause size={16} /> Pause</>
                          ) : (
                            <><Play size={16} /> Play</>
                          )}
                        </button>
                      </div>
                    </div>
                    {isActive && (
                      <div className="h-1 bg-gradient-to-r from-teal-400 to-cyan-500" />
                    )}
                  </div>
                )
              })}
            </div>
          ) : loading && nasheedTracks.length === 0 ? (
            <KidsLoadingGrid />
          ) : (
            <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl bg-slate-50">
              <Music2 size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">
                {search ? "No nasheeds found for your search." : "No nasheeds uploaded yet."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stories Tab */}
      {activeTab === 'stories' && (
        <div className="space-y-6">
          {filteredStories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStories.map((track, index) => {
                const isActive = currentTrack?.id === track.id
                return (
                  <div
                    key={track.id}
                    className={`group bg-white border rounded-xl overflow-hidden transition-all hover:shadow-md ${
                      isActive ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isActive ? 'bg-amber-100' : 'bg-amber-50 group-hover:bg-amber-100'
                          }`}>
                            <FileText size={18} className="text-amber-600" />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${isActive ? 'text-amber-700' : 'text-slate-800'}`}>
                              {track.title}
                            </h3>
                            <p className="text-xs text-slate-500">{track.reciter}</p>
                          </div>
                        </div>
                        {track.duration && (
                          <span className="text-xs text-slate-400">{formatDuration(track.duration)}</span>
                        )}
                        <span className="text-xs text-slate-400 flex items-center gap-0.5">
                          <Eye size={10} />
                          {formatViews(track.views)}
                        </span>
                      </div>

                      {track.text && (
                        <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                          {track.text.substring(0, 100)}...
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (isActive) {
                              togglePlay()
                            } else {
                              playFromList(track, filteredStories, index)
                            }
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-amber-500 text-white hover:bg-amber-600'
                          }`}
                        >
                          {isActive && isPlaying ? (
                            <><Pause size={16} /> Pause</>
                          ) : (
                            <><Play size={16} /> Play</>
                          )}
                        </button>
                      </div>
                    </div>
                    {isActive && (
                      <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                    )}
                  </div>
                )
              })}
            </div>
          ) : loading && storyTracks.length === 0 ? (
            <KidsLoadingGrid />
          ) : (
            <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl bg-slate-50">
              <FileText size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">
                {search ? "No stories found for your search." : "No stories uploaded yet."}
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
