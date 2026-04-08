import React, { useState, useEffect } from 'react'
import { Mic2, Search, ChevronDown } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackList from '../components/TrackList'
import { TALKS_TOPICS, TALKS_SPEAKERS } from '../constants/categories'

export default function TalksPage() {
  const { tracks, refresh } = useAudioLibrary()
  useEffect(() => { refresh() }, [])
  const allTracks = tracks.filter((t) => t.category === 'talks')
  const [search, setSearch] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<string>('all')
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('all')
  const [showTopicDropdown, setShowTopicDropdown] = useState(false)
  const [showSpeakerDropdown, setShowSpeakerDropdown] = useState(false)

  // Get unique speakers from tracks + predefined list
  const trackSpeakers = [...new Set(allTracks.map((t) => t.reciter))]
  const allSpeakers = [...new Set([...TALKS_SPEAKERS.filter(s => s !== 'Other'), ...trackSpeakers])].sort()

  const filtered = allTracks.filter((t) => {
    const matchesSearch = search
      ? t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.reciter.toLowerCase().includes(search.toLowerCase())
      : true
    
    const matchesTopic = selectedTopic !== 'all'
      ? t.topic === selectedTopic
      : true
    
    const matchesSpeaker = selectedSpeaker !== 'all'
      ? t.reciter === selectedSpeaker
      : true
    
    return matchesSearch && matchesTopic && matchesSpeaker
  })

  const selectedTopicLabel = TALKS_TOPICS.find(t => t.id === selectedTopic)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center shadow-sm">
            <Mic2 size={22} className="text-sky-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Islamic Talks</h1>
            <p className="text-slate-500 text-sm mt-0.5">{allTracks.length} talk{allTracks.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search talks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 w-56 shadow-sm"
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        
        {/* Topic Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowTopicDropdown(!showTopicDropdown)
              setShowSpeakerDropdown(false)
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-sky-300 hover:bg-sky-50 transition-all min-w-[160px]"
          >
            <span>{selectedTopic === 'all' ? '📋 All Topics' : `${selectedTopicLabel?.emoji} ${selectedTopicLabel?.label}`}</span>
            <ChevronDown size={16} className={`ml-auto transition-transform ${showTopicDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showTopicDropdown && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-80 overflow-y-auto">
              <div className="p-2">
                <button
                  onClick={() => { setSelectedTopic('all'); setShowTopicDropdown(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTopic === 'all' ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>📋</span>
                  <span className="flex-1 text-left">All Topics</span>
                </button>
                
                {TALKS_TOPICS.map((topic) => {
                  const count = allTracks.filter((t) => t.topic === topic.id).length
                  return (
                    <button
                      key={topic.id}
                      onClick={() => { setSelectedTopic(topic.id); setShowTopicDropdown(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedTopic === topic.id ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{topic.emoji}</span>
                      <span className="flex-1 text-left truncate">{topic.label}</span>
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

        {/* Speaker Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowSpeakerDropdown(!showSpeakerDropdown)
              setShowTopicDropdown(false)
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-sky-300 hover:bg-sky-50 transition-all min-w-[180px]"
          >
            <span>🎙️ {selectedSpeaker === 'all' ? 'All Speakers' : selectedSpeaker}</span>
            <ChevronDown size={16} className={`ml-auto transition-transform ${showSpeakerDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showSpeakerDropdown && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-80 overflow-y-auto">
              <div className="p-2">
                <button
                  onClick={() => { setSelectedSpeaker('all'); setShowSpeakerDropdown(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedSpeaker === 'all' ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>🎙️</span>
                  <span className="flex-1 text-left">All Speakers</span>
                </button>
                
                {allSpeakers.map((speaker) => {
                  const count = allTracks.filter((t) => t.reciter === speaker).length
                  return (
                    <button
                      key={speaker}
                      onClick={() => { setSelectedSpeaker(speaker); setShowSpeakerDropdown(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedSpeaker === speaker ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>👤</span>
                      <span className="flex-1 text-left truncate">{speaker}</span>
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
        {(selectedTopic !== 'all' || selectedSpeaker !== 'all') && (
          <button
            onClick={() => { setSelectedTopic('all'); setSelectedSpeaker('all') }}
            className="text-sm text-slate-500 hover:text-sky-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Active filters display */}
      {(selectedTopic !== 'all' || selectedSpeaker !== 'all') && (
        <div className="flex flex-wrap gap-2 mb-6">
          {selectedTopic !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-sm">
              <span>{selectedTopicLabel?.emoji}</span>
              <span>{selectedTopicLabel?.label}</span>
              <button onClick={() => setSelectedTopic('all')} className="hover:text-sky-900">×</button>
            </span>
          )}
          {selectedSpeaker !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-sm">
              <span>🎙️</span>
              <span>{selectedSpeaker}</span>
              <button onClick={() => setSelectedSpeaker('all')} className="hover:text-sky-900">×</button>
            </span>
          )}
        </div>
      )}

      <TrackList 
        tracks={filtered} 
        emptyMessage={selectedTopic !== 'all' || selectedSpeaker !== 'all'
          ? "No talks found for the selected filters."
          : "No talks uploaded yet."
        } 
      />
    </div>
  )
}
