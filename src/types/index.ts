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
}
