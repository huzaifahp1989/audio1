import React, { useEffect, useState } from 'react'
import { Hand, FileText, X, Play, Pause, Eye } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import CategoryUploadPanel from '../components/CategoryUploadPanel'
import CategoryHero from '../components/CategoryHero'
import CategoryChips from '../components/CategoryChips'
import CategoryPlayerDock from '../components/CategoryPlayerDock'
import { DUA_CATEGORIES } from '../constants/categories'
import type { AudioTrack } from '../types'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration } from '../lib/storage'
import { formatViews } from '../lib/views'

export default function DuaPage() {
  const { tracks, loading } = useAudioLibrary()
  const { currentTrack, isPlaying, playFromList, togglePlay } = useAudioPlayer()
  
  const allTracks = tracks.filter((t) => t.category === 'dua')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null)

  useEffect(() => {
    if (!selectedTrack) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedTrack(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [selectedTrack])

  const filtered = allTracks.filter((t) => {
    const matchesSearch = search
      ? t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.reciter.toLowerCase().includes(search.toLowerCase()) ||
        (t.text && t.text.toLowerCase().includes(search.toLowerCase()))
      : true
    
    const matchesCategory = selectedCategory !== 'all'
      ? t.topic === selectedCategory
      : true
    
    return matchesSearch && matchesCategory
  })

  const selectedCategoryLabel = DUA_CATEGORIES.find(c => c.id === selectedCategory)

  const categoryChips = [
    { id: 'all', label: 'All Categories', emoji: '📋', count: allTracks.length },
    ...DUA_CATEGORIES.map((cat) => ({
      id: cat.id,
      label: cat.label,
      emoji: cat.emoji,
      count: allTracks.filter((t) => t.topic === cat.id).length,
    })),
  ]

  // Calculate total views
  const totalViews = allTracks.reduce((sum, t) => sum + (t.views || 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <CategoryHero
        icon={<Hand size={13} />}
        badge="Dua & Adhkar"
        title="Dua & Adhkar"
        description="Everyday supplications and remembrances, organised by occasion."
        gradient="from-teal-600 via-emerald-600 to-teal-700"
        itemCount={allTracks.length}
        itemNoun="dua"
        totalPlays={totalViews}
        search={{ value: search, onChange: setSearch, placeholder: 'Search duas...' }}
      />

      <CategoryUploadPanel category="dua" className="mb-8" />

      <CategoryPlayerDock tracks={filtered} variant="emerald" className="mb-6 sm:mb-8" />

      <section className="mb-8">
        <CategoryChips
          label="Category"
          options={categoryChips}
          value={selectedCategory}
          onChange={setSelectedCategory}
          activeClass="bg-teal-600 text-white border-teal-600"
        />
      </section>

      {/* Text Content Modal */}
      {selectedTrack && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTrack(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dua-modal-title"
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <FileText size={20} className="text-teal-600" />
                </div>
                <div>
                  <h3 id="dua-modal-title" className="font-bold text-slate-800">{selectedTrack.title}</h3>
                  <p className="text-sm text-slate-500">
                    {DUA_CATEGORIES.find(c => c.id === selectedTrack.topic)?.label || selectedTrack.topic}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrack(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {selectedTrack.text ? (
                <div className="space-y-6">
                  {/* Arabic/Primary Text */}
                  <div className="bg-teal-50 border border-teal-100 p-6 rounded-xl">
                    <p className="text-2xl text-teal-900 leading-loose text-center font-arabic"
                      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    >
                      {selectedTrack.text}
                    </p>
                  </div>
                  
                  {/* Translation/Notes if available */}
                  {selectedTrack.reciter && (
                    <div className="text-sm text-slate-500 text-center">
                      Recited by {selectedTrack.reciter}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <FileText size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No text content available for this dua.</p>
                </div>
              )}
            </div>
            
            {/* Play button in modal */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => {
                  if (currentTrack?.id === selectedTrack.id) {
                    togglePlay()
                  } else {
                    playFromList(selectedTrack, filtered, filtered.findIndex(t => t.id === selectedTrack.id))
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
              >
                {currentTrack?.id === selectedTrack.id && isPlaying ? (
                  <><Pause size={18} /> <span>Pause</span></>
                ) : (
                  <><Play size={18} /> <span>{currentTrack?.id === selectedTrack.id ? 'Resume' : 'Play Dua'}</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dua Cards Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((track, index) => {
            const isActive = currentTrack?.id === track.id
            const category = DUA_CATEGORIES.find(c => c.id === track.topic)
            
            return (
              <div
                key={track.id}
                className={`group bg-white border rounded-xl overflow-hidden transition-all hover:shadow-md ${
                  isActive ? 'border-teal-400 ring-1 ring-teal-300' : 'border-slate-200 hover:border-teal-200'
                }`}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{category?.emoji || '🤲'}</span>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {category?.label || 'Dua'}
                      </span>
                    </div>
                    {track.duration && (
                      <span className="text-xs text-slate-400 tabular-nums">
                        {formatDuration(track.duration)}
                      </span>
                    )}
                    <span className="text-xs text-slate-400 flex items-center gap-0.5">
                      <Eye size={10} />
                      {formatViews(track.views)}
                    </span>
                  </div>
                  
                  {/* Title */}
                  <h3 className={`font-semibold mb-2 ${isActive ? 'text-teal-700' : 'text-slate-800'}`}>
                    {track.title}
                  </h3>
                  
                  {/* Preview Text */}
                  {track.text && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                      {track.text.substring(0, 100)}...
                    </p>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (isActive) {
                          togglePlay()
                        } else {
                          playFromList(track, filtered, index)
                        }
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                          : 'bg-teal-600 text-white hover:bg-teal-700'
                      }`}
                    >
                      {isActive && isPlaying ? (
                        <><Pause size={16} /> <span>Pause</span></>
                      ) : (
                        <><Play size={16} /> <span>{isActive ? 'Resume' : 'Play'}</span></>
                      )}
                    </button>
                    
                    {track.text && (
                      <button
                        onClick={() => setSelectedTrack(track)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <FileText size={16} />
                        <span className="hidden sm:inline">Read</span>
                      </button>
                    )}
                  </div>
                </div>
                
                {isActive && (
                  <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
                )}
              </div>
            )
          })}
        </div>
      ) : loading && allTracks.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-56 rounded-3xl skeleton" />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl bg-slate-50">
          <Hand size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">
            {selectedCategory !== 'all' || search
              ? "No duas found for the selected filters."
              : "No duas uploaded yet."}
          </p>
        </div>
      )}
    </div>
  )
}
