import React, { useEffect, useState } from 'react'
import { Scroll, FileText, X } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackList from '../components/TrackList'
import CategoryUploadPanel from '../components/CategoryUploadPanel'
import CategoryHero from '../components/CategoryHero'
import CategoryChips from '../components/CategoryChips'
import CategoryPlayerDock from '../components/CategoryPlayerDock'
import { HADITH_NARRATORS } from '../constants/categories'
import type { AudioTrack } from '../types'

function isHadithTrack(track: AudioTrack): boolean {
  if (track.category === 'hadith') return true
  if (track.category !== 'talks') return false
  return track.topic === 'hadith' || track.topic === 'hadith-series'
}

export default function HadithPage() {
  const { tracks, loading } = useAudioLibrary()
  const allTracks = tracks.filter(isHadithTrack)
  const [search, setSearch] = useState('')
  const [selectedNarrator, setSelectedNarrator] = useState<string>('all')
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

  // Get unique narrators from tracks + predefined list
  const trackNarrators = [...new Set(allTracks.map((t) => t.reciter))]
  const allNarrators = [...new Set([...HADITH_NARRATORS.filter(n => n !== 'Other'), ...trackNarrators])].sort()

  const narratorChips = [
    { id: 'all', label: 'All Collections', emoji: '📚', count: allTracks.length },
    ...allNarrators.map((narrator) => ({
      id: narrator,
      label: narrator,
      emoji: '📜',
      count: allTracks.filter((t) => t.reciter === narrator).length,
    })),
  ]

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
      <CategoryHero
        icon={<Scroll size={13} />}
        badge="Hadith Library"
        title="Hadith Collection"
        description="Authentic narrations from the major collections, ready to listen and read."
        gradient="from-emerald-600 via-teal-600 to-emerald-700"
        itemCount={allTracks.length}
        itemNoun="hadith"
        totalPlays={allTracks.reduce((sum, t) => sum + (t.views || 0), 0)}
        search={{ value: search, onChange: setSearch, placeholder: 'Search hadith...' }}
      />

      <CategoryUploadPanel category="hadith" className="mb-8" />

      <CategoryPlayerDock tracks={filtered} variant="emerald" className="mb-6 sm:mb-8" />

      <section className="mb-8">
        <CategoryChips
          label="Collection"
          options={narratorChips}
          value={selectedNarrator}
          onChange={setSelectedNarrator}
          activeClass="bg-emerald-600 text-white border-emerald-600"
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
            aria-labelledby="hadith-modal-title"
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[80vh] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <FileText size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 id="hadith-modal-title" className="font-bold text-slate-800">{selectedTrack.title}</h3>
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

      <TrackList
        tracks={filtered}
        loading={loading && allTracks.length === 0}
        emptyMessage={
          selectedNarrator !== 'all' || search
            ? 'No hadith found for the selected filters.'
            : 'No hadith uploaded yet.'
        }
      />
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
