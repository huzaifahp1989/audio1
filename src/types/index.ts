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

export interface AudioTrack {
  id: string
  title: string
  category: AudioCategory
  reciter: string
  topic?: string  // For talks category
  text?: string   // For audiobooks, hadith, and dua - the text content
  fileName: string
  fileSize: number
  duration?: number
  mimeType: string
  uploadedAt: number
  audioUrl?: string  // Cloud storage URL
}
