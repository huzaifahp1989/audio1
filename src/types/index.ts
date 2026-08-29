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
