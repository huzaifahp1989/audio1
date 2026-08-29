import { Capacitor, registerPlugin } from '@capacitor/core'
import type { AudioTrack } from '../types'
import { buildReadyMadeNasheedPlaylists } from './readyMadePlaylists'

interface AndroidAutoPlugin {
  publishLibrary(options: { tracks: AndroidAutoTrack[]; playlists: AndroidAutoPlaylist[] }): Promise<void>
}

interface AndroidAutoTrack {
  id: string
  title: string
  artist: string
  category: string
  audioUrl: string
  imageUrl?: string
}

interface AndroidAutoPlaylist {
  id: string
  name: string
  trackIds: string[]
}

const AndroidAuto = registerPlugin<AndroidAutoPlugin>('AndroidAuto')

export async function publishAndroidAutoLibrary(tracks: AudioTrack[]): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return
  const playableTracks = tracks.flatMap((track): AndroidAutoTrack[] => {
    if (!track.audioUrl || track.isSponsored) return []
    return [{
      id: track.id,
      title: track.title,
      artist: track.reciter || 'Islamic Audio',
      category: String(track.category || 'Other'),
      audioUrl: track.audioUrl,
      imageUrl: track.imageUrl,
    }]
  })
  const playlists = buildReadyMadeNasheedPlaylists(tracks).map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    trackIds: playlist.tracks.map((track) => track.id),
  }))
  await AndroidAuto.publishLibrary({ tracks: playableTracks, playlists })
}