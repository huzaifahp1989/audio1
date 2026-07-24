import type { AudioCategory } from '../types'

export const QURAN_RECITERS = [
  'Mishary Rashid Alafasy',
  'Abdul Rahman Al-Sudais',
  'Maher Al-Muaiqly',
  'Saud Al-Shuraim',
  'Abdul Basit Abdus Samad',
  'Saad Al-Ghamdi',
  'Yasser Al-Dosari',
  'Idris Abkar',
]

export const NASHEED_ARTISTS = [
  'Traditional Arabic',
  'إبراهيم الماجد',
  'Maher Zain',
  'Humood AlKhudher',
  'Humood',
  'Ahmed Bukhatir',
  'Mesut Kurtis',
  'Sami Yusuf',
  'Raef',
  'Hamza Namira',
  'Raihan',
  'Maher Al-Muaiqly',
  'Mishary Rashid Alafasy',
  'Muad',
  'Zain Bhikha',
  'Omar Esa',
  'Ilyas Mao',
  'Junaid Jamshed',
  'Owais Raza Qadri',
  'Hafiz Abubakr',
  'Qari Anas Younus',
  'Qazi Amanullah',
  'Other',
]

export const TALKS_SPEAKERS = [
  'Mufti Menk',
  'Nouman Ali Khan',
  'Omar Suleiman',
  'Yasir Qadhi',
  'Bilal Philips',
  'Other',
]

export const AUDIOBOOK_AUTHORS = [
  'Ibn Kathir',
  'Ibn Taymiyyah',
  'Al-Ghazali',
  'Ibn Qayyim Al-Jawziyya',
  'Other',
]

export const HADITH_NARRATORS = [
  'Imam Bukhari',
  'Imam Muslim',
  'Imam Tirmidhi',
  'Imam Abu Dawud',
  'Imam Nasai',
  'Imam Ibn Majah',
  'Other',
]

export const DUA_CATEGORIES = [
  { id: 'morning', label: 'Morning Adhkar', emoji: '🌅' },
  { id: 'evening', label: 'Evening Adhkar', emoji: '🌙' },
  { id: 'sleep', label: 'Before Sleep', emoji: '😴' },
  { id: 'prayer', label: 'Prayer & Salah', emoji: '🤲' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'food', label: 'Eating & Drinking', emoji: '🍽️' },
  { id: 'protection', label: 'Protection', emoji: '🛡️' },
  { id: 'healing', label: 'Healing & Health', emoji: '💚' },
  { id: 'success', label: 'Success & Rizq', emoji: '💼' },
  { id: 'family', label: 'Family & Children', emoji: '👨‍👩‍👧‍👦' },
  { id: 'forgiveness', label: 'Forgiveness', emoji: '🙏' },
  { id: 'general', label: 'General Duas', emoji: '📿' },
]

export const TALKS_TOPICS = [
  { id: 'aqeedah', label: 'Aqeedah (Creed)', emoji: '☝️' },
  { id: 'fiqh', label: 'Fiqh (Jurisprudence)', emoji: '📜' },
  { id: 'tafsir', label: 'Tafsir (Quran Explanation)', emoji: '📖' },
  { id: 'hadith', label: 'Hadith', emoji: '📚' },
  { id: 'seerah', label: 'Seerah (Prophet Biography)', emoji: '🕋' },
  { id: 'history', label: 'Islamic History', emoji: '🏛️' },
  { id: 'family', label: 'Family & Marriage', emoji: '👨‍👩‍👧‍👦' },
  { id: 'youth', label: 'Youth & Education', emoji: '🎓' },
  { id: 'dawah', label: 'Dawah & Outreach', emoji: '🗣️' },
  { id: 'spirituality', label: 'Spirituality & Heart', emoji: '❤️' },
  { id: 'social', label: 'Social Issues', emoji: '🌍' },
  { id: 'ramadan', label: 'Ramadan & Fasting', emoji: '🌙' },
  { id: 'hajj', label: 'Hajj & Umrah', emoji: '🕋' },
  { id: 'repentance', label: 'Repentance & Forgiveness', emoji: '🤲' },
  { id: 'hereafter', label: 'Death & Hereafter', emoji: '⚰️' },
  { id: 'general', label: 'General Reminders', emoji: '💡' },
]

export const ADMIN_PASSWORD = 'admin123'
export const STORAGE_KEY = 'islamic_audio_tracks'

export interface CategoryInfo {
  id: AudioCategory
  label: string
  description: string
  color: string
  gradient: string
  emoji: string
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'quran',
    label: 'Quran',
    description: 'Holy Quran recitations by world-renowned reciters',
    color: 'text-emerald-400',
    gradient: 'from-emerald-900/50 to-emerald-800/30',
    emoji: '📖',
  },
  {
    id: 'nasheeds',
    label: 'Nasheeds',
    description: 'Beautiful Islamic songs and vocal performances',
    color: 'text-violet-400',
    gradient: 'from-violet-900/50 to-violet-800/30',
    emoji: '🎵',
  },
  {
    id: 'talks',
    label: 'Talks',
    description: 'Inspiring Islamic lectures and khutbahs',
    color: 'text-sky-400',
    gradient: 'from-sky-900/50 to-sky-800/30',
    emoji: '🎙️',
  },
  {
    id: 'kids-stories',
    label: 'Kids',
    description: 'Fun and educational audio for children',
    color: 'text-amber-400',
    gradient: 'from-amber-900/50 to-amber-800/30',
    emoji: '🌟',
  },
]

export const KIDS_CATEGORIES = [
  { id: 'kids-stories' as AudioCategory, label: 'Stories', emoji: '📚', color: 'from-amber-600 to-orange-600' },
  { id: 'kids-quran' as AudioCategory, label: 'Kids Quran', emoji: '📖', color: 'from-emerald-600 to-teal-600' },
  { id: 'kids-nasheeds' as AudioCategory, label: 'Kids Nasheeds', emoji: '🎶', color: 'from-pink-600 to-rose-600' },
]

export const ALL_CATEGORIES_LIST: { value: AudioCategory; label: string }[] = [
  { value: 'quran', label: 'Quran' },
  { value: 'nasheeds', label: 'Nasheeds' },
  { value: 'talks', label: 'Talks' },
  { value: 'kids-stories', label: 'Kids – Stories' },
  { value: 'kids-quran', label: 'Kids – Quran' },
  { value: 'kids-nasheeds', label: 'Kids – Nasheeds' },
  { value: 'audiobooks', label: 'Audiobooks' },
  { value: 'hadith', label: 'Hadith' },
  { value: 'dua', label: 'Dua & Adhkar' },
]
