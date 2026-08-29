import React, { useState } from 'react'
import { Bookmark, X } from 'lucide-react'
import { addBookmark, getBookmarks, removeBookmark } from '../lib/bookmarks'
import { formatDuration } from '../lib/storage'

interface TrackBookmarkButtonProps {
  trackId: string
  currentTime: number
  onSeek: (time: number) => void
  variant?: 'violet' | 'sky' | 'emerald'
}

const chip: Record<string, string> = {
  violet: 'border-violet-200 text-violet-700 dark:border-violet-500/30 dark:text-violet-300',
  sky: 'border-sky-200 text-sky-700 dark:border-sky-500/30 dark:text-sky-300',
  emerald: 'border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300',
}

export default function TrackBookmarkButton({ trackId, currentTime, onSeek, variant = 'violet' }: TrackBookmarkButtonProps) {
  const [open, setOpen] = useState(false)
  const [bookmarks, setBookmarks] = useState(() => getBookmarks(trackId))

  const refresh = () => setBookmarks(getBookmarks(trackId))

  const handleAdd = () => {
    addBookmark(trackId, currentTime)
    refresh()
    setOpen(true)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold ${chip[variant]}`}
      >
        <Bookmark size={11} />
        {bookmarks.length > 0 ? bookmarks.length : 'Mark'}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-52 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] p-2 shadow-xl">
          <button
            type="button"
            onClick={handleAdd}
            className="mb-2 w-full rounded-lg bg-[var(--theme-soft)] px-2 py-1.5 text-xs font-semibold text-[var(--theme-ink)] hover:bg-[var(--theme-brand)]/10"
          >
            Bookmark at {formatDuration(currentTime)}
          </button>
          {bookmarks.length === 0 ? (
            <p className="px-1 text-[10px] text-[var(--theme-muted)]">No bookmarks yet</p>
          ) : (
            <ul className="max-h-32 space-y-1 overflow-y-auto">
              {bookmarks.map((b) => (
                <li key={b.createdAt} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSeek(b.time)}
                    className="min-w-0 flex-1 truncate rounded px-2 py-1 text-left text-[10px] text-[var(--theme-ink)] hover:bg-[var(--theme-soft)]"
                  >
                    {b.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => { removeBookmark(trackId, b.createdAt); refresh() }}
                    className="text-[var(--theme-muted)] hover:text-red-500"
                    aria-label="Remove bookmark"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
