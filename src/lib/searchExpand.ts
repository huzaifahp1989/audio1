const SYNONYMS: Record<string, string[]> = {
  quran: ['surah', 'recitation', 'tilawah', 'quranic'],
  nasheed: ['nasheeds', 'song', 'music', 'vocal'],
  talk: ['talks', 'lecture', 'khutbah', 'bayan', 'reminder'],
  dua: ['dua', 'adhkar', 'supplication', 'prayer'],
  hadith: ['sunnah', 'prophet', 'narrator'],
  patience: ['sabr', 'spirituality', 'heart'],
  ramadan: ['fasting', 'fast'],
  youth: ['education', 'teen', 'student'],
  forgiveness: ['repentance', 'tawbah'],
}

export function expandSearchTerms(query: string): string[] {
  const q = query.trim().toLowerCase()
  const terms = new Set<string>([q])
  for (const [key, values] of Object.entries(SYNONYMS)) {
    if (q.includes(key) || values.some((v) => q.includes(v))) {
      terms.add(key)
      values.forEach((v) => terms.add(v))
    }
  }
  return [...terms]
}

export function trackMatchesSearch(track: { title: string; reciter?: string; topic?: string; category: string }, query: string, categoryLabel: string): boolean {
  const terms = expandSearchTerms(query)
  const haystack = [
    track.title,
    track.reciter || '',
    track.topic || '',
    categoryLabel,
  ].join(' ').toLowerCase()
  return terms.some((term) => haystack.includes(term))
}
