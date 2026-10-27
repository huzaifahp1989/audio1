/**
 * Range-chunked audio download proxy.
 *
 * Firebase Storage serves audio with no CORS headers at all, so the browser
 * cannot fetch a track into IndexedDB to save it for offline playback. Directly
 * proxying the file is not an option either: Vercel caps a Function response
 * body at 4.5 MB, and most talks/recitations are larger than that.
 *
 * So this endpoint proxies one byte range at a time (3 MB by default). The
 * client loops, appending each slice into a single Blob, which keeps every
 * request safely under the platform limit while still reporting real progress
 * from the upstream Content-Range total.
 */

const CHUNK_BYTES = 3 * 1024 * 1024

/** Exact hosts we are willing to fetch from. */
const ALLOWED_HOSTS = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
])

/** Host suffixes we are willing to fetch from. */
const ALLOWED_HOST_SUFFIXES = [
  '.firebasestorage.app',
  '.blob.vercel-storage.com',
  '.public.blob.vercel-storage.com',
  '.googleusercontent.com',
]

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

function isAllowedTarget(url) {
  if (url.protocol !== 'https:') return false
  const host = url.hostname.toLowerCase()
  if (ALLOWED_HOSTS.has(host)) return true
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

function parseByte(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return json(res, 405, { success: false, error: 'Method not allowed' })
  }

  const rawUrl = typeof req.query?.url === 'string' ? req.query.url : ''
  if (!rawUrl) {
    return json(res, 400, { success: false, error: 'Missing "url" parameter.' })
  }

  let target
  try {
    target = new URL(rawUrl)
  } catch {
    return json(res, 400, { success: false, error: 'Invalid "url" parameter.' })
  }

  if (!isAllowedTarget(target)) {
    return json(res, 403, { success: false, error: 'Host is not allowed for download proxying.' })
  }

  const start = parseByte(req.query?.start, 0)
  const requestedEnd = parseByte(req.query?.end, start + CHUNK_BYTES - 1)
  const end = Math.max(requestedEnd, start)

  let upstream
  try {
    upstream = await fetch(target.toString(), {
      headers: { Range: `bytes=${start}-${end}` },
      redirect: 'follow',
    })
  } catch (error) {
    return json(res, 502, {
      success: false,
      error: error?.message || 'Could not reach the audio file.',
    })
  }

  if (!upstream.ok && upstream.status !== 206) {
    return json(res, upstream.status === 416 ? 416 : 502, {
      success: false,
      error: `Upstream responded with ${upstream.status}.`,
    })
  }

  const body = Buffer.from(await upstream.arrayBuffer())
  const contentRange = upstream.headers.get('content-range')

  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Length', String(body.length))
  if (contentRange) res.setHeader('Content-Range', contentRange)
  res.statusCode = contentRange ? 206 : 200
  res.end(body)
}
