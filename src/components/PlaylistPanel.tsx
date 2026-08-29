import React, { useMemo, useState } from 'react'
import { Play, Save, Trash2, List, X } from 'lucide-react'
import { useAudioPlayer } from '../context/AudioPlayerContext'
import { formatDuration } from '../lib/storage'

export default function PlaylistPanel() {
  const {
    playlist,
    playlistIndex,
    activePlaylistName,
    savedPlaylists,
    playFromList,
    clearPlaylist,
    savePlaylist,
    loadPlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
  } = useAudioPlayer()

  const [playlistName, setPlaylistName] = useState('')

  const playlistCount = playlist.length
  const savedNames = useMemo(() => Object.keys(savedPlaylists).sort(), [savedPlaylists])

  const handleSavePlaylist = () => {
    if (!playlistName.trim() || playlistCount === 0) return
    savePlaylist(playlistName.trim())
    setPlaylistName('')
  }

  return (
    <section className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 mb-4">
      <div className="rounded-[2rem] border border-[var(--theme-border)] bg-[var(--theme-surface)]/95 p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--theme-ink)]">Playlist Manager</h2>
            <p className="text-sm text-[var(--theme-muted)]">Add tracks from any list and save playlists for later.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="text"
              value={playlistName}
              onChange={(event) => setPlaylistName(event.target.value)}
              placeholder="Playlist name"
              className="w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-4 py-3 text-sm text-[var(--theme-ink)] outline-none focus:border-violet-500"
            />
            <button
              type="button"
              onClick={handleSavePlaylist}
              disabled={!playlistName.trim() || playlistCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--theme-ink)]">Current playlist</p>
                <p className="text-xs text-[var(--theme-muted)]">{playlistCount} track{playlistCount === 1 ? '' : 's'}</p>
              </div>
              <button
                type="button"
                onClick={clearPlaylist}
                disabled={playlistCount === 0}
                className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs text-[var(--theme-muted)] transition hover:bg-[var(--theme-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>

            {playlistCount === 0 ? (
              <p className="mt-4 text-sm text-[var(--theme-muted)]">Add tracks to the playlist from any track list.</p>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-muted)]">Up next</p>
                {playlist.map((track, index) => {
                  const isActive = playlistIndex === index
                  const nextTrack = playlist[index + 1]
                  const showsUpcomingAd = !track.isSponsored && !!nextTrack?.isSponsored
                  return (
                    <div
                      key={track.id}
                      className={`flex items-center gap-2 rounded-3xl border px-3 py-2 transition ${
                        isActive ? 'border-violet-300 bg-violet-50 dark:bg-violet-500/10' : 'border-[var(--theme-border)] bg-[var(--theme-surface)]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => playFromList(track, playlist, index)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold text-[var(--theme-ink)]">{track.title}</p>
                        <p className="truncate text-xs text-[var(--theme-muted)]">
                          {track.reciter}
                          {track.isSponsored ? ' • Sponsored' : ''}
                        </p>
                      </button>
                      <div className="flex shrink-0 items-center gap-1 text-xs text-[var(--theme-muted)]">
                        {track.duration !== undefined ? formatDuration(track.duration) : '–'}
                        {showsUpcomingAd ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                            Ads next
                          </span>
                        ) : null}
                        {track.isSponsored && track.sponsorHref ? (
                          <a
                            href={track.sponsorHref}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 transition hover:bg-amber-200"
                          >
                            Ads
                          </a>
                        ) : null}
                        {isActive ? <span className="rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-violet-700 dark:text-violet-300">Now</span> : null}
                        <button
                          type="button"
                          onClick={() => removeTrackFromPlaylist(track.id)}
                          className="rounded-lg p-1.5 text-[var(--theme-muted)] hover:bg-red-50 hover:text-red-500"
                          aria-label="Remove from queue"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface-2)] p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--theme-ink)]">Saved playlists</p>
                <p className="text-xs text-[var(--theme-muted)]">{savedNames.length} saved</p>
              </div>
              {activePlaylistName ? (
                <span className="rounded-full bg-violet-100 dark:bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">{activePlaylistName}</span>
              ) : null}
            </div>

            {savedNames.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--theme-muted)]">Save a playlist and reload it later on any page.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {savedNames.map((name) => (
                  <div key={name} className="flex items-center justify-between gap-3 rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--theme-ink)]">{name}</p>
                      <p className="truncate text-xs text-[var(--theme-muted)]">{savedPlaylists[name].length} track{savedPlaylists[name].length === 1 ? '' : 's'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadPlaylist(name)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
                      >
                        <Play size={14} /> Load
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePlaylist(name)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs text-[var(--theme-muted)] transition hover:bg-[var(--theme-soft)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
