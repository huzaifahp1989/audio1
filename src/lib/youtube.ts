export interface YoutubeInfo {
  videoId: string
  title: string
  author: string
  thumbnail: string
}

export interface YoutubeImportResult {
  url: string
  title: string
  author: string
  thumbnail: string
  duration?: number
  fileName: string
  fileSize: number
  contentType: string
}

const ENDPOINT = '/api/youtube-import'

/** Loose client-side check so we can enable/disable the Fetch button. */
export function looksLikeYoutubeUrl(input: string): boolean {
  const str = (input || '').trim()
  if (!str) return false
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return true
  return /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(str)
}

async function postImport<T>(body: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Could not reach the import service. Check your connection and try again.')
  }

  let payload: any = null
  let rawText = ''
  try {
    rawText = await res.text()
    payload = rawText ? JSON.parse(rawText) : null
  } catch {
    // fall through to generic error below
  }

  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error || `Import failed (HTTP ${res.status}${rawText ? `: ${rawText}` : ''}).`)
  }

  return payload as T
}

export function fetchYoutubeInfo(url: string): Promise<YoutubeInfo> {
  return postImport<YoutubeInfo & { success: true }>({ action: 'info', url })
}

export function convertYoutubeToMp3(url: string): Promise<YoutubeImportResult> {
  return postImport<YoutubeImportResult & { success: true }>({ action: 'download', url })
}
