import { openDB } from 'idb'

const DB_NAME = 'islamic_audio_db'
const STORE_NAME = 'audio_blobs'
const DRAFT_STORE = 'recording_drafts'
const PENDING_UPLOAD_STORE = 'pending_recorder_uploads'
const DB_VERSION = 3

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
      if (oldVersion < 2 && !db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: 'id' })
      }
      if (oldVersion < 3 && !db.objectStoreNames.contains(PENDING_UPLOAD_STORE)) {
        db.createObjectStore(PENDING_UPLOAD_STORE, { keyPath: 'id' })
      }
    },
  })
}

export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  const db = await getDb()
  await db.put(STORE_NAME, blob, id)
}

export async function getAudioBlob(id: string): Promise<Blob | undefined> {
  const db = await getDb()
  return db.get(STORE_NAME, id)
}

export async function deleteAudioBlob(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, id)
}

// ── Recording Drafts ──────────────────────────────────────────────────────

export interface RecordingDraft {
  id: string
  title: string
  savedAt: number
  duration: number
  blob: Blob
  category?: string
  reciter?: string
  topic?: string
}

export async function saveDraft(draft: RecordingDraft): Promise<void> {
  const db = await getDb()
  await db.put(DRAFT_STORE, draft)
}

export async function getAllDrafts(): Promise<RecordingDraft[]> {
  const db = await getDb()
  const all = await db.getAll(DRAFT_STORE)
  return all.sort((a, b) => b.savedAt - a.savedAt)
}

export async function getDraft(id: string): Promise<RecordingDraft | undefined> {
  const db = await getDb()
  return db.get(DRAFT_STORE, id)
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(DRAFT_STORE, id)
}

export interface PendingRecorderUpload {
  id: string
  savedAt: number
  fileName: string
  mimeType: string
  blob: Blob
  metadata: {
    title: string
    category: string
    reciter: string
    topic?: string
    text?: string
    duration?: number
    contributorName: string
    email: string
    mobile?: string
  }
}

export async function savePendingRecorderUpload(upload: PendingRecorderUpload): Promise<void> {
  const db = await getDb()
  await db.put(PENDING_UPLOAD_STORE, upload)
}

export async function getAllPendingRecorderUploads(): Promise<PendingRecorderUpload[]> {
  const db = await getDb()
  const all = await db.getAll(PENDING_UPLOAD_STORE)
  return all.sort((a, b) => a.savedAt - b.savedAt)
}

export async function deletePendingRecorderUpload(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(PENDING_UPLOAD_STORE, id)
}
