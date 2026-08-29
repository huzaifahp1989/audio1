// Shared helpers for the YouTube → MP3 import feature.
// Files prefixed with "_" are NOT treated as routable serverless functions by
// Vercel, so this module is safely shared by api/youtube-import.js and the Vite
// dev middleware (see vite.config.ts).
import { put } from '@vercel/blob'

const DEFAULT_RAPIDAPI_HOST = 'youtube-mp36.p.rapidapi.com'
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/

/** Accepts a full YouTube URL (watch / youtu.be / shorts / embed / live) or a
 *  raw 11-char video id and returns the video id, or null if invalid. */
export function extractVideoId(input) {
  if (!input) return null
  const str = String(input).trim()
  if (VIDEO_ID_RE.test(str)) return str

  let url
  try {
    url = new URL(str)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase()

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    return id && VIDEO_ID_RE.test(id) ? id : null
  }

  if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    const v = url.searchParams.get('v')
    if (v && VIDEO_ID_RE.test(v)) return v

    const parts = url.pathname.split('/').filter(Boolean)
    const idx = parts.findIndex((p) => ['shorts', 'embed', 'live', 'v'].includes(p))
    if (idx !== -1 && parts[idx + 1] && VIDEO_ID_RE.test(parts[idx + 1])) {
      return parts[idx + 1]
    }
  }

  return null
}

/** Fetches lightweight, key-free metadata via YouTube's public oEmbed endpoint.
 *  oEmbed is not subject to the datacenter-IP bot checks that break stream
 *  scraping, so this reliably powers the "Fetch details" preview. */
export async function fetchVideoInfo(videoId) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`

  const res = await fetch(oembedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AudioLibrary/1.0)' },
  })

  if (!res.ok) {
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      throw new Error('This video could not be found or is private / age-restricted.')
    }
    throw new Error(`Could not read video details (HTTP ${res.status}).`)
  }

  const data = await res.json()
  return {
    videoId,
    title: data.title || '',
    author: data.author_name || '',
    thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Converts a YouTube video to an MP3 download link using a RapidAPI provider
 *  (defaults to "youtube-mp36"). Handles the provider's async "processing"
 *  status by polling until a link is ready or the deadline is hit. */
export async function convertToMp3(videoId, options = {}) {
  const {
    rapidApiKey,
    rapidApiHost = DEFAULT_RAPIDAPI_HOST,
    deadline = Date.now() + 50_000,
  } = options

  if (!rapidApiKey) {
    throw new Error(
      'YouTube conversion is not configured. Set the RAPIDAPI_KEY environment variable ' +
        '(subscribe to a YouTube-to-MP3 API on RapidAPI such as "youtube-mp36").',
    )
  }

  const headers = {
    'X-RapidAPI-Key': rapidApiKey,
    'X-RapidAPI-Host': rapidApiHost,
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetch(`https://${rapidApiHost}/dl?id=${encodeURIComponent(videoId)}`, { headers })

    if (res.status === 429) {
      throw new Error('The conversion service is rate limited right now. Please wait a moment and try again.')
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error('The conversion service rejected the RAPIDAPI_KEY. Check the key and that you are subscribed to the API.')
    }
    if (!res.ok) {
      throw new Error(`Conversion service error (HTTP ${res.status}).`)
    }

    const data = await res.json().catch(() => ({}))
    const status = String(data.status || '').toLowerCase()

    if (status === 'ok' && data.link) {
      const durationRaw = data.duration
      const duration = typeof durationRaw === 'number' ? durationRaw : Number(durationRaw)
      const sizeRaw = data.filesize
      const fileSize = sizeRaw ? Number(sizeRaw) : undefined
      return {
        link: data.link,
        title: data.title || '',
        duration: Number.isFinite(duration) && duration > 0 ? duration : undefined,
        fileSize: Number.isFinite(fileSize) && fileSize > 0 ? fileSize : undefined,
      }
    }

    const isProcessing = status === 'processing' || status === 'in process' || status === 'converting'
    if (!isProcessing) {
      throw new Error(data.msg || 'The video could not be converted (it may be too long, private, or restricted).')
    }

    if (Date.now() > deadline - 5_000) {
      throw new Error('Conversion is taking longer than expected. Please try importing again in a moment.')
    }

    await sleep(2_500)
  }
}

/** Downloads a (possibly large) audio file into memory as a Buffer. */
export async function downloadToBuffer(url, options = {}) {
  const { deadline } = options
  const controller = new AbortController()
  const remaining = deadline ? Math.max(2_000, deadline - Date.now()) : 45_000
  const timer = setTimeout(() => controller.abort(), remaining)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AudioLibrary/1.0)' },
    })
    if (!res.ok) {
      throw new Error(`Failed to download the converted audio (HTTP ${res.status}).`)
    }
    const arrayBuffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'audio/mpeg'
    return { buffer: Buffer.from(arrayBuffer), contentType }
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Downloading the converted audio timed out. Try a shorter video or import again.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** Uploads an audio Buffer to Vercel Blob and returns its public URL. */
export async function uploadBufferToBlob(buffer, pathname, contentType, token) {
  const blob = await put(pathname, buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType: contentType || 'audio/mpeg',
    ...(token ? { token } : {}),
  })
  return blob.url
}

/** Makes a title safe to use as a file name. */
export function sanitizeFileName(name) {
  const cleaned = String(name || 'audio')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  return cleaned || 'audio'
}
