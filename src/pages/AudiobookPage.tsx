import React, { useState, useEffect } from 'react'
import { BookOpen, Search, ChevronDown, FileText, X } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackList from '../components/TrackList'
import { AUDIOBOOK_AUTHORS } from '../constants/categories'
import type { AudioTrack } from '../types'

export default function AudiobookPage() {
  const { tracks, refresh } = useAudioLibrary()
  useEffect(() => { refresh() }, [])
  const allTracks = tracks.filter((t) => t.category === 'audiobooks')
  const [search, setSearch] = useState('')
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all')
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null)

  // Get unique authors from tracks + predefined list
  const trackAuthors = [...new Set(allTracks.map((t) => t.reciter))]
  const allAuthors = [...new Set([...AUDIOBOOK_AUTHORS.filter(a => a !== 'Other'), ...trackAuthors])].sort()

  const filtered = allTracks.filter((t) => {
    const matchesSearch = search
      ? t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.reciter.toLowerCase().includes(search.toLowerCase()) ||
        (t.text && t.text.toLowerCase().includes(search.toLowerCase()))
      : true
    
    const matchesAuthor = selectedAuthor !== 'all'
      ? t.reciter === selectedAuthor
      : true
    
    return matchesSearch && matchesAuthor
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shadow-sm">
            <BookOpen size={22} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Islamic Audiobooks</h1>
            <p className="text-slate-500 text-sm mt-0.5">{allTracks.length} book{allTracks.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search audiobooks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 w-56 shadow-sm"
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        {/* Author Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAuthorDropdown(!showAuthorDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-amber-300 hover:bg-amber-50 transition-all min-w-[180px]"
          >
            <span>✍️ {selectedAuthor === 'all' ? 'All Authors' : selectedAuthor}</span>
            <ChevronDown size={16} className={`ml-auto transition-transform ${showAuthorDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showAuthorDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-80 overflow-y-auto">
              <div className="p-2">
                <button
                  onClick={() => { setSelectedAuthor('all'); setShowAuthorDropdown(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedAuthor === 'all' ? 'bg-amber-100 text-amber-700' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>📚</span>
                  <span className="flex-1 text-left">All Authors</span>
                </button>
                
                {allAuthors.map((author) => {
                  const count = allTracks.filter((t) => t.reciter === author).length
                  return (
                    <button
                      key={author}
                      onClick={() => { setSelectedAuthor(author); setShowAuthorDropdown(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedAuthor === author ? 'bg-amber-100 text-amber-700' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>✍️</span>
                      <span className="flex-1 text-left truncate">{author}</span>
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
        {selectedAuthor !== 'all' && (
          <button
            onClick={() => { setSelectedAuthor('all') }}
            className="text-sm text-slate-500 hover:text-amber-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Active filters display */}
      {selectedAuthor !== 'all' && (
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
            <span>✍️</span>
            <span>{selectedAuthor}</span>
            <button onClick={() => setSelectedAuthor('all')} className="hover:text-amber-900">×</button>
          </span>
        </div>
      )}

      {/* Text Content Modal */}
      {selectedTrack && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <FileText size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{selectedTrack.title}</h3>
                  <p className="text-sm text-slate-500">by {selectedTrack.reciter}</p>
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
                  <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                    {selectedTrack.text}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <FileText size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No text content available for this audiobook.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Track List with Text Button */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((track, index) => (
            <div key={track.id} className="group">
              <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-200 hover:shadow-sm transition-all">
                <TrackList tracks={[track]} emptyMessage="" />
                {track.text && (
                  <button
                    onClick={() => setSelectedTrack(track)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-sm font-medium transition-colors shrink-0"
                  >
                    <FileText size={16} />
                    Read Text
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl bg-slate-50">
          <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">
            {selectedAuthor !== 'all' || search
              ? "No audiobooks found for the selected filters."
              : "No audiobooks uploaded yet."}
          </p>
        </div>
      )}
    </div>
  )
}
