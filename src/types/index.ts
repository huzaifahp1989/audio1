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

<<<<<<< HEAD
export type AudioCategory = BuiltInAudioCategory | (string & {})

export type PlaylistAdTargetCategory = 'quran' | 'nasheeds' | 'talks'
=======
/** Language category for nasheeds (and optionally other audio). */
export type NasheedLanguage = 'arabic' | 'english' | 'urdu'
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3

export interface AudioTrack {
  id: string
  title: string
  category: AudioCategory
  reciter: string
<<<<<<< HEAD
  language?: 'english' | 'urdu' | 'arabic' | 'other'
  isSponsored?: boolean
  sponsoredAudioId?: string
  sponsorHref?: string
  sponsorLabel?: string
  topic?: string  // For talks category
=======
  topic?: string  // For talks category; mirrors language for nasheeds
  language?: NasheedLanguage | string
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
  text?: string   // For audiobooks, hadith, and dua - the text content
  fileName: string
  fileSize: number
  imageFileName?: string
  imageUrl?: string
  duration?: number
  mimeType: string
  uploadedAt: number
  audioUrl?: string  // Cloud storage URL
<<<<<<< HEAD
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
=======
  views?: number     // Play/view count
  /** Where the track was created: kids-studio, record, admin, upload */
  source?: string
  /** True for a cappella / vocals-only nasheeds (no instruments). */
  vocalsOnly?: boolean
}

export function isKidsCategory(category: AudioCategory | string): boolean {
  return category === 'kids-stories' || category === 'kids-quran' || category === 'kids-nasheeds'
}

/** Recorded via Kids Studio or Record page (not a library MP3 upload). */
export function isRecordedTrack(track: AudioTrack): boolean {
  if (track.source === 'kids-studio' || track.source === 'record') return true
  const mime = (track.mimeType || '').toLowerCase()
  const file = (track.fileName || '').toLowerCase()
  return mime.includes('wav') || mime.includes('webm') || file.endsWith('.wav') || file.endsWith('.webm')
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
}
