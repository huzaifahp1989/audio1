import React, { useState, useEffect } from 'react'
import { Scroll, Search, ChevronDown, FileText, X } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackList from '../components/TrackList'
import { HADITH_NARRATORS } from '../constants/categories'
import type { AudioTrack } from '../types'

export default function HadithPage() {
  const { tracks, refresh } = useAudioLibrary()
  useEffect(() => { refresh() }, [])
  const allTracks = tracks.filter((t) => t.category === 'hadith')
  const [search, setSearch] = useState('')
  const [selectedNarrator, setSelectedNarrator] = useState<string>('all')
  const [showNarratorDropdown, setShowNarratorDropdown] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null)

  // Get unique narrators from tracks + predefined list
  const trackNarrators = [...new Set(allTracks.map((t) => t.reciter))]
  const allNarrators = [...new Set([...HADITH_NARRATORS.filter(n => n !== 'Other'), ...trackNarrators])].sort()

  const filtered = allTracks.filter((t) => {
    const matchesSearch = search
      ? t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.reciter.toLowerCase().includes(search.toLowerCase()) ||
        (t.text && t.text.toLowerCase().includes(search.toLowerCase()))
      : true
    
    const matchesNarrator = selectedNarrator !== 'all'
      ? t.reciter === selectedNarrator
      : true
    
    return matchesSearch && matchesNarrator
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
            <Scroll size={22} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Hadith Collection</h1>
            <p className="text-slate-500 text-sm mt-0.5">{allTracks.length} hadith{allTracks.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search hadith..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 w-56 shadow-sm"
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        {/* Narrator Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNarratorDropdown(!showNarratorDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 transition-all min-w-[180px]"
          >
            <span>📜 {selectedNarrator === 'all' ? 'All Collections' : selectedNarrator}</span>
            <ChevronDown size={16} className={`ml-auto transition-transform ${showNarratorDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showNarratorDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-80 overflow-y-auto">
              <div className="p-2">
                <button
                  onClick={() => { setSelectedNarrator('all'); setShowNarratorDropdown(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedNarrator === 'all' ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>📚</span>
                  <span className="flex-1 text-left">All Collections</span>
                </button>
                
                {allNarrators.map((narrator) => {
                  const count = allTracks.filter((t) => t.reciter === narrator).length
                  return (
                    <button
                      key={narrator}
                      onClick={() => { setSelectedNarrator(narrator); setShowNarratorDropdown(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedNarrator === narrator ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>📜</span>
                      <span className="flex-1 text-left truncate">{narrator}</span>
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

        {/* Clear filters */}
        {selectedNarrator !== 'all' && (
          <button
            onClick={() => { setSelectedNarrator('all') }}
            className="text-sm text-slate-500 hover:text-emerald-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Active filters display */}
      {selectedNarrator !== 'all' && (
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
            <span>📜</span>
            <span>{selectedNarrator}</span>
            <button onClick={() => setSelectedNarrator('all')} className="hover:text-emerald-900">×</button>
          </span>
        </div>
      )}

      {/* Text Content Modal */}
      {selectedTrack && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <FileText size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{selectedTrack.title}</h3>
                  <p className="text-sm text-slate-500">{narratorLabel(selectedTrack.reciter)}</p>
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
                <div className="prose prose-slate max-w-none">
                  <div className="bg-emerald-50 border-l-4 border-emerald-400 p-4 mb-6 rounded-r-lg">
                    <p className="text-emerald-800 italic text-lg leading-relaxed">
                      {selectedTrack.text}
                    </p>
                  </div>
                  <div className="text-sm text-slate-500 text-center">
                    — {selectedTrack.reciter}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <FileText size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No text content available for this hadith.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Track List with Text Button */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((track) => (
            <div key={track.id} className="group bg-white border border-slate-200 rounded-xl hover:border-emerald-200 hover:shadow-sm transition-all overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <Scroll size={18} className="text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">{track.title}</h3>
                        <p className="text-sm text-slate-500">{narratorLabel(track.reciter)}</p>
                      </div>
                    </div>
                    
                    {track.text && (
                      <p className="text-sm text-slate-600 line-clamp-2 mb-3 pl-[52px]">
                        {track.text.substring(0, 150)}...
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 shrink-0">
                    {track.text && (
                      <button
                        onClick={() => setSelectedTrack(track)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        <FileText size={16} />
                        Read Hadith
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl bg-slate-50">
          <Scroll size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">
            {selectedNarrator !== 'all' || search
              ? "No hadith found for the selected filters."
              : "No hadith uploaded yet."}
          </p>
        </div>
      )}
    </div>
  )
}

function narratorLabel(reciter: string): string {
  if (reciter.includes('Bukhari')) return 'Sahih al-Bukhari'
  if (reciter.includes('Muslim')) return 'Sahih Muslim'
  if (reciter.includes('Tirmidhi')) return 'Jami at-Tirmidhi'
  if (reciter.includes('Abu Dawud')) return 'Sunan Abu Dawud'
  if (reciter.includes('Nasai')) return 'Sunan an-Nasa\'i'
  if (reciter.includes('Ibn Majah')) return 'Sunan Ibn Majah'
  return reciter
}
