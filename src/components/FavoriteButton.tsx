import React from 'react'
import { Heart } from 'lucide-react'
import type { AudioTrack } from '../types'
import { useFavorites } from '../context/FavoritesContext'
import { canFavorite } from '../lib/favorites'

interface FavoriteButtonProps {
  track: AudioTrack
  variant?: 'nasheeds' | 'talks' | 'neutral'
  className?: string
}

export default function FavoriteButton({ track, variant = 'neutral', className = '' }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites()

  if (!canFavorite(track)) return null

  const active = isFavorite(track.id)

  const activeStyles = {
    nasheeds: 'border-rose-200 bg-rose-50 text-rose-600',
    talks: 'border-rose-200 bg-rose-50 text-rose-600',
    neutral: 'border-rose-200 bg-rose-50 text-rose-600',
  }[variant]

  const idleStyles = {
    nasheeds: 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-rose-200 hover:text-rose-500',
    talks: 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-rose-200 hover:text-rose-500',
    neutral: 'border-[var(--theme-border)] bg-[var(--theme-surface-2)] text-[var(--theme-muted)] hover:border-rose-200 hover:text-rose-500',
  }[variant]

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        toggleFavorite(track)
      }}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${active ? activeStyles : idleStyles} ${className}`}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={active}
    >
      <Heart size={16} className={active ? 'fill-current' : ''} />
    </button>
  )
}
