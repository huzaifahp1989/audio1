import type { AudioTrack } from '../types'

export type SortOption = 'newest' | 'oldest' | 'title' | 'views' | 'votes' | 'duration'

export const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  title: 'Title A–Z',
  views: 'Most played',
  votes: 'Most voted',
  duration: 'Longest',
}

export function sortTracks(list: AudioTrack[], sort: SortOption): AudioTrack[] {
  const copy = [...list]
  switch (sort) {
    case 'oldest':
      return copy.sort((a, b) => a.uploadedAt - b.uploadedAt)
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title))
    case 'views':
      return copy.sort((a, b) => (b.views || 0) - (a.views || 0))
    case 'votes':
      return copy.sort((a, b) => (b.votes || 0) - (a.votes || 0))
    case 'duration':
      return copy.sort((a, b) => (b.duration || 0) - (a.duration || 0))
    case 'newest':
    default:
      return copy.sort((a, b) => b.uploadedAt - a.uploadedAt)
  }
}
