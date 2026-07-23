import type { AudioTrack, AudioCategory } from '../types'
import { 
  storage, db, ref, uploadBytes, getDownloadURL, deleteObject,
  collection, getDocs, deleteDoc, doc, query, orderBy, updateDoc, setDoc, increment 
} from './firebase'

const TRACKS_COLLECTION = 'tracks'

// Upload to Firebase Storage and save metadata to Firestore
export async function uploadAudioToCloud(
  file: File, 
  id: string, 
  metadata: {
    title: string
    category: AudioCategory
    reciter: string
    topic?: string
    duration?: number
    text?: string
    language?: string
    source?: string
  }
): Promise<{ url: string; track: AudioTrack }> {
  const filename = `audio/${id}-${file.name}`
  const storageRef = ref(storage, filename)
  
  console.log('[Upload] Uploading to Firebase Storage:', filename)
  
  // Upload file to Storage
  const snapshot = await uploadBytes(storageRef, file)
  const downloadURL = await getDownloadURL(snapshot.ref)
  
  console.log('[Upload] File uploaded, URL:', downloadURL)
  
  // Create track object - don't include undefined fields
  const track: AudioTrack = {
    id,
    title: metadata.title,
    category: metadata.category,
    reciter: metadata.reciter,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    uploadedAt: Date.now(),
    audioUrl: downloadURL,
    views: 0,
    source: metadata.source || 'upload',
  }
  
  // Only add optional fields if they exist
  if (metadata.topic !== undefined && metadata.topic !== '') {
    track.topic = metadata.topic
  }
  if (metadata.duration !== undefined) {
    track.duration = metadata.duration
  }
  if (metadata.text !== undefined && metadata.text !== '') {
    track.text = metadata.text
  }
  if (metadata.language !== undefined && metadata.language !== '') {
    track.language = metadata.language
  }
  
  // Save metadata to Firestore using the same ID as the track
  const trackDocRef = doc(db, TRACKS_COLLECTION, id)
  await setDoc(trackDocRef, track)
  console.log('[Upload] Metadata saved to Firestore with ID:', id)
  
  return { url: downloadURL, track }
}

export async function deleteAudioFromCloud(track: AudioTrack): Promise<void> {
  // Delete from Storage
  if (track.audioUrl) {
    const filename = `audio/${track.id}-${track.fileName}`
    const fileRef = ref(storage, filename)
    try {
      await deleteObject(fileRef)
    } catch (e) {
      console.error('Failed to delete from storage:', e)
    }
  }
  
  // Delete from Firestore
  try {
    await deleteDoc(doc(db, TRACKS_COLLECTION, track.id))
  } catch {
    const q = query(collection(db, TRACKS_COLLECTION))
    const snapshot = await getDocs(q)
    for (const d of snapshot.docs) {
      const data = d.data() as AudioTrack
      if (data.id === track.id) {
        await deleteDoc(doc(db, TRACKS_COLLECTION, d.id))
      }
    }
  }
}

// Get all tracks from Firestore
export async function getAllTracks(): Promise<AudioTrack[]> {
  const q = query(collection(db, TRACKS_COLLECTION), orderBy('uploadedAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data() as AudioTrack
    return {
      ...data,
      views: typeof data.views === 'number' ? data.views : 0,
    }
  })
}

export function getTracksByCategory(category: AudioCategory): Promise<AudioTrack[]> {
  return getAllTracks().then(tracks => tracks.filter(t => t.category === category))
}

/** Increment play/view count for a track. */
export async function incrementTrackViews(trackId: string): Promise<void> {
  try {
    await updateDoc(doc(db, TRACKS_COLLECTION, trackId), { views: increment(1) })
    return
  } catch {
    // Fallback when Firestore doc id differs from track.id
  }

  const q = query(collection(db, TRACKS_COLLECTION))
  const snapshot = await getDocs(q)
  for (const d of snapshot.docs) {
    const data = d.data() as AudioTrack
    if (data.id === trackId) {
      await updateDoc(doc(db, TRACKS_COLLECTION, d.id), { views: increment(1) })
      return
    }
  }
  throw new Error('Track not found')
}

// Legacy localStorage functions (not used anymore)
export function saveTracks(tracks: AudioTrack[]): void {
  localStorage.setItem('tracks_backup', JSON.stringify(tracks))
}

export function addTrack(track: AudioTrack): void {
  // No-op - using Firestore now
}

export function deleteTrack(id: string): void {
  // No-op - using Firestore now
}

export async function updateTrackInCloud(
  id: string, 
  patch: Partial<Pick<AudioTrack, 'title' | 'reciter' | 'category' | 'topic' | 'language'>>
): Promise<void> {
  // Prefer direct doc id
  try {
    await updateDoc(doc(db, TRACKS_COLLECTION, id), patch)
    console.log('[Update] Track updated in Firestore:', id, patch)
    return
  } catch {
    // Fallback: scan if doc id differs
  }

  const q = query(collection(db, TRACKS_COLLECTION))
  const snapshot = await getDocs(q)
  
  for (const d of snapshot.docs) {
    const data = d.data() as AudioTrack
    if (data.id === id) {
      await updateDoc(doc(db, TRACKS_COLLECTION, d.id), patch)
      console.log('[Update] Track updated in Firestore:', id, patch)
      return
    }
  }
  
  throw new Error('Track not found')
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatViews(views: number): string {
  if (views < 1000) return String(views)
  if (views < 10000) return `${(views / 1000).toFixed(1).replace(/\.0$/, '')}k`
  if (views < 1000000) return `${Math.round(views / 1000)}k`
  return `${(views / 1000000).toFixed(1).replace(/\.0$/, '')}M`
}
