import React, { useState, useEffect } from 'react'
import { Music2, Search, ChevronDown } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackList from '../components/TrackList'
import { NASHEED_ARTISTS } from '../constants/categories'

export default function NasheedsPage() {
  const { tracks, refresh } = useAudioLibrary()
  useEffect(() => { refresh() }, [])
  const allTracks = tracks.filter((t) => t.category === 'nasheeds')
  const [search, setSearch] = useState('')
  const [selectedArtist, setSelectedArtist] = useState<string>('all')
  const [showArtistDropdown, setShowArtistDropdown] = useState(false)

  // Get unique artists from tracks + predefined list
  const trackArtists = [...new Set(allTracks.map((t) => t.reciter))]
  const allArtists = [...new Set([...NASHEED_ARTISTS.filter(a => a !== 'Other'), ...trackArtists])].sort()

  const filtered = allTracks.filter((t) => {
    const matchesSearch = search
      ? t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.reciter.toLowerCase().includes(search.toLowerCase())
      : true
    
    const matchesArtist = selectedArtist !== 'all'
      ? t.reciter === selectedArtist
      : true
    
    return matchesSearch && matchesArtist
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
            <p className="text-slate-500 text-sm mt-0.5">{allTracks.length} nasheed{allTracks.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search nasheeds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 w-56 shadow-sm"
          />
        </div>
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
            <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-80 overflow-y-auto">
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
                      <span className="flex-1 text-left truncate">{artist}</span>
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
              <span>{selectedArtist}</span>
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

      <TrackList 
        tracks={filtered} 
        emptyMessage={selectedArtist !== 'all'
          ? "No nasheeds found for the selected artist."
          : "No nasheeds uploaded yet."
        } 
      />
    </div>
  )
}
