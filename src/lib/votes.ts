import { db } from './firebase'
import {
  doc,
  collection,
  query,
  getDocs,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore'
import type { AudioTrack } from '../types'

const VOTES_COLLECTION = 'votes'
const STORAGE_KEY = 'audio-votes-v1'

export type VotableCategory = 'nasheeds' | 'talks'

export function canVote(track: AudioTrack): track is AudioTrack & { category: VotableCategory } {
  return track.category === 'nasheeds' || track.category === 'talks'
}

export function loadVotedTrackIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

export function saveVotedTrackIds(ids: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

export function hasVoted(trackId: string): boolean {
  return loadVotedTrackIds().has(trackId)
}

export async function getAllVotes(): Promise<Record<string, number>> {
  try {
    const snapshot = await getDocs(query(collection(db, VOTES_COLLECTION)))
    const votes: Record<string, number> = {}
    snapshot.docs.forEach((d) => {
      votes[d.id] = d.data().count || 0
    })
    return votes
  } catch (error) {
    console.error('[Votes] Error getting all votes:', error)
    return {}
  }
}

export function subscribeToVotes(
  onVotes: (votes: Record<string, number>) => void,
  onError?: (message: string) => void,
): () => void {
  return onSnapshot(
    query(collection(db, VOTES_COLLECTION)),
    (snapshot) => {
      const votes: Record<string, number> = {}
      snapshot.forEach((d) => {
        votes[d.id] = d.data().count || 0
      })
      onVotes(votes)
    },
    (error) => {
      console.error('[Votes] Live subscription error:', error)
      const message = error.message.includes('permission')
        ? 'Cannot load votes — publish firestore.rules in Firebase Console.'
        : error.message
      onError?.(message)
    },
  )
}

async function adjustTrackVotes(trackId: string, delta: 1 | -1): Promise<number> {
  const votesRef = doc(db, VOTES_COLLECTION, trackId)

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(votesRef)
    const current = snap.exists() ? (snap.data().count || 0) : 0
    const next = Math.max(0, current + delta)

    if (next === 0 && !snap.exists()) return 0

    transaction.set(
      votesRef,
      {
        trackId,
        count: next,
        ...(snap.exists() ? {} : { createdAt: new Date().toISOString() }),
        lastUpdated: new Date().toISOString(),
      },
      { merge: true },
    )

    return next
  })
}

export async function voteForTrack(trackId: string): Promise<number> {
  try {
    return await adjustTrackVotes(trackId, 1)
  } catch (error) {
    console.error('[Votes] Error voting:', error)
    throw error
  }
}

export async function removeVoteForTrack(trackId: string): Promise<number> {
  try {
    return await adjustTrackVotes(trackId, -1)
  } catch (error) {
    console.error('[Votes] Error removing vote:', error)
    throw error
  }
}

export function formatVotes(votes: number | undefined): string {
  if (!votes || votes === 0) return '0'
  if (votes === 1) return '1'
  if (votes < 1000) return String(votes)
  if (votes < 1000000) return `${(votes / 1000).toFixed(1)}K`
  return `${(votes / 1000000).toFixed(1)}M`
}

export function voteErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('permission') || message.includes('PERMISSION_DENIED')) {
    return 'Voting is blocked — publish firestore.rules in Firebase Console.'
  }
  return 'Could not save your vote. Please try again.'
}
