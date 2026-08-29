/** Wire Media Session API for lock screen, Bluetooth, and Android Auto media controls. */
import type { AudioTrack } from '../types'
import { isAdTrack } from './playbackAds'

type Handlers = {
  play: () => void
  pause: () => void
  playNext: () => void
  playPrev: () => void
  seek: (time: number) => void
  getPosition: () => { position: number; duration: number; playbackRate: number }
}

export function supportsMediaSession(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

export function updateMediaSessionMetadata(track: AudioTrack | null): void {
  if (!supportsMediaSession() || !track) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: isAdTrack(track) ? 'Sponsored' : (track.reciter || 'Islamic Audio'),
      album: isAdTrack(track) ? 'Advertisement' : String(track.category || 'Islamic Audio'),
      artwork: [
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        { src: '/favicon.svg', sizes: '192x192', type: 'image/svg+xml' },
        { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml' },
      ],
    })
  } catch {
    // Older browsers may reject artwork SVG
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.reciter || 'Islamic Audio',
        album: String(track.category || 'Islamic Audio'),
      })
    } catch {
      /* ignore */
    }
  }
}

export function setMediaSessionPlaybackState(playing: boolean): void {
  if (!supportsMediaSession()) return
  try {
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  } catch {
    /* ignore */
  }
}

export function updateMediaSessionPosition(position: number, duration: number): void {
  if (!supportsMediaSession()) return
  if (!Number.isFinite(duration) || duration <= 0) return
  try {
    navigator.mediaSession.setPositionState({
      duration,
      position: Math.min(Math.max(0, position), duration),
      playbackRate: 1,
    })
  } catch {
    /* ignore */
  }
}

export function bindMediaSessionHandlers(handlers: Handlers): () => void {
  if (!supportsMediaSession()) return () => {}

  const ms = navigator.mediaSession
  const safe = (action: MediaSessionAction, fn: MediaSessionActionHandler) => {
    try {
      ms.setActionHandler(action, fn)
    } catch {
      /* action not supported */
    }
  }

  safe('play', () => handlers.play())
  safe('pause', () => handlers.pause())
  safe('stop', () => handlers.pause())
  safe('previoustrack', () => handlers.playPrev())
  safe('nexttrack', () => handlers.playNext())
  safe('seekbackward', (d) => {
    const { position } = handlers.getPosition()
    handlers.seek(Math.max(0, position - (d.seekOffset || 10)))
  })
  safe('seekforward', (d) => {
    const { position, duration } = handlers.getPosition()
    handlers.seek(Math.min(duration, position + (d.seekOffset || 10)))
  })
  safe('seekto', (d) => {
    if (typeof d.seekTime === 'number') handlers.seek(d.seekTime)
  })

  return () => {
    const actions: MediaSessionAction[] = [
      'play', 'pause', 'stop', 'previoustrack', 'nexttrack',
      'seekbackward', 'seekforward', 'seekto',
    ]
    for (const a of actions) {
      try { ms.setActionHandler(a, null) } catch { /* ignore */ }
    }
  }
}
