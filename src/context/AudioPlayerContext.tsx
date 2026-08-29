import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import type { AudioTrack } from '../types'
<<<<<<< HEAD
import { incrementTrackViews } from '../lib/views'
import { getAllAdAudioTracks, incrementAdAudioHeardCount } from '../lib/storage'
import { buildAutoPlaylistSelection, setAdminAdAudioTracks } from '../lib/playlistQueue'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { recordPlay, updateProgress, getProgress } from '../lib/recentlyPlayed'
import { recordListeningDay } from '../lib/streaks'
import { trackEvent, trackAudioPlay, trackAudioResume, trackAudioPause, trackAudioComplete, trackAudioProgress, trackAudioError } from '../lib/analytics'
import { publishAndroidAutoLibrary } from '../lib/androidAuto'

const PLAYLIST_STORAGE_KEY = 'audio-player-saved-playlists'

export type SleepTimerOption = 15 | 30 | 60 | 'end'
=======
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
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3

interface PlayerState {
  currentTrack: AudioTrack | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playbackRate: number
  audioError: string | null
  playlist: AudioTrack[]
  playlistIndex: number
  hasNext: boolean
  hasPrev: boolean
<<<<<<< HEAD
  hasNextSponsored: boolean
  activePlaylistName: string | null
  savedPlaylists: Record<string, AudioTrack[]>
  sleepTimer: SleepTimerOption | null
  sleepEndsAt: number | null
=======
  /** True while a sponsored interstitial is playing */
  isAdPlaying: boolean
  /** Continuous / car mode: wrap playlist and keep going */
  continuousPlay: boolean
  adsEnabled: boolean
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
  play: (track: AudioTrack) => void
  playFromList: (track: AudioTrack, tracks: AudioTrack[], index: number) => void
  playNext: () => void
  playPrev: () => void
  skipTracks: (count: number) => void
  jumpToNextSponsored: () => void
  togglePlay: () => void
  seek: (time: number) => void
  setVolume: (vol: number) => void
  setPlaybackRate: (rate: number) => void
  setSleepTimer: (option: SleepTimerOption | null) => void
  stopTrack: () => void
<<<<<<< HEAD
  addTrackToPlaylist: (track: AudioTrack) => void
  removeTrackFromPlaylist: (trackId: string) => void
  clearPlaylist: () => void
  savePlaylist: (name: string) => void
  loadPlaylist: (name: string) => void
  deletePlaylist: (name: string) => void
=======
  skipAd: () => void
  setContinuousPlay: (on: boolean) => void
  setAdsEnabled: (on: boolean) => void
  /** Start a category queue for car / continuous listening */
  startQueue: (tracks: AudioTrack[], startIndex?: number, opts?: { continuous?: boolean }) => void
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
}

const AudioPlayerContext = createContext<PlayerState | null>(null)

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const { incrementTrackView, tracks } = useAudioLibrary()
  const audioRef = useRef<HTMLAudioElement>(new Audio())
  const { recordTrackView } = useAudioLibrary()

  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [playlist, setPlaylist] = useState<AudioTrack[]>([])
  const [playlistIndex, setPlaylistIndex] = useState(-1)
<<<<<<< HEAD
  const [activePlaylistName, setActivePlaylistName] = useState<string | null>(null)
  const [savedPlaylists, setSavedPlaylists] = useState<Record<string, AudioTrack[]>>({})
  const [sleepTimer, setSleepTimerState] = useState<SleepTimerOption | null>(null)
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null)
  const sleepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resumeTargetRef = useRef<number>(0)
  const lastProgressWriteRef = useRef<number>(0)
  const currentTrackRef = useRef<AudioTrack | null>(null)
  const playlistRef = useRef<AudioTrack[]>([])
  const playlistIndexRef = useRef(-1)
  const libraryTracksRef = useRef<AudioTrack[]>([])
  const progressMilestonesRef = useRef<Set<number>>(new Set())
  const wasPlayingRef = useRef(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const adTracks = await getAllAdAudioTracks()
        if (!alive) return
        setAdminAdAudioTracks(adTracks)
      } catch (error) {
        console.warn('[AudioPlayer] Failed to load admin ad audio', error)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    currentTrackRef.current = currentTrack
  }, [currentTrack])

  useEffect(() => {
    playlistRef.current = playlist
  }, [playlist])

  useEffect(() => {
    playlistIndexRef.current = playlistIndex
  }, [playlistIndex])

  useEffect(() => {
    libraryTracksRef.current = tracks
    publishAndroidAutoLibrary(tracks).catch((error) => {
      console.warn('[AudioPlayer] Failed to publish Android Auto library', error)
    })
  }, [tracks])

  const hasNext = playlistIndex >= 0 && playlistIndex < playlist.length - 1
  const hasPrev = playlistIndex > 0
  const hasNextSponsored = playlist.findIndex((track, idx) => idx > playlistIndex && track.isSponsored) !== -1

  useEffect(() => {
    const stored = localStorage.getItem(PLAYLIST_STORAGE_KEY)
    if (!stored) return

    try {
      const parsed = JSON.parse(stored) as Record<string, AudioTrack[]>
      setSavedPlaylists(parsed)
    } catch (err) {
      console.warn('[AudioPlayer] Failed to parse saved playlists', err)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(savedPlaylists))
  }, [savedPlaylists])

  const addTrackToPlaylist = useCallback((track: AudioTrack) => {
    setPlaylist((prev) => {
      if (prev.some((item) => item.id === track.id)) return prev
      const next = [...prev, track]
      if (playlistIndex === -1) {
        setPlaylistIndex(0)
      }
      return next
    })
    trackEvent('playlist_add_track', { track_id: track.id, category: track.category })
  }, [playlistIndex])

  const removeTrackFromPlaylist = useCallback((trackId: string) => {
    setPlaylist((prev) => {
      const next = prev.filter((item) => item.id !== trackId)
      if (next.length === 0) {
        setPlaylistIndex(-1)
        setCurrentTrack((current) => (current?.id === trackId ? null : current))
      } else if (playlistIndex >= next.length) {
        setPlaylistIndex(next.length - 1)
      }
      return next
    })
    trackEvent('playlist_remove_track', { track_id: trackId })
  }, [playlistIndex])

  const clearPlaylist = useCallback(() => {
    setPlaylist([])
    setPlaylistIndex(-1)
    setActivePlaylistName(null)
    trackEvent('playlist_clear')
  }, [])

  const savePlaylist = useCallback((name: string) => {
    const normalized = name.trim()
    if (!normalized) return
    const cleanPlaylist = playlist.filter((track) => !track.isSponsored)
    setSavedPlaylists((prev) => ({ ...prev, [normalized]: cleanPlaylist }))
    setActivePlaylistName(normalized)
    trackEvent('playlist_save', { playlist_name: normalized, track_count: cleanPlaylist.length })
  }, [playlist])

  const loadPlaylist = useCallback((name: string) => {
    const playlistToLoad = savedPlaylists[name]
    if (!playlistToLoad) return
    setPlaylist(playlistToLoad)
    setPlaylistIndex(playlistToLoad.length > 0 ? 0 : -1)
    setActivePlaylistName(name)
    trackEvent('playlist_load', { playlist_name: name, track_count: playlistToLoad.length })
  }, [savedPlaylists])

  const deletePlaylist = useCallback((name: string) => {
    setSavedPlaylists((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
    if (activePlaylistName === name) {
      setActivePlaylistName(null)
      setPlaylist([])
      setPlaylistIndex(-1)
    }
    trackEvent('playlist_delete', { playlist_name: name })
  }, [activePlaylistName])

  // Refs to avoid stale closures in event/media-session handlers
  const playNextRef = useRef<() => void>(() => {})
  const playPrevRef = useRef<() => void>(() => {})
  const playFromListRef = useRef<(track: AudioTrack, tracks: AudioTrack[], index: number) => void>(() => {})
  const playNextAutoRef = useRef<() => void>(() => {})
=======
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
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3

  const _playTrack = useCallback(async (track: AudioTrack, opts?: { asAd?: boolean }) => {
    const audio = audioRef.current
    audio.pause()
    audio.src = ''

    const audioUrl = track.audioUrl
    if (!audioUrl) {
      console.error('No audio URL available')
      return
    }

<<<<<<< HEAD
    setAudioError(null)
    audio.src = audioUrl
    audio.volume = volume
    audio.playbackRate = playbackRate

    // Remember any saved resume position to seek to once metadata loads
    const saved = getProgress(track.id)
    resumeTargetRef.current = saved ? saved.position : 0

    progressMilestonesRef.current = new Set()
    wasPlayingRef.current = true

    if (!track.isSponsored) {
      recordPlay(track)
      recordListeningDay()
      trackAudioPlay({
        id: track.id,
        title: track.title,
        category: track.category,
        reciter: track.reciter,
        duration: track.duration,
      })
      // Keep legacy event name for existing GA reports
      trackEvent('play_track', { track_id: track.id, category: track.category, reciter: track.reciter })
    } else {
      trackEvent('play_sponsored_break', { track_id: track.id, category: track.category })
      if (track.sponsoredAudioId) {
        try {
          await incrementAdAudioHeardCount(track.sponsoredAudioId)
        } catch (error) {
          console.warn('[AudioPlayer] Failed to increment ad heard count', error)
        }
      }
    }

    let updatedTrack = track
    if (!track.isSponsored) {
      const newViewCount = await incrementTrackViews(track.id)
      console.log('[Views] Track played, new count:', newViewCount)
      updatedTrack = { ...track, views: newViewCount }
      incrementTrackView(track.id, newViewCount)
    }

    setCurrentTrack(updatedTrack)

    // Update playlist
    setPlaylist(prev => prev.map(t => t.id === track.id ? updatedTrack : t))
    
    setCurrentTime(0)
    setDuration(0)
    audio.preload = 'auto'
    try {
      audio.load()
    } catch { /* ignore */ }
    await audio.play()
  }, [volume, playbackRate, incrementTrackView])
=======
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
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3

  useEffect(() => {
    const audio = audioRef.current

<<<<<<< HEAD
    const readFiniteDuration = () => {
      const d = audio.duration
      return Number.isFinite(d) && d > 0 ? d : 0
    }

    /** Some remote MP3s report duration as Infinity until we force a probe seek. */
    const resolveDuration = () => {
      const finite = readFiniteDuration()
      if (finite > 0) {
        setDuration(finite)
        return
      }
      if (audio.duration === Infinity) {
        const onProbe = () => {
          audio.removeEventListener('timeupdate', onProbe)
          const probed = readFiniteDuration()
          if (probed > 0) setDuration(probed)
          try {
            audio.currentTime = resumeTargetRef.current > 0 ? resumeTargetRef.current : 0
          } catch { /* ignore */ }
          resumeTargetRef.current = 0
        }
        audio.addEventListener('timeupdate', onProbe)
        try {
          audio.currentTime = 1e101
        } catch { /* ignore */ }
      }
    }

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      // Persist resume position at most every ~4s
      const now = Date.now()
      const dur = readFiniteDuration()
      const track = currentTrackRef.current
      if (!track?.isSponsored && now - lastProgressWriteRef.current > 4000 && dur > 0) {
        lastProgressWriteRef.current = now
        if (track?.id) updateProgress(track.id, audio.currentTime, dur)
      }

      // Firebase Analytics progress milestones (once each per track)
      if (track && dur > 0) {
        const pct = (audio.currentTime / dur) * 100
        for (const milestone of [25, 50, 75] as const) {
          if (pct >= milestone && !progressMilestonesRef.current.has(milestone)) {
            progressMilestonesRef.current.add(milestone)
            trackAudioProgress({ id: track.id, category: track.category }, milestone)
          }
        }
      }
    }
    const onDurationChange = () => {
      const finite = readFiniteDuration()
      if (finite > 0) setDuration(finite)
      else resolveDuration()
    }
    const onLoadedMetadata = () => {
      resolveDuration()
      // Resume from saved position if we have one
      const finite = readFiniteDuration()
      const target = resumeTargetRef.current
      if (target > 0 && finite > 0 && target < finite - 5) {
        try { audio.currentTime = target } catch { /* ignore */ }
        resumeTargetRef.current = 0
      }
    }
=======
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      updateMediaSessionPosition(audio.currentTime, audio.duration || 0)
    }
    const onDurationChange = () => setDuration(audio.duration || 0)
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
    const onEnded = () => {
      setIsPlaying(false)
      wasPlayingRef.current = false
      const track = currentTrackRef.current
      const id = track?.id
      if (id && !track?.isSponsored) updateProgress(id, 0, audio.duration || 1)
      if (track && !track.isSponsored) {
        trackAudioComplete({
          id: track.id,
          category: track.category,
          duration: audio.duration || track.duration,
        })
      }
      // "End of track" sleep timer: stop here instead of auto-advancing
      if (sleepTimerRef.current === 'end') {
        setSleepTimerState(null)
        setSleepEndsAt(null)
        return
      }
      playNextAutoRef.current()
    }
    const onPlay = () => {
      setIsPlaying(true)
      // Resume (not a fresh track start) — _playTrack already logged audio_play
      if (!wasPlayingRef.current) {
        const track = currentTrackRef.current
        if (track) {
          trackAudioResume({
            id: track.id,
            category: track.category,
            position: audio.currentTime,
          })
        }
      }
      wasPlayingRef.current = true
    }
    const onPause = () => {
      setIsPlaying(false)
      const track = currentTrackRef.current
      // Ignore pause fired while switching tracks (src cleared / ended)
      if (track && !track.isSponsored && wasPlayingRef.current && !audio.ended && audio.src) {
        trackAudioPause({
          id: track.id,
          category: track.category,
          position: audio.currentTime,
          duration: audio.duration || track.duration,
        })
      }
      wasPlayingRef.current = false
    }
    const onError = () => {
      const err = audio.error
      const code = err?.code
      let msg = 'Audio could not be loaded.'
      if (code === MediaError.MEDIA_ERR_NETWORK || code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        msg = 'Audio unavailable — the file may have been removed or access is restricted.'
      }
      setAudioError(msg)
      setIsPlaying(false)
      wasPlayingRef.current = false
      trackAudioError(currentTrackRef.current?.id, msg)
    }
<<<<<<< HEAD
=======
    const onPlay = () => {
      setIsPlaying(true)
      setMediaSessionPlaybackState(true)
    }
    const onPause = () => {
      setIsPlaying(false)
      setMediaSessionPlaybackState(false)
    }
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('loadeddata', resolveDuration)
    audio.addEventListener('canplay', resolveDuration)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('loadeddata', resolveDuration)
      audio.removeEventListener('canplay', resolveDuration)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
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
<<<<<<< HEAD
    const { queue, queueIndex } = buildAutoPlaylistSelection(track, tracks, index)
    const selectedTrack = queue[queueIndex] ?? track

    // Same track — just toggle
    if (currentTrack?.id === track.id) {
      if (audio.paused) {
        await audio.play()
      } else {
        audio.pause()
      }
      // Update playlist context even on toggle
      setPlaylist(queue)
      setPlaylistIndex(queueIndex)
      return
    }

    setPlaylist(queue)
    setPlaylistIndex(queueIndex)
    await _playTrack(selectedTrack)
  }, [currentTrack, _playTrack])
=======
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
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3

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
<<<<<<< HEAD
  }, [playlist, playlistIndex, _playTrack])

  const skipTracks = useCallback((count: number) => {
    if (playlistIndex < 0 || playlist.length === 0 || count === 0) return
    const targetIndex = Math.max(0, Math.min(playlist.length - 1, playlistIndex + count))
    if (targetIndex === playlistIndex) return
    const targetTrack = playlist[targetIndex]
    setPlaylistIndex(targetIndex)
    void _playTrack(targetTrack)
  }, [playlist, playlistIndex, _playTrack])

  const playNextAuto = useCallback(() => {
    const current = currentTrackRef.current
    if (!current) return

    const currentPlaylist = playlistRef.current
    const currentPlaylistIndex = playlistIndexRef.current

    if (currentPlaylistIndex >= 0 && currentPlaylistIndex < currentPlaylist.length - 1) {
      const nextIndex = currentPlaylistIndex + 1
      const nextTrack = currentPlaylist[nextIndex]
      setPlaylistIndex(nextIndex)
      void _playTrack(nextTrack)
      return
    }

    const sameCategoryTracks = libraryTracksRef.current.filter((track) => track.category === current.category)
    const currentCategoryIndex = sameCategoryTracks.findIndex((track) => track.id === current.id)
    if (currentCategoryIndex >= 0 && currentCategoryIndex < sameCategoryTracks.length - 1) {
      const nextIndex = currentCategoryIndex + 1
      const nextTrack = sameCategoryTracks[nextIndex]
      setPlaylist(sameCategoryTracks)
      setPlaylistIndex(nextIndex)
      void _playTrack(nextTrack)
      return
    }

    const allTracks = libraryTracksRef.current
    const currentLibraryIndex = allTracks.findIndex((track) => track.id === current.id)
    if (currentLibraryIndex >= 0 && currentLibraryIndex < allTracks.length - 1) {
      const nextIndex = currentLibraryIndex + 1
      const nextTrack = allTracks[nextIndex]
      setPlaylist(allTracks)
      setPlaylistIndex(nextIndex)
      void _playTrack(nextTrack)
    }
  }, [_playTrack])

  const playPrev = useCallback(() => {
    if (playlistIndex > 0) {
      const prevIndex = playlistIndex - 1
      const prevTrack = playlist[prevIndex]
      setPlaylistIndex(prevIndex)
      _playTrack(prevTrack)
    }
  }, [playlist, playlistIndex, _playTrack])

  const jumpToNextSponsored = useCallback(() => {
    const nextSponsoredIndex = playlist.findIndex((track, idx) => idx > playlistIndex && track.isSponsored)
    if (nextSponsoredIndex === -1) return
    const nextSponsoredTrack = playlist[nextSponsoredIndex]
    setPlaylistIndex(nextSponsoredIndex)
    void _playTrack(nextSponsoredTrack)
  }, [playlist, playlistIndex, _playTrack])

  // Keep refs updated
  useEffect(() => {
    playNextRef.current = playNext
  }, [playNext])
=======
    tracksSinceAdRef.current = 0
    nextAdAtRef.current = randomAdInterval()
    setPlaylist(tracks)
    setPlaylistIndex(idx)
    playlistRef.current = tracks
    playlistIndexRef.current = idx
    void _playTrack(tracks[idx])
  }, [_playTrack])
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3

  useEffect(() => {
    playNextAutoRef.current = playNextAuto
  }, [playNextAuto])

  useEffect(() => {
    playPrevRef.current = playPrev
  }, [playPrev])

  useEffect(() => {
    playFromListRef.current = playFromList
  }, [playFromList])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (audio.paused) void audio.play()
    else audio.pause()
  }, [])

  const seek = useCallback((time: number) => {
    if (isAdRef.current) return // don't seek ads mid-roll awkwardly from UI; Media Session still can
    const audio = audioRef.current
    const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : duration
    const clamped = Math.max(0, dur > 0 ? Math.min(time, dur) : time)
    try {
      audio.currentTime = clamped
    } catch { /* ignore seek errors while buffering */ }
    setCurrentTime(clamped)
  }, [duration])

  const setVolume = useCallback((vol: number) => {
    audioRef.current.volume = vol
    setVolumeState(vol)
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    audioRef.current.playbackRate = rate
    setPlaybackRateState(rate)
  }, [])

  // ── Sleep timer ───────────────────────────────────────────────────────────
  const clearSleep = useCallback(() => {
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current)
      sleepTimeoutRef.current = null
    }
  }, [])

  const setSleepTimer = useCallback((option: SleepTimerOption | null) => {
    clearSleep()
    setSleepTimerState(option)

    if (option === null) {
      setSleepEndsAt(null)
      return
    }

    if (option === 'end') {
      // Handled in the 'ended' path below via sleepTimerRef.
      setSleepEndsAt(null)
      return
    }

    const ms = option * 60 * 1000
    setSleepEndsAt(Date.now() + ms)
    sleepTimeoutRef.current = setTimeout(() => {
      audioRef.current.pause()
      setSleepTimerState(null)
      setSleepEndsAt(null)
    }, ms)
  }, [clearSleep])

  // Keep a ref of the sleep timer so the audio 'ended' handler can honour "end of track"
  const sleepTimerRef = useRef<SleepTimerOption | null>(null)
  useEffect(() => { sleepTimerRef.current = sleepTimer }, [sleepTimer])

  // ── Media Session API (OS / lockscreen controls + metadata) ────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    if (!currentTrack) {
      navigator.mediaSession.metadata = null
      return
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.reciter || 'Islamic Audio',
        album: currentTrack.category ? String(currentTrack.category) : 'Islamic Audio',
      })
      navigator.mediaSession.setActionHandler('play', () => audioRef.current.play())
      navigator.mediaSession.setActionHandler('pause', () => audioRef.current.pause())
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevRef.current())
      navigator.mediaSession.setActionHandler('nexttrack', () => playNextRef.current())
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        const a = audioRef.current
        a.currentTime = Math.max(0, a.currentTime - 10)
      })
      navigator.mediaSession.setActionHandler('seekforward', () => {
        const a = audioRef.current
        a.currentTime = Math.min(a.duration || 0, a.currentTime + 10)
      })
    } catch {
      /* MediaMetadata not supported */
    }
  }, [currentTrack])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  // space/k = play-pause, ←/→ = seek 10s, N/P = next/prev, M = mute.
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
    }
    const handler = (e: KeyboardEvent) => {
      if (!currentTrackRef.current || isTypingTarget(e.target)) return
      const audio = audioRef.current
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          if (audio.paused) audio.play().catch(() => {})
          else audio.pause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          audio.currentTime = Math.max(0, audio.currentTime - 10)
          break
        case 'ArrowRight':
          e.preventDefault()
          audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10)
          break
        case 'n':
        case 'N':
          playNextRef.current()
          break
        case 'p':
        case 'P':
          playPrevRef.current()
          break
        case 'm':
        case 'M': {
          const next = audio.volume === 0 ? 0.8 : 0
          audio.volume = next
          setVolumeState(next)
          break
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── ?play=<trackId> deep link: auto-load a shared track once library is ready
  const deepLinkHandledRef = useRef(false)
  useEffect(() => {
    if (deepLinkHandledRef.current) return
    if (!tracks.length) return
    const params = new URLSearchParams(window.location.search)
    const playId = params.get('play')
    if (!playId) {
      deepLinkHandledRef.current = true
      return
    }
    const index = tracks.findIndex((t) => t.id === playId)
    if (index >= 0) {
      deepLinkHandledRef.current = true
      playFromListRef.current(tracks[index], tracks, index)
      // Clean the URL so refreshes don't replay
      params.delete('play')
      const clean = window.location.pathname + (params.toString() ? `?${params}` : '')
      window.history.replaceState({}, '', clean)
    }
  }, [tracks])

  const stopTrack = useCallback(() => {
    const audio = audioRef.current
    const id = currentTrackRef.current?.id
    if (id && audio.duration) updateProgress(id, audio.currentTime, audio.duration)
    audio.pause()
    audio.src = ''
    setCurrentTrack(null)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setPlaylist([])
    setPlaylistIndex(-1)
<<<<<<< HEAD
    setActivePlaylistName(null)
=======
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
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
  }, [])

  return (
    <AudioPlayerContext.Provider
      value={{
<<<<<<< HEAD
        currentTrack, isPlaying, currentTime, duration, volume, playbackRate, audioError,
        playlist, playlistIndex, hasNext, hasPrev, hasNextSponsored,
        activePlaylistName, savedPlaylists,
        sleepTimer, sleepEndsAt,
        play, playFromList, playNext, playPrev, skipTracks, jumpToNextSponsored,
        togglePlay, seek, setVolume, setPlaybackRate, setSleepTimer, stopTrack,
        addTrackToPlaylist, removeTrackFromPlaylist, clearPlaylist,
        savePlaylist, loadPlaylist, deletePlaylist,
=======
        currentTrack, isPlaying, currentTime, duration, volume,
        playlist, playlistIndex, hasNext, hasPrev,
        isAdPlaying, continuousPlay, adsEnabled,
        play, playFromList, playNext, playPrev,
        togglePlay, seek, setVolume, stopTrack,
        skipAd, setContinuousPlay, setAdsEnabled, startQueue,
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
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
