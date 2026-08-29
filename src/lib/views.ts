import { db } from './firebase'
import { doc, getDoc, setDoc, updateDoc, increment, collection, query, getDocs, orderBy, limit } from 'firebase/firestore'

const TRACKS_COLLECTION = 'tracks'
const VIEWS_COLLECTION = 'views'

/**
 * Get the current view count for a track directly from Firebase
 */
export async function getTrackViews(trackId: string): Promise<number> {
  try {
    // Try to get from dedicated views collection first
    const viewsRef = doc(db, VIEWS_COLLECTION, trackId)
    const viewsDoc = await getDoc(viewsRef)
    
    if (viewsDoc.exists()) {
      return viewsDoc.data().count || 0
    }
    
    // Fallback to track document
    const trackRef = doc(db, TRACKS_COLLECTION, trackId)
    const trackDoc = await getDoc(trackRef)
    
    if (trackDoc.exists()) {
      const data = trackDoc.data()
      return data.views || 0
    }
    
    return 0
  } catch (error) {
    console.error('[Views] Error getting views:', error)
    return 0
  }
}

/**
 * Increment view count in Firebase
 * Uses a separate views collection for reliability
 */
export async function incrementTrackViews(trackId: string): Promise<number> {
  try {
    const viewsRef = doc(db, VIEWS_COLLECTION, trackId)
    const viewsDoc = await getDoc(viewsRef)
    
    let newCount: number
    
    if (viewsDoc.exists()) {
      // Increment existing count
      const currentCount = viewsDoc.data().count || 0
      newCount = currentCount + 1
      await updateDoc(viewsRef, {
        count: newCount,
        lastUpdated: new Date().toISOString()
      })
    } else {
      // Initialize with 1
      newCount = 1
      await setDoc(viewsRef, {
        trackId,
        count: newCount,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      })
    }
    
    // Also update the track document for backwards compatibility
    try {
      const trackRef = doc(db, TRACKS_COLLECTION, trackId)
      const trackDoc = await getDoc(trackRef)
      if (trackDoc.exists()) {
        await updateDoc(trackRef, {
          views: newCount
        })
      }
    } catch (e) {
      // Ignore errors updating track document
    }
    
    console.log('[Views] Incremented to:', newCount)
    return newCount
  } catch (error) {
    console.error('[Views] Error incrementing:', error)
    return 0
  }
}

/**
 * Get all view counts
 */
export async function getAllViews(): Promise<Record<string, number>> {
  try {
    const viewsQuery = query(collection(db, VIEWS_COLLECTION))
    const snapshot = await getDocs(viewsQuery)
    
    const views: Record<string, number> = {}
    snapshot.docs.forEach(doc => {
      views[doc.id] = doc.data().count || 0
    })
    
    return views
  } catch (error) {
    console.error('[Views] Error getting all views:', error)
    return {}
  }
}

/**
 * Format view count for display
 */
export function formatViews(views: number | undefined): string {
  if (!views || views === 0) return '0'
  if (views === 1) return '1'
  if (views < 1000) return String(views)
  if (views < 1000000) return `${(views / 1000).toFixed(1)}K`
  return `${(views / 1000000).toFixed(1)}M`
}
