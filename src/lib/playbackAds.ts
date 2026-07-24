import type { AudioTrack } from '../types'

/** Short promo beds played between content tracks (every 4–6 tracks). */
export const PLAYBACK_AD_URLS = [
  '/ads/promo-1.mp3',
  '/ads/promo-2.mp3',
  '/ads/promo-3.mp3',
] as const

export function randomAdInterval(): number {
  // Inclusive range 4–6
  return 4 + Math.floor(Math.random() * 3)
}

export function isAdTrack(track: AudioTrack | null | undefined): boolean {
  if (!track) return false
  return track.source === 'ad' || track.id.startsWith('ad-')
}

let adSerial = 0

export function createAdTrack(): AudioTrack {
  const idx = adSerial % PLAYBACK_AD_URLS.length
  adSerial += 1
  const audioUrl = PLAYBACK_AD_URLS[idx]
  return {
    id: `ad-${adSerial}-${Date.now()}`,
    title: 'Sponsored · Islamic Audio',
    category: 'talks',
    reciter: 'Advertisement',
    fileName: audioUrl.split('/').pop() || 'promo.mp3',
    fileSize: 0,
    mimeType: 'audio/mpeg',
    uploadedAt: Date.now(),
    audioUrl,
    source: 'ad',
    views: 0,
  }
}

export function adsEnabledByDefault(): boolean {
  try {
    return localStorage.getItem('disable_playback_ads') !== '1'
  } catch {
    return true
  }
}
