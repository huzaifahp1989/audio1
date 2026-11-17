import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Mic, Plus, Play, Pause, Clock, Users, RefreshCw, Sparkles, X, Image as ImageIcon, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { PODCAST_CATEGORIES, type PodcastEpisode, type PodcastType } from '../types/podcast'
import type { AudioTrack } from '../types'
import { formatViews, getTrackViews } from '../lib/views'
import { formatDuration } from '../lib/storage'
import CategoryHero from '../components/CategoryHero'
import CategoryChips from '../components/CategoryChips'
import CategoryPlayerDock from '../components/CategoryPlayerDock'
import SortFilterBar from '../components/SortFilterBar'
import PlayAllButton from '../components/PlayAllButton'
import type { SortOption } from '../lib/trackSort'

function formatPodcastDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const PODCAST_RSS_URL = 'https://anchor.fm/s/21dd8c4c/podcast/rss'
const PODCAST_SYNC_INTERVAL_MS = 5 * 60 * 1000

const TYPE_TABS = [
  { id: 'all' as const, label: 'All' },
  { id: 'spotify' as const, label: 'Spotify' },
  { id: 'custom' as const, label: 'Custom' },
  { id: 'live' as const, label: 'Live' },
]

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

/** Episodes are sorted locally since they are not AudioTrack records. */
function sortEpisodes(list: PodcastEpisode[], sort: SortOption): PodcastEpisode[] {
  const copy = [...list]
  switch (sort) {
    case 'oldest':
      return copy.sort((a, b) => a.publishedAt - b.publishedAt)
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title))
    case 'views':
      return copy.sort((a, b) => (b.views || 0) - (a.views || 0))
    case 'duration':
      return copy.sort((a, b) => (b.duration || 0) - (a.duration || 0))
    case 'newest':
    default:
      return copy.sort((a, b) => b.publishedAt - a.publishedAt)
  }
}

export default function PodcastPage() {
  const { currentTrack, isPlaying, currentTime, duration, playFromList, togglePlay, seek, playNext, playPrev, hasNext, hasPrev } = useAudioPlayer()
  const [activeTab, setActiveTab] = useState<'all' | 'spotify' | 'custom' | 'live'>('all')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sort, setSort] = useState<SortOption>('newest')
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

  const filtered = podcasts.filter((p) => {
    const matchesSearch = search
      ? p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      : true
    const matchesType = activeTab === 'all' ? true : p.type === activeTab
    const matchesCategory = selectedCategory === 'all' ? true : p.category === selectedCategory
    return matchesSearch && matchesType && matchesCategory
  })

  const sortedEpisodes = useMemo(() => sortEpisodes(filtered, sort), [filtered, sort])

  const playablePodcasts = sortedEpisodes.filter((episode) => Boolean(episode.audioUrl))
  const playableTracks = playablePodcasts.map((episode) => toPlayablePodcastTrack(episode))
  const playableIndexById = new Map(playablePodcasts.map((episode, index) => [episode.id, index]))

  const totalPlays = podcasts.reduce((sum, episode) => sum + (episode.views || 0), 0)
  const episodeTotal = podcasts.filter((episode) => Boolean(episode.audioUrl)).length

  const categoryChips = useMemo(
    () => [
      { id: 'all', label: 'All Categories', count: podcasts.length },
      ...PODCAST_CATEGORIES.map((cat) => ({
        id: cat.id,
        label: cat.label,
        emoji: cat.emoji,
        count: podcasts.filter((episode) => episode.category === cat.id).length,
      })),
    ],
    [podcasts]
  )

  const hasActiveFilters = Boolean(search.trim()) || activeTab !== 'all' || selectedCategory !== 'all'

  const clearFilters = () => {
    setSearch('')
    setActiveTab('all')
    setSelectedCategory('all')
  }

  const listTitle = (() => {
    const typeLabel = TYPE_TABS.find((tab) => tab.id === activeTab)?.label
    if (selectedCategory !== 'all') {
      const cat = PODCAST_CATEGORIES.find((c) => c.id === selectedCategory)
      return cat ? `${cat.emoji} ${cat.label}` : selectedCategory
    }
    if (activeTab !== 'all') return `${typeLabel} Episodes`
    return 'All Episodes'
  })()

  const syncLabel = syncError
    ? `Sync error: ${syncError}`
    : syncing
      ? 'Syncing podcast feed…'
      : lastSyncedAt
        ? `Auto-sync on · updated ${formatPodcastDate(lastSyncedAt)}`
        : 'Auto-sync on'

  return (
    <div className="max-w-6xl mx-auto px-3 py-6 sm:px-4 sm:py-10">
      <CategoryHero
        icon={<Sparkles size={14} />}
        badge="Audio Podcasts"
        title="Podcasts"
        description="Listen to Islamic podcasts, interviews and lecture series — synced automatically from the feed."
        gradient="from-violet-600 via-purple-600 to-indigo-600"
        itemCount={episodeTotal}
        itemNoun="episode"
        totalPlays={totalPlays}
        search={{ value: search, onChange: setSearch, placeholder: 'Search episodes…' }}
        actions={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2 text-sm font-semibold text-violet-700 shadow-md transition hover:bg-white active:scale-[0.98]"
          >
            <Plus size={16} />
            Add Podcast
          </button>
        }
      />

      <CategoryPlayerDock tracks={playableTracks} variant="violet" />

      {/* Filters in one place, directly above the episodes */}
      <section className="mb-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 shadow-sm sm:mb-5 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] p-0.5">
            {TYPE_TABS.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-9 shrink-0 rounded-[10px] px-3 text-[13px] font-semibold transition ${
                    active ? 'bg-violet-600 text-white shadow-sm' : 'text-[var(--theme-muted)] hover:text-[var(--theme-ink)]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-[13px] font-semibold text-[var(--theme-muted)] transition hover:text-[var(--theme-ink)]"
            >
              <X size={14} /> Clear filters
            </button>
          )}

          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-[var(--theme-muted)]">
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncLabel}
          </span>
        </div>

        <div className="mt-3">
          <CategoryChips
            label="Category"
            options={categoryChips}
            value={selectedCategory}
            onChange={setSelectedCategory}
            activeClass="bg-violet-600 text-white border-violet-600"
          />
        </div>
      </section>

      <section className="scroll-mt-32 sm:scroll-mt-24">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-0.5">
          <h2 className="text-sm font-bold text-[var(--theme-ink)]">{listTitle}</h2>
          <div className="flex items-center gap-2">
            <PlayAllButton tracks={playableTracks} label="Play episodes" gradient="from-violet-600 to-indigo-600" />
            <span className="text-xs text-[var(--theme-muted)]">{sortedEpisodes.length} shown</span>
          </div>
        </div>

        <SortFilterBar
          sort={sort}
          onSortChange={setSort}
          options={['newest', 'oldest', 'title', 'views', 'duration']}
          label="episodes"
        />

        <div className="mt-3">
          {sortedEpisodes.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedEpisodes.map((podcast) => {
                const isActive = currentTrack?.id === podcast.id
                return (
                  <PodcastCard
                    key={podcast.id}
                    podcast={podcast}
                    isActive={isActive}
                    isPlaying={isActive && isPlaying}
                    currentTime={isActive ? currentTime : 0}
                    duration={isActive ? duration : podcast.duration || 0}
                    canPrev={isActive ? hasPrev : false}
                    canNext={isActive ? hasNext : false}
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

                      playFromList(playableTracks[playableIndex], playableTracks, playableIndex)

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
                    }}
                  />
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-soft)]/50 px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--theme-surface-2)] shadow-sm">
                <Mic size={26} className="text-[var(--theme-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--theme-ink)]">
                {search
                  ? 'No episodes match your search.'
                  : activeTab !== 'all' || selectedCategory !== 'all'
                    ? 'No episodes for the selected filters.'
                    : 'No podcasts yet — add your first episode.'}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-4 text-sm font-semibold text-[var(--theme-ink)] transition hover:border-violet-300"
                >
                  <X size={15} /> Clear filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700"
                >
                  <Plus size={15} /> Add Podcast
                </button>
              )}
            </div>
          )}
        </div>
      </section>

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
  const playable = Boolean(podcast.audioUrl)

  const handlePlayClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onPlay()
  }

  const typeLabel = podcast.type === 'spotify' ? 'Spotify' : podcast.type === 'live' ? 'Live' : 'Custom'
  const typeClass =
    podcast.type === 'spotify'
      ? 'bg-green-500 text-white'
      : podcast.type === 'live'
        ? 'bg-red-500 text-white'
        : 'bg-violet-500 text-white'

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-[var(--theme-surface)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        isActive ? 'border-violet-400 ring-1 ring-violet-400/40' : 'border-[var(--theme-border)]'
      }`}
    >
      {/* Cover */}
      <div className="relative aspect-video w-full overflow-hidden bg-[var(--theme-soft)]">
        {podcast.imageUrl ? (
          <img src={podcast.imageUrl} alt={podcast.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/15 to-indigo-500/15">
            {podcast.type === 'spotify' ? (
              <span className="text-4xl">🎵</span>
            ) : (
              <Mic size={44} className="text-violet-400" />
            )}
          </div>
        )}

        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${typeClass}`}>
          {typeLabel}
        </span>

        {playable && (
          <button
            type="button"
            onClick={handlePlayClick}
            aria-label={isPlaying ? 'Pause episode' : 'Play episode'}
            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg">
              {isPlaying ? <Pause size={24} className="text-violet-600" /> : <Play size={24} className="ml-1 text-violet-600" />}
            </span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-base">{category?.emoji || '🎧'}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--theme-muted)]">
            {category?.label || 'Podcast'}
          </span>
          <span className="ml-auto text-[11px] text-[var(--theme-muted)]">{formatPodcastDate(podcast.publishedAt)}</span>
        </div>

        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-[var(--theme-ink)]">{podcast.title}</h3>

        {podcast.description && (
          <p className="mt-1.5 line-clamp-2 text-[13px] text-[var(--theme-muted)]">{podcast.description}</p>
        )}

        <div className="mt-3 flex items-center gap-3 text-[11px] text-[var(--theme-muted)]">
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <Users size={12} className="shrink-0" />
            <span className="truncate">{podcast.host}</span>
          </span>
          {podcast.duration ? (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {formatDuration(podcast.duration)}
            </span>
          ) : null}
          <span className="ml-auto shrink-0">{formatViews(podcast.views)} plays</span>
        </div>

        {isActive && (
          <div className="mt-3 border-t border-[var(--theme-border)] pt-3">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--theme-soft)]">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={(e) => onSeek(Number(e.target.value))}
                aria-label="Seek"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] tabular-nums text-[var(--theme-muted)]">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>

            <div className="mt-1 flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={onPlayPrev}
                disabled={!canPrev}
                className="p-1.5 text-[var(--theme-muted)] transition-colors hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                title="Previous episode"
              >
                <SkipBack size={16} />
              </button>
              <button
                type="button"
                onClick={onSkipBack}
                className="p-1.5 text-[var(--theme-muted)] transition-colors hover:text-[var(--theme-ink)]"
                title="Back 10 seconds"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={handlePlayClick}
                className="mx-1 flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 shadow transition-all hover:bg-violet-700 active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="ml-0.5 text-white" />}
              </button>
              <button
                type="button"
                onClick={onSkipForward}
                className="p-1.5 text-[var(--theme-muted)] transition-colors hover:text-[var(--theme-ink)]"
                title="Forward 10 seconds"
              >
                <ChevronRight size={18} />
              </button>
              <button
                type="button"
                onClick={onPlayNext}
                disabled={!canNext}
                className="p-1.5 text-[var(--theme-muted)] transition-colors hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const podcast: PodcastEpisode = {
      id: crypto.randomUUID(),
      title,
      description: description || undefined,
      type,
      category: category || undefined,
      imageUrl: imageUrl || undefined,
      audioUrl: type === 'custom' && audioFile ? URL.createObjectURL(audioFile) : undefined,
      host: 'You',
      publishedAt: Date.now(),
      views: 0,
    }

    if (type === 'spotify') {
      podcast.spotifyUrl = spotifyUrl
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
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-4 py-3 text-sm text-[var(--theme-ink)] placeholder-[var(--theme-muted)] focus:border-violet-400 focus:outline-none'
  const labelClass = 'mb-2 block text-sm font-semibold text-[var(--theme-ink)]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--theme-surface)] shadow-2xl">
        <div className="border-b border-[var(--theme-border)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--theme-ink)]">Add New Podcast</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--theme-muted)] transition hover:bg-[var(--theme-soft)] hover:text-[var(--theme-ink)]"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div>
            <label className={labelClass}>Podcast Type</label>
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
                  className={`rounded-xl border-2 p-4 text-center transition-all ${
                    type === t.id
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                      : 'border-[var(--theme-border)] hover:border-violet-300'
                  }`}
                >
                  <div className="mb-1 text-2xl">{t.icon}</div>
                  <div className="text-sm font-medium text-[var(--theme-ink)]">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClass}
              placeholder="Enter podcast title"
              required
            />
          </div>

          <div>
            <label className={labelClass}>Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${fieldClass} resize-none`}
              rows={3}
              placeholder="Enter podcast description"
            />
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass}>
              <option value="">Select category</option>
              {PODCAST_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {type === 'spotify' && (
            <div>
              <label className={labelClass}>Spotify URL *</label>
              <input
                type="url"
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                className={fieldClass}
                placeholder="https://open.spotify.com/episode/..."
                required
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Cover Image (Optional)</label>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <div className="relative h-24 w-24 overflow-hidden rounded-xl">
                  <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--theme-border)] px-4 py-8 transition-colors hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10">
                  <ImageIcon size={20} className="text-[var(--theme-muted)]" />
                  <span className="text-sm text-[var(--theme-muted)]">Click to upload image</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {type === 'custom' && (
            <div>
              <label className={labelClass}>Audio File *</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                className={fieldClass}
                required
              />
            </div>
          )}

          {type === 'live' && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
              <p className="text-sm text-violet-700 dark:text-violet-300">
                Live recording will start a new session. You'll be able to invite guests to join.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--theme-border)] px-4 py-3 font-medium text-[var(--theme-ink)] transition hover:bg-[var(--theme-soft)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-700"
            >
              Add Podcast
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
