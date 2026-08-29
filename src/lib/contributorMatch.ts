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
    .filter((name) =>
      tracks.some((t) => contributorMatches(t.reciter, name))
    )

  const extra = canonicalFromTracks
    .filter((name) => !featured.includes(name))
    .sort((a, b) => a.localeCompare(b))

  return [allLabel, ...featuredWithTracks, ...extra]
}

export function countTracksForContributor(
  tracks: { reciter?: string }[],
  contributor: string,
  allLabel = 'All'
): number {
  if (contributor === allLabel) return tracks.length
  return tracks.filter((t) => contributorMatches(t.reciter, contributor)).length
}
