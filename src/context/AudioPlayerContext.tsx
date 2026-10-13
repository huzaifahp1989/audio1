import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import type { AudioTrack } from '../types'
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
  hasNextSponsored: boolean
  isAdPlaying: boolean
  activePlaylistName: string | null
  savedPlaylists: Record<string, AudioTrack[]>
  sleepTimer: SleepTimerOption | null
  sleepEndsAt: number | null
  play: (track: AudioTrack) => void
  playFromList: (track: AudioTrack, tracks: AudioTrack[], index: number) => void
  playNext: () => void
  playPrev: () => void
  skipTracks: (count: number) => void
  jumpToNextSponsored: () => void
  skipAd: () => void
  togglePlay: () => void
  seek: (time: number) => void
  setVolume: (vol: number) => void
  setPlaybackRate: (rate: number) => void
  setSleepTimer: (option: SleepTimerOption | null) => void
  stopTrack: () => void
  addTrackToPlaylist: (track: AudioTrack) => void
  removeTrackFromPlaylist: (trackId: string) => void
  clearPlaylist: () => void
  savePlaylist: (name: string) => void
  loadPlaylist: (name: string) => void
  deletePlaylist: (name: string) => void
}

const AudioPlayerContext = createContext<PlayerState | null>(null)

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const { incrementTrackView, tracks } = useAudioLibrary()
  const audioRef = useRef<HTMLAudioElement>(new Audio())

  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [audioError, setAudioError] = useState<string | null>(null)
  const isAdPlaying = false
  const skipAd = useCallback(() => {}, [])
  const [playlist, setPlaylist] = useState<AudioTrack[]>([])
  const [playlistIndex, setPlaylistIndex] = useState(-1)
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

  const _playTrack = useCallback(async (track: AudioTrack) => {
    const audio = audioRef.current
    audio.pause()
    audio.src = ''

    const audioUrl = track.audioUrl
    if (!audioUrl) {
      console.error('No audio URL available')
      return
    }

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

  useEffect(() => {
    const audio = audioRef.current

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

  const playNext = useCallback(() => {
    if (playlistIndex >= 0 && playlistIndex < playlist.length - 1) {
      const nextIndex = playlistIndex + 1
      const nextTrack = playlist[nextIndex]
      setPlaylistIndex(nextIndex)
      _playTrack(nextTrack)
    }
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
    if (audio.paused) {
      audio.play()
    } else {
      audio.pause()
    }
  }, [])

  const seek = useCallback((time: number) => {
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
    setActivePlaylistName(null)
  }, [])

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack, isPlaying, currentTime, duration, volume, playbackRate, audioError,
        playlist, playlistIndex, hasNext, hasPrev, hasNextSponsored,
        isAdPlaying,
        activePlaylistName, savedPlaylists,
        sleepTimer, sleepEndsAt,
        play, playFromList, playNext, playPrev, skipTracks, jumpToNextSponsored, skipAd,
        togglePlay, seek, setVolume, setPlaybackRate, setSleepTimer, stopTrack,
        addTrackToPlaylist, removeTrackFromPlaylist, clearPlaylist,
        savePlaylist, loadPlaylist, deletePlaylist,
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
