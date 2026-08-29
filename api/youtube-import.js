import {
  extractVideoId,
  fetchVideoInfo,
  convertToMp3,
  downloadToBuffer,
  uploadBufferToBlob,
  sanitizeFileName,
} from './_youtube.js'

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '').trim()
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { success: false, error: 'Method not allowed' })
  }

  try {
    const body = await readJsonBody(req)
    const action = body.action === 'download' ? 'download' : 'info'
    const videoId = extractVideoId(body.url || body.videoId)

    if (!videoId) {
      return json(res, 400, { success: false, error: 'Enter a valid YouTube URL or video ID.' })
    }

    if (action === 'info') {
      const info = await fetchVideoInfo(videoId)
      return json(res, 200, { success: true, ...info })
    }

    // action === 'download'
    const deadline = Date.now() + 55_000

    const info = await fetchVideoInfo(videoId).catch(() => ({
      videoId,
      title: '',
      author: '',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    }))

    const converted = await convertToMp3(videoId, {
      rapidApiKey: process.env.RAPIDAPI_KEY,
      rapidApiHost: process.env.RAPIDAPI_YT_MP3_HOST,
      deadline,
    })

    const { buffer, contentType } = await downloadToBuffer(converted.link, { deadline })

    const title = info.title || converted.title || videoId
    const fileName = `${sanitizeFileName(title)}.mp3`
    const pathname = `youtube/${Date.now()}-${fileName}`
    const url = await uploadBufferToBlob(buffer, pathname, contentType || 'audio/mpeg', process.env.BLOB_READ_WRITE_TOKEN)

    return json(res, 200, {
      success: true,
      url,
      title,
      author: info.author || '',
      thumbnail: info.thumbnail,
      duration: converted.duration,
      fileName,
      fileSize: buffer.length,
      contentType: contentType || 'audio/mpeg',
    })
  } catch (error) {
    return json(res, 500, { success: false, error: error?.message || 'YouTube import failed' })
  }
}
