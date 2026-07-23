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

/** Moderation status — missing status on legacy tracks means approved. */
export type TrackStatus = 'pending' | 'approved' | 'rejected'

export interface AudioTrack {
  id: string
  title: string
  category: AudioCategory
  reciter: string
  topic?: string  // For talks category; mirrors language for nasheeds
  language?: NasheedLanguage | string
  text?: string   // For audiobooks, hadith, and dua - the text content
  status?: TrackStatus
  source?: string // e.g. 'kids-studio', 'admin', 'record'
  fileName: string
  fileSize: number
  duration?: number
  mimeType: string
  uploadedAt: number
  audioUrl?: string  // Cloud storage URL
}

export function isTrackApproved(track: AudioTrack): boolean {
  return !track.status || track.status === 'approved'
}

export function isKidsCategory(category: AudioCategory): boolean {
  return category === 'kids-stories' || category === 'kids-quran' || category === 'kids-nasheeds'
}
