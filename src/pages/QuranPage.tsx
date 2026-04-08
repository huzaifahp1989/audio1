import React, { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackList from '../components/TrackList'
import { QURAN_RECITERS } from '../constants/categories'

export default function QuranPage() {
  const { tracks } = useAudioLibrary()
  const quranTracks = tracks.filter((t) => t.category === 'quran')
  const [selected, setSelected] = useState<string>('All')

  const filteredTracks =
    selected === 'All' ? quranTracks : quranTracks.filter((t) => t.reciter === selected)

  const recitersWithTracks = ['All', ...QURAN_RECITERS]

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
          <BookOpen size={22} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quran Recitations</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {quranTracks.length} recitation{quranTracks.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Reciter filter */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Filter by Reciter</h2>
        <div className="flex flex-wrap gap-2">
          {recitersWithTracks.map((reciter) => {
            const count = reciter === 'All'
              ? quranTracks.length
              : quranTracks.filter((t) => t.reciter === reciter).length
            return (
              <button
                key={reciter}
                onClick={() => setSelected(reciter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selected === reciter
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                {reciter}
                {count > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      selected === reciter ? 'bg-emerald-500/40 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <TrackList
        tracks={filteredTracks}
        emptyMessage={
          selected === 'All'
            ? 'No Quran recitations uploaded yet.'
            : `No recitations uploaded for ${selected} yet.`
        }
      />
    </div>
  )
}
