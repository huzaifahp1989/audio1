import React, { useCallback, useEffect, useState } from 'react'
import { Mic, Plus, ExternalLink, Play, Pause, Clock, Users, Link as LinkIcon, Copy, Check, Image as ImageIcon, Trash2, Edit2, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { PODCAST_CATEGORIES, type PodcastEpisode, type PodcastType } from '../types/podcast'
import type { AudioTrack } from '../types'
import { formatViews, getTrackViews } from '../lib/views'
import { formatDuration } from '../lib/storage'

function formatPodcastDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const PODCAST_RSS_URL = 'https://anchor.fm/s/21dd8c4c/podcast/rss'
const PODCAST_SYNC_INTERVAL_MS = 5 * 60 * 1000

interface RssEpisode {
  id: string
  title: string
  description?: string
  publishedAt?: number
  audioUrl?: string
  imageUrl?: string
  externalUrl?: string
  durationSeconds?: number
}

interface PodcastRssResponse {
  success: boolean
  episodes?: RssEpisode[]
  error?: string
}

function parseDurationToSeconds(value?: string): number | undefined {
  if (!value) return undefined
  if (/^\d+$/.test(value)) return Number(value)

  const parts = value.split(':').map((part) => Number(part))
  if (parts.some((n) => Number.isNaN(n))) return undefined

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return undefined
}

function parseRssEpisodesInBrowser(xmlText: string): PodcastEpisode[] {
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'application/xml')
  const items = Array.from(xml.querySelectorAll('item'))
  const channelImage = xml.querySelector('channel > image > url')?.textContent?.trim()

  const episodes: PodcastEpisode[] = items.map((item, index) => {
    const guid = item.querySelector('guid')?.textContent?.trim()
    const title = item.querySelector('title')?.textContent?.trim() || `Episode ${index + 1}`
    const description = item.querySelector('description')?.textContent?.trim() || undefined
    const externalUrl = item.querySelector('link')?.textContent?.trim() || undefined
    const pubDateRaw = item.querySelector('pubDate')?.textContent?.trim()
    const pubDate = pubDateRaw ? Date.parse(pubDateRaw) : NaN
    const enclosureEl = item.querySelector('enclosure')
    const audioUrl = enclosureEl?.getAttribute('url') || undefined
    const imageUrl =
      item.querySelector('itunes\\:image')?.getAttribute('href') ||
      item.querySelector('media\\:thumbnail')?.getAttribute('url') ||
      channelImage ||
      undefined
    const durationRaw = item.querySelector('itunes\\:duration')?.textContent?.trim() || undefined

    return {
      id: `rss-episode-${(guid || externalUrl || audioUrl || title).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || index}`,
      title,
      description,
      type: 'spotify',
      spotifyUrl: externalUrl,
      audioUrl,
      imageUrl,
      host: 'RSS Feed',
      category: 'islamic',
      duration: parseDurationToSeconds(durationRaw),
      publishedAt: Number.isNaN(pubDate) ? Date.now() : pubDate,
      views: 0,
      tags: externalUrl ? [externalUrl] : undefined,
    }
  })

  return episodes
}

function parsePublishedAt(publishedAt?: number): number {
  if (!publishedAt) return Date.now()
  const ms = Number(publishedAt)
  return Number.isNaN(ms) ? Date.now() : ms
}

function toRssPodcastEpisode(item: RssEpisode): PodcastEpisode {
  return {
    id: `rss-episode-${item.id}`,
    title: item.title,
    description: item.description || undefined,
    type: 'spotify',
    spotifyUrl: item.externalUrl,
    imageUrl: item.imageUrl,
    audioUrl: item.audioUrl,
    host: 'RSS Feed',
    category: 'islamic',
    duration: item.durationSeconds,
    publishedAt: parsePublishedAt(item.publishedAt),
    views: 0,
    tags: item.externalUrl ? [item.externalUrl] : undefined,
  }
}

function toPlayablePodcastTrack(episode: PodcastEpisode): AudioTrack {
  return {
    id: episode.id,
    title: episode.title,
    category: 'talks',
    reciter: episode.host,
    fileName: `${episode.id}.mp3`,
    fileSize: 0,
    imageUrl: episode.imageUrl,
    duration: episode.duration,
    mimeType: 'audio/mpeg',
    uploadedAt: episode.publishedAt,
    audioUrl: episode.audioUrl,
    views: episode.views,
  }
}

async function fetchRssEpisodes(feedUrl: string): Promise<PodcastEpisode[]> {
  try {
    const response = await fetch(`/api/podcast-rss?url=${encodeURIComponent(feedUrl)}`)
    const contentType = response.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as PodcastRssResponse
      if (response.ok && payload.success && payload.episodes) {
        return payload.episodes.map(toRssPodcastEpisode)
      }
      throw new Error(payload.error || 'Failed to sync podcast RSS feed.')
    }
  } catch {
    // Fallback to direct RSS fetch in browser for local Vite mode.
  }

  const directResponse = await fetch(feedUrl)
  if (!directResponse.ok) {
    throw new Error(`Failed to fetch RSS feed directly (${directResponse.status}).`)
  }
  const xml = await directResponse.text()
  return parseRssEpisodesInBrowser(xml)
}

function mergeAutoSyncedEpisodes(existing: PodcastEpisode[], syncedEpisodes: PodcastEpisode[]): PodcastEpisode[] {
  const syncedIds = new Set(syncedEpisodes.map((episode) => episode.id))

  const preservedManualEntries = existing.filter((episode) => {
    const isAutoSyncedRss = episode.id.startsWith('rss-episode-')
    return !isAutoSyncedRss && !syncedIds.has(episode.id)
  })

  return [...syncedEpisodes, ...preservedManualEntries]
}

async function hydrateViewsFromGlobalStore(episodes: PodcastEpisode[]): Promise<PodcastEpisode[]> {
  const counts = await Promise.all(
    episodes.map(async (episode) => ({
      id: episode.id,
      views: await getTrackViews(episode.id),
    }))
  )

  const byId = new Map(counts.map((item) => [item.id, item.views]))
  return episodes.map((episode) => ({
    ...episode,
    views: byId.get(episode.id) ?? episode.views,
  }))
}

export default function PodcastPage() {
  const { tracks } = useAudioLibrary()
  const { currentTrack, isPlaying, currentTime, duration, playFromList, togglePlay, seek, playNext, playPrev, hasNext, hasPrev } = useAudioPlayer()
  const [activeTab, setActiveTab] = useState<'all' | 'spotify' | 'custom' | 'live'>('all')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [podcasts, setPodcasts] = useState<PodcastEpisode[]>([])
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)

  const syncRssFeed = useCallback(async () => {
    setSyncing(true)
    try {
      const syncedEpisodes = await fetchRssEpisodes(PODCAST_RSS_URL)
      setPodcasts((current) => mergeAutoSyncedEpisodes(current, syncedEpisodes))

      // Keep list fast by showing episodes immediately, then hydrate global views in background.
      void hydrateViewsFromGlobalStore(syncedEpisodes)
        .then((syncedWithViews) => {
          setPodcasts((current) => mergeAutoSyncedEpisodes(current, syncedWithViews))
        })
        .catch(() => {
          // Ignore temporary global views fetch failures.
        })

      setLastSyncedAt(Date.now())
      setSyncError(null)
    } catch (error: any) {
      setSyncError(error?.message || 'Failed to sync podcast feed episodes.')
    } finally {
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    void syncRssFeed()
    const timer = window.setInterval(() => {
      void syncRssFeed()
    }, PODCAST_SYNC_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [syncRssFeed])

  // Filter podcasts
  const filtered = podcasts.filter((p) => {
    const matchesSearch = search
      ? p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      : true
    const matchesType = activeTab === 'all' ? true : p.type === activeTab
    const matchesCategory = selectedCategory === 'all' ? true : p.category === selectedCategory
    return matchesSearch && matchesType && matchesCategory
  })

  const playablePodcasts = filtered.filter((episode) => Boolean(episode.audioUrl))
  const playableTracks = playablePodcasts.map((episode) => toPlayablePodcastTrack(episode))
  const playableIndexById = new Map(playablePodcasts.map((episode, index) => [episode.id, index]))
  const activePodcast = podcasts.find((episode) => episode.id === currentTrack?.id)
  const isPodcastTrackActive = Boolean(activePodcast)
  const activePodcastProgress = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Mic size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Podcasts</h1>
            <p className="text-slate-500 text-sm mt-0.5">{filtered.length} episode{filtered.length !== 1 ? 's' : ''}</p>
            <p className="text-slate-400 text-xs mt-1">
              {syncError
                ? `Podcast feed sync error: ${syncError}`
                : syncing
                ? 'Syncing podcast feed episodes...'
                : lastSyncedAt
                ? `Auto-sync enabled, last updated ${formatPodcastDate(lastSyncedAt)}`
                : 'Auto-sync enabled'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors shadow-md"
          >
            <Plus size={18} />
            Add Podcast
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'all', label: 'All', icon: '🎧' },
          { id: 'spotify', label: 'Spotify', icon: '🎵' },
          { id: 'custom', label: 'Custom', icon: '🎙️' },
          { id: 'live', label: 'Live Recordings', icon: '🔴' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-violet-500 text-white shadow-lg shadow-violet-200'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-200'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-violet-100 text-violet-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Categories
        </button>
        {PODCAST_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-violet-100 text-violet-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span className="mr-1">{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {isPodcastTrackActive && activePodcast && (
        <div className="mb-8 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-indigo-50 shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-violet-100 flex items-center justify-center shrink-0">
                {activePodcast.imageUrl ? (
                  <img src={activePodcast.imageUrl} alt={activePodcast.title} className="w-full h-full object-cover" />
                ) : (
                  <Mic size={24} className="text-violet-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">Podcast Player</p>
                <h2 className="text-lg font-bold text-slate-800 truncate">{activePodcast.title}</h2>
                <p className="text-sm text-slate-500 truncate">{activePodcast.host}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 self-start sm:self-center">
              <button
                onClick={playPrev}
                disabled={!hasPrev}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                title="Previous episode"
              >
                <SkipBack size={16} />
                Prev
              </button>
              <button
                onClick={() => seek(Math.max(0, currentTime - 10))}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:border-violet-300 hover:text-violet-600"
                title="Back 10 seconds"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={togglePlay}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-white shadow-md transition-all hover:bg-violet-700 active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>
              <button
                onClick={() => seek(Math.min(duration || 0, currentTime + 10))}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:border-violet-300 hover:text-violet-600"
                title="Forward 10 seconds"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={playNext}
                disabled={!hasNext}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-violet-300 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                title="Next episode"
              >
                Next
                <SkipForward size={16} />
              </button>
            </div>
          </div>

          <div className="border-t border-violet-100 bg-white/80 px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="w-12 text-right text-xs text-slate-500 tabular-nums">{formatDuration(currentTime)}</span>
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                  style={{ width: `${activePodcastProgress}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </div>
              <span className="w-12 text-xs text-slate-500 tabular-nums">{formatDuration(duration)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Podcast Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((podcast) => (
            <PodcastCard
              key={podcast.id}
              podcast={podcast}
              isActive={currentTrack?.id === podcast.id}
              isPlaying={currentTrack?.id === podcast.id && isPlaying}
              currentTime={currentTrack?.id === podcast.id ? currentTime : 0}
              duration={currentTrack?.id === podcast.id ? duration : podcast.duration || 0}
              canPrev={currentTrack?.id === podcast.id ? hasPrev : false}
              canNext={currentTrack?.id === podcast.id ? hasNext : false}
              onSeek={seek}
              onPlayPrev={playPrev}
              onPlayNext={playNext}
              onSkipBack={() => seek(Math.max(0, currentTime - 10))}
              onSkipForward={() => seek(Math.min(duration || 0, currentTime + 10))}
              onPlay={() => {
                  if (!podcast.audioUrl) return

                  if (currentTrack?.id === podcast.id) {
                    togglePlay()
                    return
                  }

                  const playableIndex = playableIndexById.get(podcast.id)
                  if (playableIndex === undefined) return

                  const isNewTrack = currentTrack?.id !== podcast.id
                  playFromList(playableTracks[playableIndex], playableTracks, playableIndex)

                  if (isNewTrack) {
                    setPodcasts((prev) =>
                      prev.map((item) =>
                        item.id === podcast.id
                          ? { ...item, views: (item.views || 0) + 1 }
                          : item
                      )
                    )

                    void getTrackViews(podcast.id).then((globalViews) => {
                      setPodcasts((prev) =>
                        prev.map((item) =>
                          item.id === podcast.id
                            ? { ...item, views: Math.max(item.views || 0, globalViews || 0) }
                            : item
                        )
                      )
                    })
                  }
                }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl bg-slate-50">
          <Mic size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">No podcasts found. Add your first podcast!</p>
        </div>
      )}

      {/* Add Podcast Modal */}
      {showAddModal && (
        <AddPodcastModal
          onClose={() => setShowAddModal(false)}
          onAdd={(podcast) => {
            setPodcasts((prev) => [podcast, ...prev])
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}

function PodcastCard({
  podcast,
  isActive,
  isPlaying,
  currentTime,
  duration,
  canPrev,
  canNext,
  onSeek,
  onPlayPrev,
  onPlayNext,
  onSkipBack,
  onSkipForward,
  onPlay,
}: {
  podcast: PodcastEpisode
  isActive: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  canPrev: boolean
  canNext: boolean
  onSeek: (time: number) => void
  onPlayPrev: () => void
  onPlayNext: () => void
  onSkipBack: () => void
  onSkipForward: () => void
  onPlay: () => void
}) {
  const category = PODCAST_CATEGORIES.find((c) => c.id === podcast.category)
  const progress = duration ? (currentTime / duration) * 100 : 0

  const handlePlayClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onPlay()
  }

  return (
    <div className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all">
      {/* Image */}
      <div className="relative aspect-video bg-gradient-to-br from-violet-100 to-purple-100">
        {podcast.imageUrl ? (
          <img
            src={podcast.imageUrl}
            alt={podcast.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {podcast.type === 'spotify' ? (
              <div className="w-full h-full flex items-center justify-center bg-green-100">
                <span className="text-4xl">🎵</span>
              </div>
            ) : (
              <Mic size={48} className="text-violet-400" />
            )}
          </div>
        )}
        
        {/* Play Button */}
        <button
          type="button"
          onClick={handlePlayClick}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
          disabled={!podcast.audioUrl}
        >
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg"
          >
            {isPlaying ? (
              <Pause size={24} className="text-violet-600" />
            ) : (
              <Play size={24} className="text-violet-600 ml-1" />
            )}
          </div>
        </button>
        
        {/* Type Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              podcast.type === 'spotify'
                ? 'bg-green-500 text-white'
                : podcast.type === 'live'
                ? 'bg-red-500 text-white'
                : 'bg-violet-500 text-white'
            }`}
          >
            {podcast.type === 'spotify' ? 'Spotify' : podcast.type === 'live' ? 'Live' : 'Custom'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{category?.emoji || '🎧'}</span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {category?.label || 'Podcast'}
          </span>
        </div>

        <h3 className="font-bold text-slate-800 mb-2 line-clamp-2">{podcast.title}</h3>

        {podcast.description && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-3">{podcast.description}</p>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {podcast.host}
            </span>
            {podcast.duration && (
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDuration(podcast.duration)}
              </span>
            )}
            <span>{formatPodcastDate(podcast.publishedAt)}</span>
          </div>
          <span>{formatViews(podcast.views)} plays</span>
        </div>

        {isActive && (
          <div className="mt-4 pt-3 border-t border-violet-100" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2">
              <div className="relative h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  style={{ height: '100%' }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-400 tabular-nums">{formatDuration(currentTime)}</span>
                <span className="text-xs text-slate-400 tabular-nums">{formatDuration(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1">
              <button
                onClick={onPlayPrev}
                disabled={!canPrev}
                className="p-1.5 text-slate-500 hover:text-violet-600 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                title="Previous episode"
              >
                <SkipBack size={16} />
              </button>
              <button
                onClick={onSkipBack}
                className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                title="-10s"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handlePlayClick}
                className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center shadow transition-all active:scale-95 mx-1"
              >
                {isPlaying
                  ? <Pause size={16} className="text-white" />
                  : <Play size={16} className="text-white ml-0.5" />}
              </button>
              <button
                onClick={onSkipForward}
                className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                title="+10s"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={onPlayNext}
                disabled={!canNext}
                className="p-1.5 text-slate-500 hover:text-violet-600 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                title="Next episode"
              >
                <SkipForward size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AddPodcastModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (podcast: PodcastEpisode) => void
}) {
  const [type, setType] = useState<PodcastType>('custom')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const podcast: PodcastEpisode = {
      id: crypto.randomUUID(),
      title,
      description: description || undefined,
      type,
      category: category || undefined,
      imageUrl: imageUrl || undefined,
      host: 'You',
      publishedAt: Date.now(),
      views: 0,
    }

    if (type === 'spotify') {
      podcast.spotifyUrl = spotifyUrl
      // Extract Spotify ID and create embed URL
      const spotifyId = spotifyUrl.match(/episode\/(\w+)/)?.[1]
      if (spotifyId) {
        podcast.spotifyId = spotifyId
        podcast.embedUrl = `https://open.spotify.com/embed/episode/${spotifyId}`
      }
    }

    onAdd(podcast)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Add New Podcast</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Selection */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-3 block">Podcast Type</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'custom', label: 'Custom', icon: '🎙️' },
                { id: 'spotify', label: 'Spotify', icon: '🎵' },
                { id: 'live', label: 'Live', icon: '🔴' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id as PodcastType)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    type === t.id
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-slate-200 hover:border-violet-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{t.icon}</div>
                  <div className="text-sm font-medium">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400"
              placeholder="Enter podcast title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 resize-none"
              rows={3}
              placeholder="Enter podcast description"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400"
            >
              <option value="">Select category</option>
              {PODCAST_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Spotify URL */}
          {type === 'spotify' && (
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Spotify URL *</label>
              <input
                type="url"
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400"
                placeholder="https://open.spotify.com/episode/..."
                required
              />
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Cover Image (Optional)</label>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('')
                      setImageFile(null)
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors"
                >
                  <ImageIcon size={20} className="text-slate-400" />
                  <span className="text-sm text-slate-500">Click to upload image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Audio Upload for Custom */}
          {type === 'custom' && (
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Audio File *</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-violet-400"
                required
              />
            </div>
          )}

          {/* Live Recording Info */}
          {type === 'live' && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <p className="text-sm text-violet-700">
                Live recording will start a new session. You'll be able to invite guests to join.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700"
            >
              Add Podcast
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
