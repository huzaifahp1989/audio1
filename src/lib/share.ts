import type { AudioTrack } from '../types'

export function buildTrackShareUrl(trackId: string): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/track/${trackId}`
}

export type ShareResult = 'shared' | 'copied' | 'failed'

export async function shareTrack(track: AudioTrack): Promise<ShareResult> {
  const url = buildTrackShareUrl(track.id)
  const title = track.title || 'Islamic Audio'
  const text = track.reciter ? `${track.title} — ${track.reciter}` : track.title

  // Native share sheet (mobile / supported browsers)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      // User cancelled — treat as no-op, don't fall through to clipboard.
      if (err instanceof DOMException && err.name === 'AbortError') return 'failed'
    }
  }

  // Clipboard fallback
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return 'copied'
    }
  } catch {
    /* fall through */
  }

  // Legacy fallback
  try {
    const input = document.createElement('input')
    input.value = url
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    return 'copied'
  } catch {
    return 'failed'
  }
}
