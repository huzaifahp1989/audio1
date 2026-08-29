import React, { useEffect, useState } from 'react'
import { ThumbsUp } from 'lucide-react'
import type { AudioTrack } from '../types'
import { useAudioLibrary } from '../hooks/useAudioLibrary'
import {
  canVote,
  formatVotes,
  hasVoted,
  loadVotedTrackIds,
  removeVoteForTrack,
  saveVotedTrackIds,
  voteErrorMessage,
  voteForTrack,
} from '../lib/votes'

interface VoteButtonProps {
  track: AudioTrack
  variant?: 'nasheeds' | 'talks' | 'neutral'
  className?: string
  compact?: boolean
}

export default function VoteButton({ track, variant = 'neutral', className = '', compact = false }: VoteButtonProps) {
  const { updateTrackVote } = useAudioLibrary()
  const [voted, setVoted] = useState(() => hasVoted(track.id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setVoted(hasVoted(track.id))
    setError('')
  }, [track.id])

  if (!canVote(track)) return null

  const activeStyles = {
    nasheeds: 'border-violet-200 bg-violet-50 text-violet-700',
    talks: 'border-sky-200 bg-sky-50 text-sky-700',
    neutral: 'border-violet-200 bg-violet-50 text-violet-700',
  }[variant]

  const idleStyles = {
    nasheeds: 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-violet-200 hover:text-violet-600',
    talks: 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-sky-200 hover:text-sky-600',
    neutral: 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-violet-200 hover:text-violet-600',
  }[variant]

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (busy) return

    const nextVoted = !voted
    const delta = nextVoted ? 1 : -1
    const previousVotes = track.votes || 0
    const optimisticVotes = Math.max(0, previousVotes + delta)

    setBusy(true)
    setError('')
    setVoted(nextVoted)
    updateTrackVote(track.id, optimisticVotes)

    const votedIds = loadVotedTrackIds()
    if (nextVoted) votedIds.add(track.id)
    else votedIds.delete(track.id)
    saveVotedTrackIds(votedIds)

    try {
      const newCount = nextVoted ? await voteForTrack(track.id) : await removeVoteForTrack(track.id)
      updateTrackVote(track.id, newCount)
    } catch (err) {
      setVoted(!nextVoted)
      updateTrackVote(track.id, previousVotes)
      if (nextVoted) votedIds.delete(track.id)
      else votedIds.add(track.id)
      saveVotedTrackIds(votedIds)
      setError(voteErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`inline-flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy}
        className={`inline-flex items-center justify-center gap-1 rounded-xl border transition disabled:opacity-60 ${
          compact ? 'h-9 px-2.5 text-xs' : 'h-10 px-3 text-xs'
        } ${voted ? activeStyles : idleStyles}`}
        aria-label={voted ? 'Remove vote' : 'Vote for this track'}
        aria-pressed={voted}
        title={voted ? 'Remove your vote' : 'Vote for this track'}
      >
        <ThumbsUp size={compact ? 14 : 15} className={voted ? 'fill-current' : ''} />
        <span className="font-semibold tabular-nums">{formatVotes(track.votes)}</span>
      </button>
      {error && (
        <span className="max-w-[10rem] text-right text-[10px] leading-tight text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
