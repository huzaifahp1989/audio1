import React, { useEffect, useState } from 'react'
import { BookOpen, FileText, X } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import TrackList from '../components/TrackList'
import CategoryUploadPanel from '../components/CategoryUploadPanel'
import CategoryHero from '../components/CategoryHero'
import CategoryChips from '../components/CategoryChips'
import CategoryPlayerDock from '../components/CategoryPlayerDock'
import { AUDIOBOOK_AUTHORS } from '../constants/categories'
import type { AudioTrack } from '../types'

export default function AudiobookPage() {
  const { tracks, loading } = useAudioLibrary()
  const allTracks = tracks.filter((t) => t.category === 'audiobooks')
  const [search, setSearch] = useState('')
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all')
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

  // Get unique authors from tracks + predefined list
  const trackAuthors = [...new Set(allTracks.map((t) => t.reciter))]
  const allAuthors = [...new Set([...AUDIOBOOK_AUTHORS.filter(a => a !== 'Other'), ...trackAuthors])].sort()

  const authorChips = [
    { id: 'all', label: 'All Authors', emoji: '📚', count: allTracks.length },
    ...allAuthors.map((author) => ({
      id: author,
      label: author,
      emoji: '✍️',
      count: allTracks.filter((t) => t.reciter === author).length,
    })),
  ]

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

  // Calculate total views
  const totalViews = allTracks.reduce((sum, t) => sum + (t.views || 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <CategoryHero
        icon={<BookOpen size={13} />}
        badge="Audiobooks"
        title="Islamic Audiobooks"
        description="Classical works and Islamic literature narrated for listening on the go."
        gradient="from-amber-600 via-orange-600 to-amber-700"
        itemCount={allTracks.length}
        itemNoun="book"
        totalPlays={totalViews}
        search={{ value: search, onChange: setSearch, placeholder: 'Search audiobooks...' }}
      />

      <CategoryUploadPanel category="audiobooks" className="mb-8" />

      <CategoryPlayerDock tracks={filtered} variant="sky" className="mb-6 sm:mb-8" />

      <section className="mb-8">
        <CategoryChips
          label="Author"
          options={authorChips}
          value={selectedAuthor}
          onChange={setSelectedAuthor}
          activeClass="bg-amber-600 text-white border-amber-600"
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
            aria-labelledby="audiobook-modal-title"
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[80vh] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <FileText size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 id="audiobook-modal-title" className="font-bold text-slate-800">{selectedTrack.title}</h3>
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
      ) : loading && allTracks.length === 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-3xl skeleton" />
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
