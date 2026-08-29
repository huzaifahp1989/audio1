import type { AudioTrack, AudioCategory, AdAudioTrack, PlaylistAdTargetCategory } from '../types'
import type { KidsSubmission, UserSubmission } from '../types/kids'
import { 
  storage, db, ref, uploadBytes, getDownloadURL, deleteObject,
<<<<<<< HEAD
  collection, getDocs, deleteDoc, doc, query, where, orderBy, updateDoc, setDoc, increment, addDoc
=======
  collection, getDocs, deleteDoc, doc, query, orderBy, updateDoc, setDoc, increment 
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
} from './firebase'
import { getAllViews } from './views'
import { getAllVotes } from './votes'

const TRACKS_COLLECTION = 'tracks'
const AD_AUDIO_COLLECTION = 'adAudio'

interface VercelUploadResponse {
  success: boolean
  url?: string
  pathname?: string
  error?: string
}

interface UploadStorageOptions {
  requireFirebaseStorage?: boolean
}

export type AdminStorageTarget = 'firebase' | 'google-drive' | 'onedrive'

interface AdminStorageConfig {
  target: AdminStorageTarget
  googleDriveWebhookUrl?: string
  oneDriveWebhookUrl?: string
}

const ADMIN_STORAGE_CONFIG_KEY = 'admin_storage_config_v1'

interface ExternalUploadResponse {
  success?: boolean
  url?: string
  downloadUrl?: string
  webUrl?: string
  error?: string
}

function defaultAdminStorageConfig(): AdminStorageConfig {
  return { target: 'firebase' }
}

export function getAdminStorageConfig(): AdminStorageConfig {
  if (typeof window === 'undefined') return defaultAdminStorageConfig()

  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_CONFIG_KEY)
    if (!raw) return defaultAdminStorageConfig()
    const parsed = JSON.parse(raw) as Partial<AdminStorageConfig>
    const target = parsed.target
    if (target !== 'firebase' && target !== 'google-drive' && target !== 'onedrive') {
      return defaultAdminStorageConfig()
    }
    return {
      target,
      googleDriveWebhookUrl: parsed.googleDriveWebhookUrl || '',
      oneDriveWebhookUrl: parsed.oneDriveWebhookUrl || '',
    }
  } catch {
    return defaultAdminStorageConfig()
  }
}

export function saveAdminStorageConfig(config: AdminStorageConfig): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ADMIN_STORAGE_CONFIG_KEY, JSON.stringify(config))
}

async function uploadViaExternalWebhook(file: File, folder: string, webhookUrl: string, provider: AdminStorageTarget): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)
  formData.append('provider', provider)

  const response = await fetch(webhookUrl, {
    method: 'POST',
    body: formData,
  })

  let payload: ExternalUploadResponse | null = null
  let rawText = ''
  try {
    rawText = await response.text()
    payload = rawText ? (JSON.parse(rawText) as ExternalUploadResponse) : null
  } catch {
    // Ignore JSON parse errors and handle below.
  }

  const resolvedUrl = payload?.url || payload?.downloadUrl || payload?.webUrl
  if (!response.ok || !resolvedUrl) {
    throw new Error(
      payload?.error ||
      `External ${provider} upload failed (HTTP ${response.status}${rawText ? `: ${rawText}` : ''}).`
    )
  }

  return resolvedUrl
}

async function uploadViaVercelApi(file: File, folder: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  let payload: VercelUploadResponse | null = null
  let rawText = ''
  try {
    rawText = await response.text()
    payload = rawText ? (JSON.parse(rawText) as VercelUploadResponse) : null
  } catch {
    // Keep null payload; we'll throw a generic error below.
  }

  if (!response.ok || !payload?.success || !payload.url) {
    throw new Error(
      payload?.error ||
      `Fallback upload failed via /api/upload (HTTP ${response.status}${rawText ? `: ${rawText}` : ''}).`
    )
  }

  return payload.url
}

function isServerUploadFallbackEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_UPLOAD_API_FALLBACK !== 'false'
}

function isCorsLikeUploadError(error: unknown): boolean {
  const err = error as { code?: string; message?: string; name?: string }
  const msg = (err?.message || '').toLowerCase()
  const name = (err?.name || '').toLowerCase()
  return (
    name === 'typeerror' ||
    msg.includes('cors') ||
    msg.includes('cross-origin') ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('networkerror') ||
    err?.code === 'storage/unknown'
  )
}

/** Wraps uploadBytes with a timeout so CORS/billing issues fall through to the
 *  server-side /api/upload fallback quickly instead of hanging for minutes. */
function uploadBytesWithTimeout(storageRef: ReturnType<typeof ref>, file: File, timeoutMs = 10_000): Promise<Awaited<ReturnType<typeof uploadBytes>>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Firebase Storage upload timed out.')), timeoutMs)
    uploadBytes(storageRef, file).then(
      (snapshot) => { clearTimeout(timer); resolve(snapshot) },
      (err) => { clearTimeout(timer); reject(err) }
    )
  })
}

export async function uploadFileToBestStorage(file: File, path: string, options: UploadStorageOptions = {}): Promise<string> {
  const folder = path.includes('/') ? path.split('/')[0] : 'uploads'
  const { requireFirebaseStorage = false } = options
  const adminStorageConfig = getAdminStorageConfig()

  if (!requireFirebaseStorage && adminStorageConfig.target !== 'firebase') {
    const webhookUrl = adminStorageConfig.target === 'google-drive'
      ? adminStorageConfig.googleDriveWebhookUrl
      : adminStorageConfig.oneDriveWebhookUrl

    if (!webhookUrl) {
      throw new Error(
        adminStorageConfig.target === 'google-drive'
          ? 'Google Drive webhook URL is not configured in Admin storage settings.'
          : 'OneDrive webhook URL is not configured in Admin storage settings.'
      )
    }

    return uploadViaExternalWebhook(file, folder, webhookUrl, adminStorageConfig.target)
  }

  const storageRef = ref(storage, path)

  try {
    const snapshot = await uploadBytesWithTimeout(storageRef, file)
    return await getDownloadURL(snapshot.ref)
  } catch (error) {
    // Fall back to /api/upload for any Firebase error except explicit user cancellation.
    const isCanceled = (error as { code?: string }).code === 'storage/canceled'
    const canFallback = !requireFirebaseStorage && isServerUploadFallbackEnabled() && !isCanceled

    if (canFallback) {
      try {
        return await uploadViaVercelApi(file, folder)
      } catch (fallbackError) {
        const firebaseMsg = (error as { message?: string })?.message || 'Firebase upload failed.'
        const fallbackMsg = (fallbackError as { message?: string })?.message || 'Unknown fallback error.'
        throw new Error(`${firebaseMsg} Fallback upload also failed: ${fallbackMsg}`)
      }
    }

    throw error
  }
}

function mapStorageError(error: unknown): Error {
  const err = error as { code?: string; message?: string }
  const code = err?.code || ''

  if (code === 'storage/unauthorized') {
    return new Error('Upload denied by storage rules. Please contact admin.')
  }
  if (code === 'storage/retry-limit-exceeded') {
    return new Error('Upload timed out. Check connection and try again.')
  }
  if (code === 'storage/quota-exceeded') {
    return new Error('Storage quota exceeded. Please try again later.')
  }
  if (code === 'storage/canceled') {
    return new Error('Upload canceled before completion.')
  }

  if (isCorsLikeUploadError(error)) {
    return new Error('Upload blocked by storage CORS configuration. Configure bucket CORS for this domain or use the server upload fallback endpoint.')
  }

  return new Error(err?.message || 'Upload failed.')
}

// Upload to Firebase Storage and save metadata to Firestore
export async function uploadAudioToCloud(
  file: File, 
  id: string, 
<<<<<<< HEAD
  metadata: { title: string; category: AudioCategory; reciter: string; topic?: string; duration?: number; text?: string; imageFile?: File },
  options: UploadStorageOptions = {}
=======
  metadata: {
    title: string
    category: AudioCategory
    reciter: string
    topic?: string
    duration?: number
    text?: string
    language?: string
    source?: string
    vocalsOnly?: boolean
  }
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
): Promise<{ url: string; track: AudioTrack }> {
  try {
    const filename = `audio/${id}-${file.name}`
    const { requireFirebaseStorage = false } = options
    
    console.log('[Upload] Uploading to Firebase Storage:', filename)
    
    // Upload file to Storage (with fallback to /api/upload for CORS-blocked environments)
    const downloadURL = await uploadFileToBestStorage(file, filename, { requireFirebaseStorage })
    
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
      views: 0, // Initialize views to 0
    }

    if (metadata.imageFile && metadata.imageFile.type.startsWith('image/')) {
      const imageFilename = `images/${id}-${metadata.imageFile.name}`
      const imageDownloadURL = await uploadFileToBestStorage(metadata.imageFile, imageFilename, { requireFirebaseStorage })
      track.imageFileName = metadata.imageFile.name
      track.imageUrl = imageDownloadURL
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
    
    // Save metadata to Firestore using the same ID as the track
    const trackDocRef = doc(db, TRACKS_COLLECTION, id)
    await setDoc(trackDocRef, track)
    console.log('[Upload] Metadata saved to Firestore with ID:', id)
    
    return { url: downloadURL, track }
  } catch (error) {
    throw mapStorageError(error)
  }
}

// Create a track whose audio is already hosted at a remote URL (e.g. imported
// from YouTube and stored on Vercel Blob). Only writes the Firestore metadata.
export async function createTrackFromRemote(data: {
  audioUrl: string
  title: string
  category: AudioCategory
  reciter: string
  topic?: string
  duration?: number
  fileName: string
  fileSize: number
  mimeType: string
  imageUrl?: string
}): Promise<AudioTrack> {
  const id = crypto.randomUUID()

  const track: AudioTrack = {
    id,
    title: data.title,
    category: data.category,
    reciter: data.reciter,
    fileName: data.fileName,
    fileSize: data.fileSize,
    mimeType: data.mimeType,
    uploadedAt: Date.now(),
    audioUrl: data.audioUrl,
    views: 0,
  }

  if (data.topic !== undefined && data.topic !== '') track.topic = data.topic
  if (data.duration !== undefined && Number.isFinite(data.duration)) track.duration = data.duration
  if (data.imageUrl) track.imageUrl = data.imageUrl

  const trackDocRef = doc(db, TRACKS_COLLECTION, id)
  await setDoc(trackDocRef, track)
  return track
}

export async function uploadAdAudioToCloud(
  file: File,
  metadata: { title: string; sponsorHref?: string; duration?: number; sortOrder?: number; targetCategories?: PlaylistAdTargetCategory[] }
): Promise<AdAudioTrack> {
  const id = crypto.randomUUID()
  const filename = `ads/${id}-${file.name}`
  const downloadURL = await uploadFileToBestStorage(file, filename)

  const adTrack: AdAudioTrack = {
    id,
    title: metadata.title,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    uploadedAt: Date.now(),
    audioUrl: downloadURL,
<<<<<<< HEAD
    active: true,
=======
    views: 0,
    source: metadata.source || 'upload',
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
  }

  if (metadata.duration !== undefined) adTrack.duration = metadata.duration
  adTrack.heardCount = 0
  if (metadata.sponsorHref) adTrack.sponsorHref = metadata.sponsorHref
  if (metadata.sortOrder !== undefined) adTrack.sortOrder = metadata.sortOrder
  if (metadata.targetCategories?.length) adTrack.targetCategories = metadata.targetCategories

  await setDoc(doc(db, AD_AUDIO_COLLECTION, id), adTrack)
  return adTrack
}

export async function submitUserRecordingForReview(
  file: File,
  metadata: {
    title: string
    category: AudioCategory
    reciter: string
    contributorName: string
    email: string
    mobile?: string
    topic?: string
    text?: string
    duration?: number
  },
  options: UploadStorageOptions = {},
): Promise<string> {
  const safeName = metadata.contributorName.trim() || 'Contributor'
  const pathSafeName = safeName.replace(/\s+/g, '_')
  const storageFileName = `user-submissions/${pathSafeName}-${Date.now()}-${file.name}`
  const audioUrl = await uploadFileToBestStorage(file, storageFileName, options)

  const submissionData: Record<string, unknown> = {
    title: metadata.title,
    category: metadata.category,
    contributorName: safeName,
    email: metadata.email,
    reciter: metadata.reciter,
    audioUrl,
    fileName: file.name,
    fileSize: file.size,
    submittedAt: Date.now(),
    status: 'pending',
  }

  if (metadata.mobile !== undefined && metadata.mobile !== '') {
    submissionData.mobile = metadata.mobile
  }

  if (metadata.topic !== undefined && metadata.topic !== '') {
    submissionData.topic = metadata.topic
  }

  if (metadata.text !== undefined && metadata.text !== '') {
    submissionData.text = metadata.text
  }
<<<<<<< HEAD

  if (metadata.duration !== undefined) {
    submissionData.duration = metadata.duration
  }

  const submissionRef = await addDoc(collection(db, 'userSubmissions'), submissionData)

  return submissionRef.id
}

export async function getAllAdAudioTracks(): Promise<AdAudioTrack[]> {
  const snapshot = await getDocs(collection(db, AD_AUDIO_COLLECTION))
  return snapshot.docs
    .map((entry) => entry.data() as AdAudioTrack)
    .sort((a, b) => {
      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER
      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER
      if (orderA !== orderB) return orderA - orderB
      return b.uploadedAt - a.uploadedAt
    })
}

export async function deleteAdAudioFromCloud(track: AdAudioTrack): Promise<void> {
  if (track.audioUrl) {
    const filename = `ads/${track.id}-${track.fileName}`
    const fileRef = ref(storage, filename)
    try {
      await deleteObject(fileRef)
    } catch (error) {
      console.error('Failed to delete ad audio from storage:', error)
    }
  }

  await deleteDoc(doc(db, AD_AUDIO_COLLECTION, track.id))
}

export async function updateAdAudioTrackInCloud(
  id: string,
  patch: Partial<Pick<AdAudioTrack, 'title' | 'sponsorHref' | 'active' | 'sortOrder' | 'targetCategories'>>
): Promise<void> {
  await updateDoc(doc(db, AD_AUDIO_COLLECTION, id), patch)
}

export async function incrementAdAudioHeardCount(id: string): Promise<void> {
  await updateDoc(doc(db, AD_AUDIO_COLLECTION, id), {
    heardCount: increment(1),
  })
=======
  if (metadata.language !== undefined && metadata.language !== '') {
    track.language = metadata.language
  }
  if (metadata.vocalsOnly) {
    track.vocalsOnly = true
  }
  
  // Save metadata to Firestore using the same ID as the track
  const trackDocRef = doc(db, TRACKS_COLLECTION, id)
  await setDoc(trackDocRef, track)
  console.log('[Upload] Metadata saved to Firestore with ID:', id)
  
  return { url: downloadURL, track }
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
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

// Get all tracks from Firestore with views
export async function getAllTracks(): Promise<AudioTrack[]> {
<<<<<<< HEAD
  const tracksQuery = query(collection(db, TRACKS_COLLECTION), orderBy('uploadedAt', 'desc'))
  const kidsQuery = query(
    collection(db, 'kidsSubmissions'),
    where('status', '==', 'approved'),
  )
  const usersQuery = query(
    collection(db, 'userSubmissions'),
    where('status', '==', 'approved'),
  )

  const [tracksSnapshot, kidsSnapshot, usersSnapshot, views, votes] = await Promise.all([
    getDocs(tracksQuery),
    getDocs(kidsQuery),
    getDocs(usersQuery),
    getAllViews(),
    getAllVotes(),
  ])

  const mappedTracks = tracksSnapshot.docs.map((d) => {
    const data = d.data() as AudioTrack
    return { ...data, views: views[d.id] || data.views || 0, votes: votes[d.id] || data.votes || 0 }
  })

  const mapKidsCategory = (cat: string): AudioCategory => {
    const normalized = String(cat || '').toLowerCase()
    if (normalized === 'quran') return 'kids-quran'
    if (normalized === 'nasheed' || normalized === 'nasheeds') return 'kids-nasheeds'
    if (normalized === 'talk' || normalized === 'talks') return 'kids-talks'
    return 'kids-stories'
  }

  const mappedKidsTracks: AudioTrack[] = kidsSnapshot.docs.map((d) => {
    const submission = d.data() as Omit<KidsSubmission, 'id'>
    const id = `kids-${d.id}`
    const uploadedAt = submission.reviewedAt || submission.submittedAt || Date.now()

    return {
      id,
      title: submission.title,
      category: mapKidsCategory(String(submission.category || 'story')),
      reciter: submission.username || 'Kids',
      fileName: submission.fileName || d.id,
      fileSize: submission.fileSize || 0,
      duration: submission.duration,
      mimeType: 'audio/webm',
      uploadedAt,
      audioUrl: submission.audioUrl,
      views: views[id] || 0,
      votes: votes[id] || 0,
    }
  })

  const mappedUserTracks: AudioTrack[] = usersSnapshot.docs.map((d) => {
    const submission = d.data() as Omit<UserSubmission, 'id'>
    const id = `user-${d.id}`
    const uploadedAt = submission.reviewedAt || submission.submittedAt || Date.now()

    return {
      id,
      title: submission.title,
      category: submission.category as AudioCategory,
      reciter: submission.reciter || submission.contributorName || 'Contributor',
      fileName: submission.fileName || d.id,
      fileSize: submission.fileSize || 0,
      duration: submission.duration,
      mimeType: submission.audioUrl?.endsWith('.mp3') ? 'audio/mpeg' : 'audio/webm',
      uploadedAt,
      audioUrl: submission.audioUrl,
      topic: submission.topic,
      views: views[id] || 0,
      votes: votes[id] || 0,
    }
  })

  return [...mappedUserTracks, ...mappedKidsTracks, ...mappedTracks].sort((a, b) => b.uploadedAt - a.uploadedAt)
=======
  const q = query(collection(db, TRACKS_COLLECTION), orderBy('uploadedAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data() as AudioTrack
    return {
      ...data,
      views: typeof data.views === 'number' ? data.views : 0,
    }
  })
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
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

export async function replaceTrackAudioInCloud(
  track: AudioTrack,
  file: File,
  duration?: number,
): Promise<void> {
  const filename = `audio/${track.id}-${track.fileName}`
  const downloadURL = await uploadFileToBestStorage(file, filename)

  const q = query(collection(db, TRACKS_COLLECTION))
  const docs = await getDocs(q)

  for (const d of docs.docs) {
    const data = d.data() as AudioTrack
    if (data.id === track.id) {
      const patch: Partial<AudioTrack> = {
        audioUrl: downloadURL,
        fileSize: file.size,
        mimeType: file.type || data.mimeType,
      }
      if (duration !== undefined) patch.duration = duration
      await updateDoc(doc(db, TRACKS_COLLECTION, d.id), patch)
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

<<<<<<< HEAD
export function formatUploadDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
=======
export function formatViews(views: number): string {
  if (views < 1000) return String(views)
  if (views < 10000) return `${(views / 1000).toFixed(1).replace(/\.0$/, '')}k`
  if (views < 1000000) return `${Math.round(views / 1000)}k`
  return `${(views / 1000000).toFixed(1).replace(/\.0$/, '')}M`
>>>>>>> bb41fdf8dab76e22e26ed6544950f99b09baf0f3
}
