import React, { useState } from 'react'
import { REACTION_TYPES, addReaction, getReactions, reactionEmoji, type ReactionType } from '../lib/reactions'

interface ReactionBarProps {
  trackId: string
}

export default function ReactionBar({ trackId }: ReactionBarProps) {
  const [counts, setCounts] = useState(() => getReactions(trackId))

  const react = (type: ReactionType) => {
    setCounts(addReaction(trackId, type))
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTION_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => react(type)}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--theme-muted)] transition hover:border-[var(--theme-brand)]/30 hover:bg-[var(--theme-soft)]"
          title={type}
        >
          <span>{reactionEmoji(type)}</span>
          {(counts[type] ?? 0) > 0 && <span className="tabular-nums">{counts[type]}</span>}
        </button>
      ))}
    </div>
  )
}
