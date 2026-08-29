/**
 * Upload a small, reviewed set of local no-music nasheeds.
 * Duplicate-safe by normalized title and artist.
 * Run: node scripts/seed-vocals-only-nasheeds.mjs
 */
import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFirestore, collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore'
import { existsSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { randomUUID } from 'node:crypto'

const firebaseConfig = {
  apiKey: 'AIzaSyAApgjYdOw8QTBINdJETomagniQqlz1mqo',
  authDomain: 'audio-68d1f.firebaseapp.com',
  projectId: 'audio-68d1f',
  storageBucket: 'audio-68d1f.firebasestorage.app',
  messagingSenderId: '749467125801',
  appId: '1:749467125801:web:c852164b64658203ef3438',
}

const music = 'C:\\Users\\huzai\\Music'
const items = [
  { file: 'Anas Younus - Ya Man Salaita Bikullil Anbiya-Anas Younus -https---youtu.be-PnwuRIybpQ8(1).m4a', title: 'Ya Man Salaita Bikullil Anbiya', reciter: 'Qari Anas Younus', language: 'urdu' },
  { file: 'Anas Younus Naat - Durood Shareef - New Heart Touching Naat 2026 - Beautiful Islamic Naat(1).m4a', title: 'Durood Shareef', reciter: 'Qari Anas Younus', language: 'urdu' },
  { file: 'AnasYounus -Nabi G Ka Gaon - Anas Younus Naat 2025 - Beautiful Islamic Naat by Anas Younus(1).m4a', title: 'Nabi G Ka Gaon', reciter: 'Qari Anas Younus', language: 'urdu' },
  { file: 'Maher Zain & Harris J - Qalbi Fil Madinah (Vocals Only) - قلبي في المدينة (بدون موسيقى).mp3', title: 'Qalbi Fil Madinah (Vocals Only)', reciter: 'Maher Zain', language: 'arabic' },
  { file: '[100% Copyright FREE] Allahu Allahu Nasheed╏Covered by Ahmed Rajel╏Vocals Only╏Islamic Audio Lib.mp3', title: 'Allahu Allahu (Vocals Only)', reciter: 'Ahmed Rajel', language: 'arabic' },
  { file: 'Muad - Prophet Muhammad (Vocals Only).mp3', title: 'Prophet Muhammad (Vocals Only)', reciter: 'Muad', language: 'english' },
  { file: 'Muad - No Better Place (Vocals Only).mp3', title: 'No Better Place (Vocals Only)', reciter: 'Muad', language: 'english' },
  { file: 'Jannah - Voice-Only - Muad feat. Zain Bhikha.mp3', title: 'Jannah (Voice Only)', reciter: 'Muad & Zain Bhikha', language: 'english' },
  { file: 'Islamic is my way! (Vocals Only) No Copyright Nasheed Islamic Audio Library.mp3', title: 'Islamic Is My Way (Vocals Only)', reciter: 'Islamic Audio Library', language: 'english' },
  { file: '[100% Copyright FREE] Shaib Alie ft Oneness of Islam - People like you (Vocals only).mp3', title: 'People Like You (Vocals Only)', reciter: 'Shaib Alie & Oneness of Islam', language: 'english' },
  { file: 'Ebraheem X Muad X Musa - Unbreakable (Vocals Only).mp3', title: 'Unbreakable (Vocals Only)', reciter: 'Ebraheem, Muad & Musa', language: 'english' },
  { file: 'Muad - Al-Quran (Vocals Only).mp3', title: 'Al-Quran (Vocals Only)', reciter: 'Muad', language: 'english' },
  { file: 'Muad - Kun Fayakun (Vocals Only).mp3', title: 'Kun Fayakun (Vocals Only)', reciter: 'Muad', language: 'english' },
  { file: 'Muad - Palestine (Vocals Only).mp3', title: 'Palestine (Vocals Only)', reciter: 'Muad', language: 'english' },
  { file: "Muad X Ebraheem - Lord You're With Me (Vocals Only) - Official Music Video.mp3", title: "Lord You're With Me (Vocals Only)", reciter: 'Muad & Ebraheem', language: 'english' },
  { file: 'Muad X Firas - Jibreel (Vocals Only).mp3', title: 'Jibreel (Vocals Only)', reciter: 'Muad & Firas', language: 'english' },
  { file: "Muad X Firas - Tala'al Badru (Vocals Only).mp3", title: "Tala'al Badru (Vocals Only)", reciter: 'Muad & Firas', language: 'arabic' },
  { file: 'Muad X Musa - Superhero II (Vocals Only).mp3', title: 'Superhero II (Vocals Only)', reciter: 'Muad & Musa', language: 'english' },
  { file: 'Muad X Musa X Ebraheem - Reach For The Stars (Vocals Only).mp3', title: 'Reach For The Stars (Vocals Only)', reciter: 'Muad, Musa & Ebraheem', language: 'english' },
  { file: "'Ya Aqsa' by Muad (Vocals Only) - Lyric video - -PALESTINE NASHEED-.mp3", title: 'Ya Aqsa (Vocals Only)', reciter: 'Muad', language: 'english' },
]

const app = initializeApp(firebaseConfig)
const storage = getStorage(app)
const db = getFirestore(app)
const canonicalTitle = (title) => title
  .toLowerCase()
  .replace(/\s*\((vocals?|voice)[ -]?only\)\s*/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
const key = (title, reciter) => `${canonicalTitle(title)}::${reciter.trim().toLowerCase()}`

async function seed() {
  const snapshot = await getDocs(collection(db, 'tracks'))
  const existing = new Map()
  snapshot.forEach((entry) => {
    const track = entry.data()
    if (track.category !== 'nasheeds') return
    const trackKey = key(String(track.title || ''), String(track.reciter || ''))
    const current = existing.get(trackKey)
    if (!current || (current.track.source === 'reviewed-local-file' && track.source !== 'reviewed-local-file')) {
      existing.set(trackKey, { id: entry.id, track })
    }
  })

  for (const entry of snapshot.docs) {
    const track = entry.data()
    if (track.category !== 'nasheeds' || track.source !== 'reviewed-local-file') continue
    const preferred = existing.get(key(String(track.title || ''), String(track.reciter || '')))
    if (preferred && preferred.id !== entry.id) {
      await deleteDoc(doc(db, 'tracks', entry.id))
      console.log(`Removed duplicate upload: ${track.title}`)
    }
  }

  let uploaded = 0
  let skipped = 0
  let failed = 0
  for (const item of items) {
    const localPath = `${music}\\${item.file}`
    if (existing.has(key(item.title, item.reciter))) {
      console.log(`Skip existing: ${item.title}`)
      skipped += 1
      continue
    }
    if (!existsSync(localPath)) {
      console.warn(`Missing: ${item.file}`)
      failed += 1
      continue
    }
    try {
      const buffer = readFileSync(localPath)
      const id = randomUUID()
      const fileName = basename(localPath)
      const mimeType = fileName.toLowerCase().endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg'
      const uploadedFile = await uploadBytes(ref(storage, `audio/${id}-${fileName}`), new Blob([buffer], { type: mimeType }))
      const audioUrl = await getDownloadURL(uploadedFile.ref)
      await setDoc(doc(db, 'tracks', id), {
        id,
        title: item.title,
        category: 'nasheeds',
        reciter: item.reciter,
        language: item.language,
        vocalsOnly: true,
        fileName,
        fileSize: buffer.length,
        mimeType,
        uploadedAt: Date.now(),
        audioUrl,
        views: 0,
        source: 'reviewed-local-file',
      })
      existing.set(key(item.title, item.reciter), { id, track: item })
      uploaded += 1
      console.log(`Uploaded [${item.language}]: ${item.title}`)
    } catch (error) {
      failed += 1
      console.error(`Failed: ${item.title}: ${error.message}`)
    }
  }
  console.log(`Done. Uploaded: ${uploaded}, skipped: ${skipped}, failed: ${failed}`)
}

seed().catch((error) => {
  console.error(error)
  process.exitCode = 1
})