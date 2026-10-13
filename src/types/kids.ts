export interface KidsSubmission {
  id: string
  title: string
  category: string
  username: string
  audience?: 'child' | 'adult'
  age?: number
  city?: string
  mosque?: string
  recitationDetails?: string
  recitationFrom?: string
  recitationTo?: string
  readingAmount?: string
  submissionDate?: string
  contactEmail?: string
  audioUrl: string
  fileName: string
  fileSize: number
  duration?: number
  submittedAt: number
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt?: number
  reviewedBy?: string
  rejectionReason?: string
  feedback?: string
  feedbackSentAt?: number
}

export interface UserSubmission {
  id: string
  title: string
  category: string
  contributorName: string
  email: string
  mobile?: string
  description?: string
  reciter?: string
  topic?: string
  language?: string
  submitterId?: string | null
  audioUrl: string
  fileName: string
  fileSize: number
  duration?: number
  submittedAt: number
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt?: number
  reviewedBy?: string
  rejectionReason?: string
}

export const KIDS_CATEGORIES = [
  { id: 'quran', label: 'Quran Recitation', emoji: '📖' },
  { id: 'nasheed', label: 'Nasheed', emoji: '🎵' },
  { id: 'dua', label: 'Dua', emoji: '🤲' },
  { id: 'story', label: 'Islamic Story', emoji: '📚' },
  { id: 'poem', label: 'Islamic Poem', emoji: '✍️' },
  { id: 'talks', label: 'Talk', emoji: '🎙️' },
]
