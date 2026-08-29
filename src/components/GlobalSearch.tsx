import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Play, CornerDownLeft } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useGlobalSearch } from '../context/GlobalSearchContext'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration } from '../lib/storage'
import { formatViews } from '../lib/views'
import type { AudioTrack, AudioCategory } from '../types'
import { trackMatchesSearch } from '../lib/searchExpand'

const CATEGORY_LABELS: Partial<Record<AudioCategory, string>> = {
  quran: 'Quran',
  nasheeds: 'Nasheeds',
  talks: 'Talks',
  audiobooks: 'Audiobooks',
  hadith: 'Hadith',
  dua: 'Dua',
  'kids-stories': 'Kids Stories',
  'kids-quran': 'Kids Quran',
  'kids-nasheeds': 'Kids Nasheeds',
  'kids-talks': 'Kids Talks',
}

function categoryLabel(cat: AudioCategory): string {
  return CATEGORY_LABELS[cat] ?? cat
}

export default function GlobalSearch() {
  const { open, closeSearch } = useGlobalSearch()
  const location = useLocation()
  const { tracks } = useAudioLibrary()
  const { playFromList } = useAudioPlayer()
  const [queryText, setQueryText] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQueryText('')
      setActiveIndex(0)
      // Focus after paint
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    closeSearch()
  }, [location.pathname, closeSearch])

  const results = useMemo(() => {
    const q = queryText.trim().toLowerCase()
    if (!q) {
      // Default: most viewed tracks as suggestions
      return [...tracks].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8)
    }
    return tracks
      .filter((t) => trackMatchesSearch(t, q, categoryLabel(t.category)))
      .slice(0, 30)
  }, [queryText, tracks])

  // Group results by category, preserving order
  const grouped = useMemo(() => {
    const groups: { category: AudioCategory; items: AudioTrack[] }[] = []
    const map = new Map<AudioCategory, AudioTrack[]>()
    for (const t of results) {
      if (!map.has(t.category)) {
        const arr: AudioTrack[] = []
        map.set(t.category, arr)
        groups.push({ category: t.category, items: arr })
      }
      map.get(t.category)!.push(t)
    }
    return groups
  }, [results])

  // Flat list used for keyboard navigation (matches render order)
  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped])

  useEffect(() => {
    if (activeIndex >= flat.length) setActiveIndex(0)
  }, [flat.length, activeIndex])

  const selectTrack = (track: AudioTrack) => {
    const index = flat.findIndex((t) => t.id === track.id)
    playFromList(track, flat, index < 0 ? 0 : index)
    closeSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeSearch()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, flat.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const track = flat[activeIndex]
      if (track) selectTrack(track)
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open) return null

  let runningIndex = -1

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[12vh] sm:pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search audio"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeSearch}
      />
      <div className="modal-pop relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--theme-border)] px-4 py-3">
          <Search size={18} className="text-[var(--theme-muted)]" />
          <input
            ref={inputRef}
            value={queryText}
            onChange={(e) => { setQueryText(e.target.value); setActiveIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search nasheeds, talks, reciters, topics…"
            className="flex-1 bg-transparent text-[var(--theme-ink)] placeholder:text-[var(--theme-muted)] outline-none text-sm sm:text-base"
          />
          <button
            onClick={closeSearch}
            className="rounded-lg p-1 text-[var(--theme-muted)] hover:text-[var(--theme-ink)]"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {flat.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[var(--theme-muted)]">
              {queryText ? `No results for "${queryText}"` : 'No audio available yet.'}
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.category} className="mb-2">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--theme-muted)]">
                  {categoryLabel(group.category)}
                </p>
                <div className="space-y-1">
                  {group.items.map((track) => {
                    runningIndex += 1
                    const idx = runningIndex
                    const isActive = idx === activeIndex
                    return (
                      <button
                        key={track.id}
                        type="button"
                        data-active={isActive}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => selectTrack(track)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                          isActive ? 'bg-[var(--theme-soft)]' : 'hover:bg-[var(--theme-soft)]'
                        }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isActive ? 'bg-[var(--theme-brand)] text-white' : 'bg-[var(--theme-surface-2)] text-[var(--theme-brand)]'
                        }`}>
                          <Play size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--theme-ink)]">{track.title}</span>
                          <span className="block truncate text-xs text-[var(--theme-muted)]">
                            {track.reciter}
                            {track.duration !== undefined ? ` · ${formatDuration(track.duration)}` : ''}
                            {track.views ? ` · ${formatViews(track.views)} plays` : ''}
                          </span>
                        </span>
                        {isActive && (
                          <CornerDownLeft size={14} className="shrink-0 text-[var(--theme-muted)]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--theme-border)] px-4 py-2 text-[11px] text-[var(--theme-muted)]">
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-[var(--theme-border)] px-1.5 py-0.5">↑</kbd>
            <kbd className="rounded border border-[var(--theme-border)] px-1.5 py-0.5">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[var(--theme-border)] px-1.5 py-0.5">Esc</kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  )
}
