const KEY = 'track-reactions'

export type ReactionType = 'ameen' | 'heart' | 'fire' | 'learned'

const EMOJI: Record<ReactionType, string> = {
  ameen: '🤲',
  heart: '❤️',
  fire: '🔥',
  learned: '📚',
}

type ReactionMap = Record<string, Partial<Record<ReactionType, number>>>

function load(): ReactionMap {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function save(map: ReactionMap) {
  localStorage.setItem(KEY, JSON.stringify(map))
}

export function getReactions(trackId: string): Partial<Record<ReactionType, number>> {
  return load()[trackId] ?? {}
}

export function addReaction(trackId: string, type: ReactionType): Partial<Record<ReactionType, number>> {
  const map = load()
  const current = map[trackId] ?? {}
  current[type] = (current[type] ?? 0) + 1
  map[trackId] = current
  save(map)
  return current
}

export function reactionEmoji(type: ReactionType): string {
  return EMOJI[type]
}

export const REACTION_TYPES: ReactionType[] = ['ameen', 'heart', 'fire', 'learned']
