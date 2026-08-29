export type PodcastType = 'spotify' | 'custom' | 'live'

export interface PodcastEpisode {
  id: string
  title: string
  description?: string
  type: PodcastType
  // For Spotify podcasts
  spotifyUrl?: string
  spotifyId?: string
  embedUrl?: string
  // For custom podcasts
  audioUrl?: string
  imageUrl?: string
  duration?: number
  // For live recordings
  recordingId?: string
  guests?: PodcastGuest[]
  // Common fields
  host: string
  category?: string
  tags?: string[]
  publishedAt: number
  views: number
}

export interface PodcastGuest {
  id: string
  name: string
  email?: string
  imageUrl?: string
  joinedAt?: number
  leftAt?: number
}

export interface LiveRecording {
  id: string
  hostId: string
  hostName: string
  title: string
  description?: string
  status: 'waiting' | 'recording' | 'ended'
  guests: PodcastGuest[]
  createdAt: number
  startedAt?: number
  endedAt?: number
  recordingUrl?: string
}

export interface PodcastCategory {
  id: string
  label: string
  emoji: string
}

export const PODCAST_CATEGORIES: PodcastCategory[] = [
  { id: 'islamic', label: 'Islamic', emoji: '🕌' },
  { id: 'education', label: 'Education', emoji: '📚' },
  { id: 'motivation', label: 'Motivation', emoji: '💪' },
  { id: 'interview', label: 'Interview', emoji: '🎙️' },
  { id: 'quran', label: 'Quran', emoji: '📖' },
  { id: 'lifestyle', label: 'Lifestyle', emoji: '✨' },
  { id: 'news', label: 'News', emoji: '📰' },
]
