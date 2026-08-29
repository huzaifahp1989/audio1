import type { AudioTrack, AdAudioTrack, PlaylistAdTargetCategory } from '../types'

export type SponsoredBreakFrequency = 2 | 3 | 4

export const SPONSORED_ADS_HREF = 'https://traeadvert8pia.vercel.app/'
const CATEGORY_SPONSORED_BREAKS: Record<PlaylistAdTargetCategory, SponsoredBreakFrequency> = {
  quran: 4,
  nasheeds: 4,
  talks: 2,
}

let sponsoredAudioUrlCache: string | null = null
let adminAdAudioTracksCache: AdAudioTrack[] = []

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

function createSponsoredAudioDataUrl() {
  if (sponsoredAudioUrlCache) return sponsoredAudioUrlCache
  if (typeof window === 'undefined') return ''

  const sampleRate = 8000
  const durationSeconds = 2.8
  const sampleCount = Math.floor(sampleRate * durationSeconds)
  const buffer = new ArrayBuffer(44 + sampleCount * 2)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + sampleCount * 2, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, sampleCount * 2, true)

  const toneWindows = [
    { start: 0.05, end: 0.28, freq: 740, gain: 0.18 },
    { start: 0.55, end: 0.85, freq: 880, gain: 0.14 },
    { start: 1.25, end: 2.55, freq: 440, gain: 0.04 },
  ]

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate
    let sample = 0
    for (const windowDef of toneWindows) {
      if (time < windowDef.start || time > windowDef.end) continue
      const fadeIn = Math.min(1, (time - windowDef.start) / 0.03)
      const fadeOut = Math.min(1, (windowDef.end - time) / 0.06)
      const envelope = Math.max(0, Math.min(fadeIn, fadeOut))
      sample += Math.sin(2 * Math.PI * windowDef.freq * time) * windowDef.gain * envelope
    }
    const clamped = Math.max(-1, Math.min(1, sample))
    view.setInt16(44 + index * 2, clamped * 0x7fff, true)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }

  sponsoredAudioUrlCache = `data:audio/wav;base64,${window.btoa(binary)}`
  return sponsoredAudioUrlCache
}

export function setAdminAdAudioTracks(tracks: AdAudioTrack[]) {
  adminAdAudioTracksCache = [...tracks]
    .filter((track) => track.active !== false && !!track.audioUrl)
    .sort((a, b) => {
      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER
      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER
      if (orderA !== orderB) return orderA - orderB
      return b.uploadedAt - a.uploadedAt
    })
}

function getEligibleAdminAdTracks(category: PlaylistAdTargetCategory): AdAudioTrack[] {
  const targeted = adminAdAudioTracksCache.filter((track) =>
    !track.targetCategories?.length || track.targetCategories.includes(category),
  )
  return targeted.length > 0 ? targeted : adminAdAudioTracksCache
}

function createSponsoredTrack(track: AudioTrack, slot: number): AudioTrack {
  const titles = [
    'Sponsored break: more offers and ads',
    'Sponsored message: visit our offers section',
  ]
  const adminAdTracksForCategory = getEligibleAdminAdTracks(track.category as PlaylistAdTargetCategory)
  const adminAdTrack = adminAdTracksForCategory.length > 0
    ? adminAdTracksForCategory[slot % adminAdTracksForCategory.length]
    : null

  return {
    id: adminAdTrack ? `sponsored-admin-${adminAdTrack.id}-${slot}` : `sponsored-${track.category}-${slot}`,
    title: adminAdTrack?.title || titles[slot % titles.length],
    category: track.category,
    reciter: 'Sponsored',
    isSponsored: true,
    sponsoredAudioId: adminAdTrack?.id,
    sponsorHref: adminAdTrack?.sponsorHref || SPONSORED_ADS_HREF,
    sponsorLabel: adminAdTrack ? 'Open sponsor link' : 'Open offers and ads',
    fileName: adminAdTrack?.fileName || 'sponsored-break.wav',
    fileSize: adminAdTrack?.fileSize || 0,
    duration: adminAdTrack?.duration || 3,
    mimeType: adminAdTrack?.mimeType || 'audio/wav',
    uploadedAt: Date.now() + slot,
    audioUrl: adminAdTrack?.audioUrl || createSponsoredAudioDataUrl(),
    views: 0,
  }
}

export function buildPlaylistQueue(
  tracks: AudioTrack[],
  sponsoredBreakFrequency: SponsoredBreakFrequency | null,
): AudioTrack[] {
  const cleanTracks = tracks.filter((track) => !track.isSponsored)
  if (!sponsoredBreakFrequency || cleanTracks.length === 0) return cleanTracks

  const queue: AudioTrack[] = []
  cleanTracks.forEach((track, index) => {
    queue.push(track)
    const shouldInsertSponsoredBreak =
      (index + 1) % sponsoredBreakFrequency === 0 && index < cleanTracks.length - 1
    if (shouldInsertSponsoredBreak) {
      queue.push(createSponsoredTrack(track, index + 1))
    }
  })

  return queue
}

export function buildAutoPlaylistSelection(
  track: AudioTrack,
  tracks: AudioTrack[],
  index: number,
): { queue: AudioTrack[]; queueIndex: number } {
  if (tracks.some((item) => item.isSponsored)) {
    return { queue: tracks, queueIndex: index }
  }

  const category = track.category as PlaylistAdTargetCategory
  const isSponsoredPlaylistCategory = category in CATEGORY_SPONSORED_BREAKS
  if (!isSponsoredPlaylistCategory) {
    return { queue: tracks, queueIndex: index }
  }

  const categoryTracks = tracks.filter((item) => !item.isSponsored && item.category === track.category)
  const baseTracks = categoryTracks.length > 0 ? categoryTracks : tracks.filter((item) => !item.isSponsored)
  const baseIndex = baseTracks.findIndex((item) => item.id === track.id)
  const queue = buildPlaylistQueue(baseTracks, CATEGORY_SPONSORED_BREAKS[category])
  const queueIndex = queue.findIndex((item) => item.id === track.id)

  return {
    queue,
    queueIndex: queueIndex >= 0 ? queueIndex : Math.max(0, baseIndex >= 0 ? baseIndex : index),
  }
}
