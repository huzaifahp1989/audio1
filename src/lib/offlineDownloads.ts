import type { AudioTrack } from '../types'
import {
  clearAllTrackDownloads,
  deleteTrackDownload,
  getAllTrackDownloads,
  getAudioBlob,
  getTrackDownloadMeta,
  saveAudioBlob,
  saveTrackDownloadMeta,
  type TrackDownloadMeta,
} from './indexedDb'

/**
 * Offline downloads fetch the remote audio into IndexedDB and play it back from
 * a blob URL. This deliberately bypasses the service worker, which only caches
 * same-origin responses and therefore never touches Firebase Storage or Vercel
 * Blob audio.
 */

const blobKeyFor = (trackId: string) => `offline:${trackId}`

// Object URLs are cached per track so repeated playback doesn't leak handles.
const objectUrlCache = new Map<string, string>()

function revokeObjectUrl(trackId: string) {
  const url = objectUrlCache.get(trackId)
  if (url) {
    URL.revokeObjectURL(url)
    objectUrlCache.delete(trackId)
  }
}

function objectUrlFor(trackId: string, blob: Blob): string {
  const existing = objectUrlCache.get(trackId)
  if (existing) return existing
  const url = URL.createObjectURL(blob)
  objectUrlCache.set(trackId, url)
  return url
}

export class OfflineStorageError extends Error {}

export interface DownloadProgress {
  /** 0–1, or null when the server did not report a content length. */
  ratio: number | null
  receivedBytes: number
  totalBytes: number | null
}

export async function listOfflineDownloads(): Promise<TrackDownloadMeta[]> {
  try {
    return await getAllTrackDownloads()
  } catch {
    return []
  }
}

export async function isTrackDownloaded(trackId: string): Promise<boolean> {
  const meta = await getTrackDownloadMeta(trackId)
  return Boolean(meta)
}

/**
 * Resolve the URL the audio element should play. A downloaded copy always wins
 * so playback works with no signal — even if the remote URL has since expired.
 */
export async function resolvePlayableUrl(track: AudioTrack): Promise<string> {
  try {
    const blob = await getAudioBlob(blobKeyFor(track.id))
    if (blob && blob.size > 0) return objectUrlFor(track.id, blob)
  } catch {
    // Fall through to the remote URL if IndexedDB is unavailable.
  }
  return track.audioUrl ?? ''
}

/** True when the given track is currently playable without a network. */
export async function isPlayableOffline(trackId: string): Promise<boolean> {
  const blob = await getAudioBlob(blobKeyFor(trackId))
  return Boolean(blob && blob.size > 0)
}

export async function estimateStorage(): Promise<{ usedBytes: number; quotaBytes: number } | null> {
  if (!navigator.storage?.estimate) return null
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    return { usedBytes: usage, quotaBytes: quota }
  } catch {
    return null
  }
}

const PROXY_ENDPOINT = '/api/audio-download'
/** Must stay in sync with the range size served by `api/audio-download.js`. */
const PROXY_CHUNK_BYTES = 3 * 1024 * 1024

/**
 * Firebase Storage answers without any CORS headers, so audio hosted there can
 * only be read through the range-chunked proxy endpoint on our own origin.
 * Same-origin files (ads, bundled audio) are fetched directly.
 */
function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin === window.location.origin
  } catch {
    return false
  }
}

async function fetchDirect(
  url: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(url, { mode: 'cors', credentials: 'omit' })
  } catch {
    throw new OfflineStorageError(
      'Could not reach the audio file. Check your connection and try again.'
    )
  }

  if (!response.ok) {
    throw new OfflineStorageError(`Download failed (${response.status} ${response.statusText}).`)
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg'
  const lengthHeader = response.headers.get('content-length')
  const totalBytes = lengthHeader ? Number(lengthHeader) : null
  const knownTotal = totalBytes && Number.isFinite(totalBytes) && totalBytes > 0 ? totalBytes : null

  // Some hosts expose no readable body — fall back to a plain blob read.
  if (!response.body) {
    const blob = await response.blob()
    onProgress?.({ ratio: 1, receivedBytes: blob.size, totalBytes: blob.size })
    return blob
  }

  const reader = response.body.getReader()
  const chunks: BlobPart[] = []
  let receivedBytes = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      receivedBytes += value.byteLength
      onProgress?.({
        ratio: knownTotal ? Math.min(1, receivedBytes / knownTotal) : null,
        receivedBytes,
        totalBytes: knownTotal,
      })
    }
  }

  const blob = new Blob(chunks, { type: contentType })
  onProgress?.({
    ratio: 1,
    receivedBytes: blob.size,
    totalBytes: knownTotal ?? blob.size,
  })
  return blob
}

/** Pulls the file through `api/audio-download` one bounded range at a time. */
async function fetchViaProxy(
  url: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<Blob> {
  const chunks: BlobPart[] = []
  let receivedBytes = 0
  let totalBytes: number | null = null
  let mimeType = 'audio/mpeg'

  for (;;) {
    const endpoint =
      `${PROXY_ENDPOINT}?url=${encodeURIComponent(url)}` +
      `&start=${receivedBytes}&end=${receivedBytes + PROXY_CHUNK_BYTES - 1}`

    let response: Response
    try {
      response = await fetch(endpoint, { credentials: 'same-origin' })
    } catch {
      throw new OfflineStorageError(
        'Could not reach the download service. Check your connection and try again.'
      )
    }

    if (!response.ok && response.status !== 206) {
      let detail = ''
      try {
        detail = (await response.json())?.error ?? ''
      } catch {
        // Non-JSON error body — fall back to the status code below.
      }
      throw new OfflineStorageError(detail || `Download failed (${response.status}).`)
    }

    mimeType = response.headers.get('content-type') || mimeType

    const contentRange = response.headers.get('content-range')
    const rangeTotal = contentRange?.split('/')[1]
    if (rangeTotal && Number.isFinite(Number(rangeTotal)) && Number(rangeTotal) > 0) {
      totalBytes = Number(rangeTotal)
    }

    const chunk = await response.arrayBuffer()
    if (chunk.byteLength === 0) break

    chunks.push(chunk)
    receivedBytes += chunk.byteLength

    onProgress?.({
      ratio: totalBytes ? Math.min(1, receivedBytes / totalBytes) : null,
      receivedBytes,
      totalBytes,
    })

    // No Content-Range means the host ignored the Range header and already sent
    // the whole file — one pass is all we get.
    if (!contentRange) break
    if (chunk.byteLength < PROXY_CHUNK_BYTES) break
  }

  if (chunks.length === 0) {
    throw new OfflineStorageError('The downloaded file was empty.')
  }

  return new Blob(chunks, { type: mimeType })
}

/**
 * Download a track for offline playback. Safe to call for a track that is
 * already downloaded — it will simply be replaced.
 */
export async function downloadTrackForOffline(
  track: AudioTrack,
  onProgress?: (progress: DownloadProgress) => void
): Promise<TrackDownloadMeta> {
  if (!track.audioUrl) {
    throw new OfflineStorageError('This track has no audio file to download.')
  }

  const blob = isSameOrigin(track.audioUrl)
    ? await fetchDirect(track.audioUrl, onProgress)
    : await fetchViaProxy(track.audioUrl, onProgress)

  if (blob.size === 0) {
    throw new OfflineStorageError('The downloaded file was empty.')
  }

  await saveAudioBlob(blobKeyFor(track.id), blob)

  const meta: TrackDownloadMeta = {
    id: track.id,
    title: track.title,
    reciter: track.reciter,
    category: track.category,
    topic: track.topic,
    duration: track.duration,
    imageUrl: track.imageUrl,
    mimeType: track.mimeType || blob.type || 'audio/mpeg',
    size: blob.size,
    downloadedAt: Date.now(),
    remoteUrl: track.audioUrl,
  }

  await saveTrackDownloadMeta(meta)
  return meta
}

export async function removeOfflineDownload(trackId: string): Promise<void> {
  revokeObjectUrl(trackId)
  await deleteTrackDownload(trackId)
}

export async function clearOfflineDownloads(): Promise<void> {
  for (const id of [...objectUrlCache.keys()]) revokeObjectUrl(id)
  await clearAllTrackDownloads()
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
