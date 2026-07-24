import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import type { AudioTrack } from '../types'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import {
  adsEnabledByDefault,
  createAdTrack,
  isAdTrack,
  randomAdInterval,
} from '../lib/playbackAds'
import {
  bindMediaSessionHandlers,
  setMediaSessionPlaybackState,
  updateMediaSessionMetadata,
  updateMediaSessionPosition,
} from '../lib/mediaSession'

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
  /** True while a sponsored interstitial is playing */
  isAdPlaying: boolean
  /** Continuous / car mode: wrap playlist and keep going */
  continuousPlay: boolean
  adsEnabled: boolean
  play: (track: AudioTrack) => void
  playFromList: (track: AudioTrack, tracks: AudioTrack[], index: number) => void
  playNext: () => void
  playPrev: () => void
  togglePlay: () => void
  seek: (time: number) => void
  setVolume: (vol: number) => void
  stopTrack: () => void
  skipAd: () => void
  setContinuousPlay: (on: boolean) => void
  setAdsEnabled: (on: boolean) => void
  /** Start a category queue for car / continuous listening */
  startQueue: (tracks: AudioTrack[], startIndex?: number, opts?: { continuous?: boolean }) => void
}

const AudioPlayerContext = createContext<PlayerState | null>(null)

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(new Audio())
  const { recordTrackView } = useAudioLibrary()

  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [playlist, setPlaylist] = useState<AudioTrack[]>([])
  const [playlistIndex, setPlaylistIndex] = useState(-1)
  const [isAdPlaying, setIsAdPlaying] = useState(false)
  const [continuousPlay, setContinuousPlayState] = useState(false)
  const [adsEnabled, setAdsEnabledState] = useState(() => adsEnabledByDefault())

  const playlistRef = useRef<AudioTrack[]>([])
  const playlistIndexRef = useRef(-1)
  const continuousPlayRef = useRef(false)
  const adsEnabledRef = useRef(adsEnabled)
  const tracksSinceAdRef = useRef(0)
  const nextAdAtRef = useRef(randomAdInterval())
  const isAdRef = useRef(false)
  const pendingAfterAdIndexRef = useRef<number | null>(null)
  const volumeRef = useRef(volume)
  const currentTrackRef = useRef<AudioTrack | null>(null)

  useEffect(() => { playlistRef.current = playlist }, [playlist])
  useEffect(() => { playlistIndexRef.current = playlistIndex }, [playlistIndex])
  useEffect(() => { continuousPlayRef.current = continuousPlay }, [continuousPlay])
  useEffect(() => { adsEnabledRef.current = adsEnabled }, [adsEnabled])
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { currentTrackRef.current = currentTrack }, [currentTrack])

  const hasNext =
    continuousPlay
      ? playlist.length > 0
      : playlistIndex >= 0 && playlistIndex < playlist.length - 1
  const hasPrev =
    continuousPlay
      ? playlist.length > 0
      : playlistIndex > 0

  const playNextRef = useRef<() => void>(() => {})
  const playPrevRef = useRef<() => void>(() => {})

  const _playTrack = useCallback(async (track: AudioTrack, opts?: { asAd?: boolean }) => {
    const audio = audioRef.current
    audio.pause()
    audio.src = ''

    const audioUrl = track.audioUrl
    if (!audioUrl) {
      console.error('No audio URL available')
      return
    }

    const asAd = !!opts?.asAd || isAdTrack(track)
    isAdRef.current = asAd
    setIsAdPlaying(asAd)

    audio.src = audioUrl
    audio.volume = volumeRef.current
    setCurrentTrack(asAd ? track : { ...track, views: (track.views || 0) + 1 })
    setCurrentTime(0)
    setDuration(0)
    if (!asAd) {
      recordTrackView(track.id)
    }
    updateMediaSessionMetadata(track)
    try {
      await audio.play()
    } catch (err) {
      console.error('[Player] play failed', err)
    }
  }, [recordTrackView])

  const advanceToContentIndex = useCallback((nextIndex: number) => {
    const list = playlistRef.current
    if (!list.length) return
    let idx = nextIndex
    if (continuousPlayRef.current) {
      idx = ((idx % list.length) + list.length) % list.length
    } else if (idx < 0 || idx >= list.length) {
      return
    }
    const nextTrack = list[idx]
    setPlaylistIndex(idx)
    playlistIndexRef.current = idx
    void _playTrack(nextTrack)
  }, [_playTrack])

  const playAdThen = useCallback((resumeIndex: number) => {
    pendingAfterAdIndexRef.current = resumeIndex
    tracksSinceAdRef.current = 0
    nextAdAtRef.current = randomAdInterval()
    void _playTrack(createAdTrack(), { asAd: true })
  }, [_playTrack])

  const playNext = useCallback(() => {
    const list = playlistRef.current
    if (!list.length) return

    // Leaving an ad → resume queued content
    if (isAdRef.current) {
      const resume = pendingAfterAdIndexRef.current
      pendingAfterAdIndexRef.current = null
      isAdRef.current = false
      setIsAdPlaying(false)
      if (resume !== null) {
        advanceToContentIndex(resume)
      }
      return
    }

    const cur = playlistIndexRef.current
    let nextIndex = cur + 1
    if (nextIndex >= list.length) {
      if (continuousPlayRef.current) nextIndex = 0
      else return
    }

    // Count finished/skipped content tracks toward ad interval
    tracksSinceAdRef.current += 1
    if (adsEnabledRef.current && tracksSinceAdRef.current >= nextAdAtRef.current) {
      playAdThen(nextIndex)
      return
    }

    advanceToContentIndex(nextIndex)
  }, [advanceToContentIndex, playAdThen])

  const playPrev = useCallback(() => {
    const list = playlistRef.current
    if (!list.length) return

    if (isAdRef.current) {
      // Skip ad backward → play previous content (or restart current queue item)
      pendingAfterAdIndexRef.current = null
      isAdRef.current = false
      setIsAdPlaying(false)
      const cur = playlistIndexRef.current
      advanceToContentIndex(cur >= 0 ? cur : 0)
      return
    }

    const audio = audioRef.current
    // Car UX: if >3s into track, restart; else previous
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      setCurrentTime(0)
      return
    }

    let prevIndex = playlistIndexRef.current - 1
    if (prevIndex < 0) {
      if (continuousPlayRef.current) prevIndex = list.length - 1
      else return
    }
    advanceToContentIndex(prevIndex)
  }, [advanceToContentIndex])

  useEffect(() => {
    playNextRef.current = playNext
  }, [playNext])
  useEffect(() => {
    playPrevRef.current = playPrev
  }, [playPrev])

  useEffect(() => {
    const audio = audioRef.current

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      updateMediaSessionPosition(audio.currentTime, audio.duration || 0)
    }
    const onDurationChange = () => setDuration(audio.duration || 0)
    const onEnded = () => {
      setIsPlaying(false)
      playNextRef.current()
    }
    const onPlay = () => {
      setIsPlaying(true)
      setMediaSessionPlaybackState(true)
    }
    const onPause = () => {
      setIsPlaying(false)
      setMediaSessionPlaybackState(false)
    }

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

  // Media Session handlers for Android Auto / Bluetooth / lock screen
  useEffect(() => {
    const audio = audioRef.current
    return bindMediaSessionHandlers({
      play: () => { void audio.play() },
      pause: () => { audio.pause() },
      playNext: () => playNextRef.current(),
      playPrev: () => playPrevRef.current(),
      seek: (time) => {
        audio.currentTime = time
        setCurrentTime(time)
      },
      getPosition: () => ({
        position: audio.currentTime || 0,
        duration: audio.duration || 0,
        playbackRate: 1,
      }),
    })
  }, [])

  useEffect(() => {
    if (currentTrack) updateMediaSessionMetadata(currentTrack)
  }, [currentTrack])

  const play = useCallback(async (track: AudioTrack) => {
    const audio = audioRef.current
    if (currentTrackRef.current?.id === track.id && !isAdRef.current) {
      if (audio.paused) await audio.play()
      else audio.pause()
      return
    }
    // Single-track play: set one-item playlist so next/prev still work in continuous mode
    setPlaylist([track])
    setPlaylistIndex(0)
    playlistRef.current = [track]
    playlistIndexRef.current = 0
    await _playTrack(track)
  }, [_playTrack])

  const playFromList = useCallback(async (track: AudioTrack, tracks: AudioTrack[], index: number) => {
    const audio = audioRef.current
    if (currentTrackRef.current?.id === track.id && !isAdRef.current) {
      if (audio.paused) await audio.play()
      else audio.pause()
      setPlaylist(tracks)
      setPlaylistIndex(index)
      playlistRef.current = tracks
      playlistIndexRef.current = index
      return
    }

    setPlaylist(tracks)
    setPlaylistIndex(index)
    playlistRef.current = tracks
    playlistIndexRef.current = index
    await _playTrack(track)
  }, [_playTrack])

  const startQueue = useCallback((tracks: AudioTrack[], startIndex = 0, opts?: { continuous?: boolean }) => {
    if (!tracks.length) return
    const idx = Math.min(Math.max(0, startIndex), tracks.length - 1)
    if (opts?.continuous !== undefined) {
      setContinuousPlayState(opts.continuous)
      continuousPlayRef.current = opts.continuous
    } else {
      setContinuousPlayState(true)
      continuousPlayRef.current = true
    }
    tracksSinceAdRef.current = 0
    nextAdAtRef.current = randomAdInterval()
    setPlaylist(tracks)
    setPlaylistIndex(idx)
    playlistRef.current = tracks
    playlistIndexRef.current = idx
    void _playTrack(tracks[idx])
  }, [_playTrack])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (audio.paused) void audio.play()
    else audio.pause()
  }, [])

  const seek = useCallback((time: number) => {
    if (isAdRef.current) return // don't seek ads mid-roll awkwardly from UI; Media Session still can
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
    setIsAdPlaying(false)
    isAdRef.current = false
    pendingAfterAdIndexRef.current = null
    playlistRef.current = []
    playlistIndexRef.current = -1
    setMediaSessionPlaybackState(false)
  }, [])

  const skipAd = useCallback(() => {
    if (!isAdRef.current) return
    playNext()
  }, [playNext])

  const setContinuousPlay = useCallback((on: boolean) => {
    continuousPlayRef.current = on
    setContinuousPlayState(on)
  }, [])

  const setAdsEnabled = useCallback((on: boolean) => {
    adsEnabledRef.current = on
    setAdsEnabledState(on)
    try {
      if (on) localStorage.removeItem('disable_playback_ads')
      else localStorage.setItem('disable_playback_ads', '1')
    } catch { /* ignore */ }
  }, [])

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack, isPlaying, currentTime, duration, volume,
        playlist, playlistIndex, hasNext, hasPrev,
        isAdPlaying, continuousPlay, adsEnabled,
        play, playFromList, playNext, playPrev,
        togglePlay, seek, setVolume, stopTrack,
        skipAd, setContinuousPlay, setAdsEnabled, startQueue,
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
