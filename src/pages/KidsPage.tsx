import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mic, Star } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackList from '../components/TrackList'
import { KIDS_CATEGORIES } from '../constants/categories'
import type { AudioCategory } from '../types'

export default function KidsPage() {
  const { tracks } = useAudioLibrary()
  const [activeTab, setActiveTab] = useState<AudioCategory>('kids-stories')

  const filteredTracks = tracks.filter((t) => t.category === activeTab)

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
            <p className="text-slate-500 text-sm mt-0.5">Educational and fun content for children</p>
          </div>
        </div>
        <Link
          to="/kids/studio"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-md hover:from-amber-600 hover:to-orange-600 transition-all"
        >
          <Mic size={18} />
          Kids Studio
          <span className="text-white/80 font-normal hidden sm:inline">· echo & fun voices</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {KIDS_CATEGORIES.map(({ id, label, emoji, color }) => {
          const count = tracks.filter((t) => t.category === id).length
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
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
      {(() => {
        const cat = KIDS_CATEGORIES.find((c) => c.id === activeTab)!
        return (
          <div className={`rounded-xl p-5 mb-6 bg-gradient-to-r ${cat.color} shadow-md flex items-center gap-3`}>
            <span className="text-3xl">{cat.emoji}</span>
            <div>
              <h2 className="font-bold text-white text-lg">{cat.label}</h2>
              <p className="text-white/80 text-sm">
                {filteredTracks.length} audio file{filteredTracks.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )
      })()}

      <TrackList
        tracks={filteredTracks}
        emptyMessage={`No ${KIDS_CATEGORIES.find((c) => c.id === activeTab)?.label} yet — open Kids Studio to record one!`}
      />
    </div>
  )
}
