export type BuiltInAudioCategory =
  | 'quran'
  | 'nasheeds'
  | 'talks'
  | 'kids-stories'
  | 'kids-quran'
  | 'kids-nasheeds'
  | 'kids-talks'
  | 'audiobooks'
  | 'hadith'
  | 'uncategorized'
  | 'dua'

export type AudioCategory = BuiltInAudioCategory | (string & {})

export type NasheedLanguage = 'english' | 'urdu' | 'arabic' | 'other'

export type PlaylistAdTargetCategory = 'quran' | 'nasheeds' | 'talks'

export interface AudioTrack {
  id: string
  title: string
  category: AudioCategory
  reciter: string
  language?: 'english' | 'urdu' | 'arabic' | 'other'
  isSponsored?: boolean
  sponsoredAudioId?: string
  sponsorHref?: string
  sponsorLabel?: string
  topic?: string  // For talks category
  text?: string   // For audiobooks, hadith, and dua - the text content
  fileName: string
  fileSize: number
  imageFileName?: string
  imageUrl?: string
  duration?: number
  mimeType: string
  uploadedAt: number
  audioUrl?: string  // Cloud storage URL
  views?: number     // Play count
  votes?: number     // Upvotes (nasheeds & talks)
  source?: string
}

export function isKidsCategory(category: AudioCategory): boolean {
  return category === 'kids-stories' || category === 'kids-quran' || category === 'kids-nasheeds' || category === 'kids-talks'
}

export function isRecordedTrack(track: Pick<AudioTrack, 'source' | 'fileName'>): boolean {
  return track.source === 'record' || track.source === 'kids-studio' || /\.(wav|webm)$/i.test(track.fileName)
}

export interface AdAudioTrack {
  id: string
  title: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedAt: number
  audioUrl: string
  duration?: number
  heardCount?: number
  sponsorHref?: string
  active?: boolean
  sortOrder?: number
  targetCategories?: PlaylistAdTargetCategory[]
}
