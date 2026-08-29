import { X } from 'lucide-react'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import InlinePlayerPanel, { type PlayerVariant } from './InlinePlayerPanel'

const CATEGORY_VARIANTS: Record<string, PlayerVariant> = {
  quran: 'emerald',
  talks: 'sky',
  nasheeds: 'violet',
}

export default function GlobalPlayerBar() {
  const { currentTrack, stopTrack } = useAudioPlayer()

  if (!currentTrack) return null

  const variant = CATEGORY_VARIANTS[currentTrack.category] || 'violet'

  return (
    <aside
      className="fixed inset-x-2 bottom-2 z-50 mx-auto max-w-2xl shadow-2xl sm:inset-x-4 sm:bottom-4"
      aria-label="Now playing"
    >
      <div className="relative rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-2 shadow-2xl">
        <div className="flex items-center gap-3 px-2 pb-1 pr-10">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-[var(--theme-ink)]">{currentTrack.title}</p>
            <p className="truncate text-xs text-[var(--theme-muted)]">{currentTrack.reciter}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={stopTrack}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-[var(--theme-muted)] hover:bg-[var(--theme-soft)]"
          aria-label="Close player"
        >
          <X size={17} />
        </button>
        <InlinePlayerPanel variant={variant} compact className="border-0 bg-none shadow-none" />
      </div>
    </aside>
  )
}