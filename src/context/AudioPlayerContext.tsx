import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import type { AudioTrack } from '../types'

interface PlayerState {
  currentTrack: AudioTrack | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playlist: AudioTrack[]
  playlistIndex: number
  hasNext: boolean
  hasPrev: boolean
  play: (track: AudioTrack) => void
  playFromList: (track: AudioTrack, tracks: AudioTrack[], index: number) => void
  playNext: () => void
  playPrev: () => void
  togglePlay: () => void
  seek: (time: number) => void
  setVolume: (vol: number) => void
  stopTrack: () => void
}

const AudioPlayerContext = createContext<PlayerState | null>(null)

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(new Audio())

  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [playlist, setPlaylist] = useState<AudioTrack[]>([])
  const [playlistIndex, setPlaylistIndex] = useState(-1)

  const hasNext = playlistIndex >= 0 && playlistIndex < playlist.length - 1
  const hasPrev = playlistIndex > 0

  // Ref for playNext to avoid stale closure in onEnded
  const playNextRef = useRef<() => void>(() => {})

  const _playTrack = useCallback(async (track: AudioTrack) => {
    const audio = audioRef.current
    audio.pause()
    audio.src = ''

    const audioUrl = track.audioUrl
    if (!audioUrl) {
      console.error('No audio URL available')
      return
    }

    audio.src = audioUrl
    audio.volume = volume
    setCurrentTrack(track)
    setCurrentTime(0)
    setDuration(0)
    await audio.play()
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration || 0)
    const onEnded = () => {
      setIsPlaying(false)
      playNextRef.current()
    }
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.pause()
    }
  }, [])

  const play = useCallback(async (track: AudioTrack) => {
    const audio = audioRef.current

    // Same track — just toggle
    if (currentTrack?.id === track.id) {
      if (audio.paused) {
        await audio.play()
      } else {
        audio.pause()
      }
      return
    }

    await _playTrack(track)
  }, [currentTrack, _playTrack])

  const playFromList = useCallback(async (track: AudioTrack, tracks: AudioTrack[], index: number) => {
    const audio = audioRef.current

    // Same track — just toggle
    if (currentTrack?.id === track.id) {
      if (audio.paused) {
        await audio.play()
      } else {
        audio.pause()
      }
      // Update playlist context even on toggle
      setPlaylist(tracks)
      setPlaylistIndex(index)
      return
    }

    setPlaylist(tracks)
    setPlaylistIndex(index)
    await _playTrack(track)
  }, [currentTrack, _playTrack])

  const playNext = useCallback(() => {
    if (playlistIndex >= 0 && playlistIndex < playlist.length - 1) {
      const nextIndex = playlistIndex + 1
      const nextTrack = playlist[nextIndex]
      setPlaylistIndex(nextIndex)
      _playTrack(nextTrack)
    }
  }, [playlist, playlistIndex, _playTrack])

  const playPrev = useCallback(() => {
    if (playlistIndex > 0) {
      const prevIndex = playlistIndex - 1
      const prevTrack = playlist[prevIndex]
      setPlaylistIndex(prevIndex)
      _playTrack(prevTrack)
    }
  }, [playlist, playlistIndex, _playTrack])

  // Keep ref updated
  useEffect(() => {
    playNextRef.current = playNext
  }, [playNext])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (audio.paused) {
      audio.play()
    } else {
      audio.pause()
    }
  }, [])

  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    audio.currentTime = time
    setCurrentTime(time)
  }, [])

  const setVolume = useCallback((vol: number) => {
    audioRef.current.volume = vol
    setVolumeState(vol)
  }, [])

  const stopTrack = useCallback(() => {
    audioRef.current.pause()
    audioRef.current.src = ''
    setCurrentTrack(null)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setPlaylist([])
    setPlaylistIndex(-1)
  }, [])

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack, isPlaying, currentTime, duration, volume,
        playlist, playlistIndex, hasNext, hasPrev,
        play, playFromList, playNext, playPrev,
        togglePlay, seek, setVolume, stopTrack
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  )
}

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext)
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider')
  return ctx
}
