export function speakerToSlug(name: string): string {
  return encodeURIComponent(
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  )
}

export function slugToSpeakerMatch(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, ' ')
}

export function findSpeakerName(slug: string, names: string[]): string | null {
  const normalized = slugToSpeakerMatch(slug).toLowerCase()
  return names.find((n) => n.toLowerCase().replace(/[^a-z0-9]+/g, ' ') === normalized.replace(/[^a-z0-9]+/g, ' '))
    ?? names.find((n) => speakerToSlug(n) === slug)
    ?? null
}
