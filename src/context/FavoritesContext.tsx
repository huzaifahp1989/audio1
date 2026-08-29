import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AudioTrack } from '../types'
import {
  canFavorite,
  loadFavorites,
  mergeFavoriteWithLibrary,
  saveFavorites,
  trackToStoredFavorite,
  type StoredFavorite,
} from '../lib/favorites'
import { trackEvent } from '../lib/analytics'

interface FavoritesContextValue {
  favorites: StoredFavorite[]
  favoriteCount: number
  isFavorite: (trackId: string) => boolean
  toggleFavorite: (track: AudioTrack) => boolean
  removeFavorite: (trackId: string) => void
  resolveFavoriteTracks: (library: AudioTrack[]) => AudioTrack[]
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<StoredFavorite[]>(() => loadFavorites())

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const isFavorite = useCallback(
    (trackId: string) => favorites.some((f) => f.id === trackId),
    [favorites]
  )

  const toggleFavorite = useCallback((track: AudioTrack) => {
    if (!canFavorite(track)) return false

    let added = false
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === track.id)
      if (exists) {
        added = false
        return prev.filter((f) => f.id !== track.id)
      }
      added = true
      return [trackToStoredFavorite(track), ...prev]
    })
    trackEvent(added ? 'favorite_add' : 'favorite_remove', { track_id: track.id, category: track.category })
    return added
  }, [])

  const removeFavorite = useCallback((trackId: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== trackId))
  }, [])

  const resolveFavoriteTracks = useCallback(
    (library: AudioTrack[]) => favorites.map((fav) => mergeFavoriteWithLibrary(fav, library)),
    [favorites]
  )

  const value = useMemo(
    () => ({
      favorites,
      favoriteCount: favorites.length,
      isFavorite,
      toggleFavorite,
      removeFavorite,
      resolveFavoriteTracks,
    }),
    [favorites, isFavorite, toggleFavorite, removeFavorite, resolveFavoriteTracks]
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
