export type AudioCategory =
  | 'quran'
  | 'nasheeds'
  | 'talks'
  | 'kids-stories'
  | 'kids-quran'
  | 'kids-nasheeds'
  | 'audiobooks'
  | 'hadith'
  | 'dua'

/** Language category for nasheeds (and optionally other audio). */
export type NasheedLanguage = 'arabic' | 'english' | 'urdu'

export interface AudioTrack {
  id: string
  title: string
  category: AudioCategory
  reciter: string
  topic?: string  // For talks category; mirrors language for nasheeds
  language?: NasheedLanguage | string
  text?: string   // For audiobooks, hadith, and dua - the text content
  fileName: string
  fileSize: number
  duration?: number
  mimeType: string
  uploadedAt: number
  audioUrl?: string  // Cloud storage URL
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
}
