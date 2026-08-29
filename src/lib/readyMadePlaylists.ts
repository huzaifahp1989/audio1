import type { AudioTrack } from '../types'

export interface ReadyMadePlaylist {
  id: string
  name: string
  description: string
  tracks: AudioTrack[]
}

export type NasheedLanguage = 'english' | 'urdu' | 'arabic' | 'other'

const URDU_ARTISTS = new Set([
  'Junaid Jamshed',
  'Owais Raza Qadri',
  'Zaheer Usmani',
  'Qazi Amanullah',
  'Hafiz Rahat Khan',
  'Qari Shadab Badar',
  'Qari Anas Younus',
  'Hafiz Abubakr',
  'Jalalees Officials',
])

const URDU_TITLE_HINTS = ['madine', 'meetha', 'ummati', 'lehza', 'yaad', 'dil', 'gunahon', 'naat', 'urdu']

const ARABIC_ARTISTS = new Set(['Ahmed Bukhatir', 'Ahmed Rajel', 'Hamza Namira', 'Humood'])

const ENGLISH_ARTISTS = new Set([
  'Amin Davis',
  'Kamal Uddin',
  'Maher Zain',
  'Muad',
  'Sami Yusuf',
  'Zain Bhikha',
])

const ARABIC_TITLE_HINTS = ['arabic', 'ya allah', 'ya rasul', 'rahman', 'ramadan']

export function getNasheedLanguage(track: Pick<AudioTrack, 'reciter' | 'title' | 'language'>): NasheedLanguage {
  if (track.language) return track.language
  const artist = track.reciter.trim()
  const title = track.title.toLowerCase()
  if (URDU_ARTISTS.has(artist) || URDU_TITLE_HINTS.some((hint) => title.includes(hint))) return 'urdu'
  if (/\p{Script=Arabic}/u.test(track.title) || ARABIC_ARTISTS.has(artist) || ARABIC_TITLE_HINTS.some((hint) => title.includes(hint))) return 'arabic'
  if (ENGLISH_ARTISTS.has(artist) || /\b(english|allah made|thank you|peace|believe|love|world|life|mother|father)\b/i.test(title)) return 'english'
  return 'other'
}

export function isUrduNasheed(track: Pick<AudioTrack, 'reciter' | 'title' | 'language'>): boolean {
  return getNasheedLanguage(track) === 'urdu'
}

export function buildReadyMadeNasheedPlaylists(tracks: AudioTrack[]): ReadyMadePlaylist[] {
  const nasheeds = tracks.filter((track) => track.category === 'nasheeds' && !track.isSponsored && track.audioUrl)
  const newest = [...nasheeds].sort((a, b) => b.uploadedAt - a.uploadedAt).slice(0, 25)
  const popular = [...nasheeds].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 25)
  const urdu = nasheeds.filter(isUrduNasheed)

  return [
    { id: 'nasheeds-new', name: 'New Nasheeds', description: 'The latest additions', tracks: newest },
    { id: 'nasheeds-popular', name: 'Popular Nasheeds', description: 'Most listened to', tracks: popular },
    { id: 'nasheeds-urdu', name: 'Urdu Nasheeds', description: 'Ready-made Urdu collection', tracks: urdu },
  ].filter((playlist) => playlist.tracks.length > 0)
}