const DEFAULT_RSS_URL = 'https://anchor.fm/s/21dd8c4c/podcast/rss'

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripHtml(text) {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function readTag(block, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  const match = block.match(regex)
  if (!match) return undefined

  const value = match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
  return decodeHtmlEntities(value)
}

function readSelfClosingTagAttr(block, tagName, attrName) {
  const regex = new RegExp(`<${tagName}[^>]*${attrName}="([^"]+)"[^>]*\\/?\s*>`, 'i')
  const match = block.match(regex)
  return match?.[1]
}

function parseDurationToSeconds(value) {
  if (!value) return undefined
  if (/^\d+$/.test(value)) return Number(value)

  const parts = value.split(':').map((part) => Number(part))
  if (parts.some((n) => Number.isNaN(n))) return undefined

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return undefined
}

function normalizeEpisodeId(raw) {
  if (!raw) return null
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || null
}

function parseRss(xmlText) {
  const channelImage = readTag(xmlText, 'url')
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  const items = []

  let match
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const item = match[1]
    const title = readTag(item, 'title')
    if (!title) continue

    const guid = readTag(item, 'guid')
    const link = readTag(item, 'link')
    const audioUrl = readSelfClosingTagAttr(item, 'enclosure', 'url')
    const descriptionRaw = readTag(item, 'description') || readTag(item, 'content:encoded')
    const imageUrl =
      readSelfClosingTagAttr(item, 'itunes:image', 'href') ||
      readSelfClosingTagAttr(item, 'media:thumbnail', 'url') ||
      channelImage
    const pubDate = readTag(item, 'pubDate')
    const parsedDate = pubDate ? Date.parse(pubDate) : NaN
    const durationRaw = readTag(item, 'itunes:duration')
    const id = normalizeEpisodeId(guid || link || audioUrl || title)

    items.push({
      id: id || `ep-${items.length + 1}`,
      title,
      description: descriptionRaw ? stripHtml(descriptionRaw) : undefined,
      publishedAt: Number.isNaN(parsedDate) ? undefined : parsedDate,
      audioUrl,
      imageUrl,
      externalUrl: link,
      durationSeconds: parseDurationToSeconds(durationRaw),
    })
  }

  return items
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return json(res, 405, { success: false, error: 'Method not allowed' })
  }

  try {
    const feedUrl = req.query?.url || process.env.PODCAST_RSS_URL || DEFAULT_RSS_URL
    if (typeof feedUrl !== 'string' || !/^https?:\/\//i.test(feedUrl)) {
      return json(res, 400, { success: false, error: 'Invalid RSS url.' })
    }

    const response = await fetch(feedUrl)
    if (!response.ok) {
      const body = await response.text()
      return json(res, 502, {
        success: false,
        error: `Failed to fetch RSS feed (${response.status}): ${body.slice(0, 300)}`,
      })
    }

    const xml = await response.text()
    const episodes = parseRss(xml)

    return json(res, 200, {
      success: true,
      episodes,
      fetchedAt: Date.now(),
    })
  } catch (error) {
    return json(res, 500, {
      success: false,
      error: error?.message || 'Failed to process RSS feed.',
    })
  }
}