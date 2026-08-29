import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Share2, Check } from 'lucide-react'
import type { AudioTrack } from '../types'
import { shareTrack } from '../lib/share'
import { trackEvent } from '../lib/analytics'

interface ShareButtonProps {
  track: AudioTrack
  className?: string
  size?: number
}

export default function ShareButton({ track, className = '', size = 16 }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    const result = await shareTrack(track)
    if (result === 'copied') {
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1800)
    }
    trackEvent('share_track', { track_id: track.id, category: track.category, method: result })
  }, [track])

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share track"
      title={copied ? 'Link copied' : 'Share'}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] transition hover:text-[var(--theme-brand)] ${className}`}
    >
      {copied ? <Check size={size} className="text-emerald-500" /> : <Share2 size={size} />}
    </button>
  )
}
