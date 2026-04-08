import { openDB } from 'idb'

const DB_NAME = 'islamic_audio_db'
const STORE_NAME = 'audio_blobs'
const DRAFT_STORE = 'recording_drafts'
const DB_VERSION = 2

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
      if (oldVersion < 2 && !db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: 'id' })
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
