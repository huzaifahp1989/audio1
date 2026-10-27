export function normalizeContributor(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function contributorMatches(trackValue: string | undefined, filterValue: string): boolean {
  if (!filterValue || filterValue === 'All') return true
  if (!trackValue?.trim()) return false
  return normalizeContributor(trackValue) === normalizeContributor(filterValue)
}

export function resolveCanonicalContributor(trackReciter: string, featured: string[]): string {
  const normalized = normalizeContributor(trackReciter)
  const match = featured.find((name) => normalizeContributor(name) === normalized)
  return match ?? trackReciter.trim()
}

export function buildContributorOptions(
  tracks: { reciter?: string }[],
  featured: string[],
  allLabel = 'All'
): string[] {
  const featuredKeys = new Set(featured.map(normalizeContributor))

  const canonicalFromTracks = [
    ...new Set(
      tracks
        .map((t) => t.reciter?.trim())
        .filter(Boolean)
        .map((reciter) => resolveCanonicalContributor(reciter!, featured))
    ),
  ]

  const featuredWithTracks = featured
    .filter((name) => name !== 'Other')
    .filter((name) => tracks.some((t) => contributorMatches(t.reciter, name)))

  const extra = canonicalFromTracks
    .filter((name) => !featuredKeys.has(normalizeContributor(name)))
    .sort((a, b) => a.localeCompare(b))

  // Dedupe case-insensitively so duplicate list entries never produce repeated
  // React keys (which silently drop options from the dropdown).
  const seen = new Set<string>()
  const options = [...featuredWithTracks, ...extra].filter((name) => {
    const key = normalizeContributor(name)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return [allLabel, ...options]
}

export function countTracksForContributor(
  tracks: { reciter?: string }[],
  contributor: string,
  allLabel = 'All'
): number {
  if (contributor === allLabel) return tracks.length
  return tracks.filter((t) => contributorMatches(t.reciter, contributor)).length
}
