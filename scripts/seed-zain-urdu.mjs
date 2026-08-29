/**
 * Seed Zain Bhikha + Urdu nasheeds/naats from Internet Archive.
 * Run: node scripts/seed-zain-urdu.mjs
 */
import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

const firebaseConfig = {
  apiKey: 'AIzaSyAApgjYdOw8QTBINdJETomagniQqlz1mqo',
  authDomain: 'audio-68d1f.firebaseapp.com',
  projectId: 'audio-68d1f',
  storageBucket: 'audio-68d1f.firebasestorage.app',
  messagingSenderId: '749467125801',
  appId: '1:749467125801:web:c852164b64658203ef3438',
}

const app = initializeApp(firebaseConfig)
const storage = getStorage(app)
const db = getFirestore(app)

const CACHE_DIR = join(process.cwd(), 'tmp', 'online-audio')
mkdirSync(CACHE_DIR, { recursive: true })

/** @type {{ archiveId: string, file: string, title: string, reciter: string }[]} */
const ITEMS = [
  // ── Zain Bhikha ─────────────────────────────────────────────────────────
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ Allah Knows.mp3', title: 'Allah Knows', reciter: 'Zain Bhikha' },
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ City Of Medinah.mp3', title: 'City Of Medinah', reciter: 'Zain Bhikha' },
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ Heart Of a Muslim.mp3', title: 'Heart Of A Muslim', reciter: 'Zain Bhikha' },
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ You Are Never Alone.mp3', title: 'You Are Never Alone', reciter: 'Zain Bhikha' },
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ Where We Belong.mp3', title: 'Where We Belong', reciter: 'Zain Bhikha' },
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ Thankyou Allah.mp3', title: 'Thank You Allah', reciter: 'Zain Bhikha' },
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ Allah Is Enough For Me.mp3', title: 'Allah Is Enough For Me', reciter: 'Zain Bhikha' },
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ A is for Allah.mp3', title: 'A Is For Allah', reciter: 'Zain Bhikha' },
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ Mount Hira.mp3', title: 'Mount Hira', reciter: 'Zain Bhikha' },
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ Praise To The Prophet (PBUH).mp3', title: 'Praise To The Prophet', reciter: 'Zain Bhikha' },
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ Tala-Al-Badru-Alyna.mp3', title: "Tala'al Badru Alayna", reciter: 'Zain Bhikha' },
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ Glory Be To Allah.mp3', title: 'Glory Be To Allah', reciter: 'Zain Bhikha' },
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ Orphan Child.mp3', title: 'Orphan Child', reciter: 'Zain Bhikha' },
  { archiveId: 'AbdullahBasfarSura107AlMaoon', file: 'Zain Bhikha_ Mum And Dad (Voice).mp3', title: 'Mum And Dad', reciter: 'Zain Bhikha' },

  // ── Urdu — Junaid Jamshed ───────────────────────────────────────────────
  { archiveId: 'AbdallahKamelSura107AlMaoon_201906', file: 'Junaid Jamshed_ Madine Ko Jayen.mp3', title: 'Madine Ko Jayen', reciter: 'Junaid Jamshed' },
  { archiveId: 'AbdallahKamelSura107AlMaoon_201906', file: 'Junaid Jamshed_ Meetha Meetha Pyara Pyara.mp3', title: 'Meetha Meetha Pyara Pyara', reciter: 'Junaid Jamshed' },
  { archiveId: 'AbdallahKamelSura107AlMaoon_201906', file: 'Junaid Jamshed_ Main To Ummati Hoon.mp3', title: 'Main To Ummati Hoon', reciter: 'Junaid Jamshed' },
  { archiveId: 'AbdallahKamelSura107AlMaoon_201906', file: 'Junaid Jamshed_ Illahi La Tu Azzibni.mp3', title: 'Illahi La Tu Azzibni', reciter: 'Junaid Jamshed' },
  { archiveId: 'AbdallahKamelSura107AlMaoon_201906', file: 'Junaid Jamshed_ Har Lehza.mp3', title: 'Har Lehza', reciter: 'Junaid Jamshed' },
  { archiveId: 'AbdallahKamelSura107AlMaoon_201906', file: 'Junaid Jamshed_ Yeh Subha Madina.mp3', title: 'Yeh Subha Madina', reciter: 'Junaid Jamshed' },
  { archiveId: 'AbdallahKamelSura107AlMaoon_201906', file: 'Junaid Jamshed_ Muhammad Ka Roza.mp3', title: 'Muhammad Ka Roza', reciter: 'Junaid Jamshed' },
  { archiveId: 'AbdallahKamelSura107AlMaoon_201906', file: 'Junaid Jamshed_ Ae Taiba.mp3', title: 'Ae Taiba', reciter: 'Junaid Jamshed' },

  // ── Urdu — Owais Raza Qadri ─────────────────────────────────────────────
  { archiveId: 'AbdallahKamelSura1AlFatiha_201906', file: 'Awais (Owais) Raza Qadri_ Ae Saba Mustafa Se Keh Dena.mp3', title: 'Ae Saba Mustafa Se Keh Dena', reciter: 'Owais Raza Qadri' },
  { archiveId: 'AbdallahKamelSura1AlFatiha_201906', file: 'Awais (Owais) Raza Qadri_ Al Nabi Sallu Aleh.mp3', title: 'Al Nabi Sallu Aleh', reciter: 'Owais Raza Qadri' },
  { archiveId: 'AbdallahKamelSura1AlFatiha_201906', file: 'Awais (Owais) Raza Qadri_ Wo Jo Na Thay To Kuch Na Tha.mp3', title: 'Wo Jo Na Thay To Kuch Na Tha', reciter: 'Owais Raza Qadri' },
  { archiveId: 'AbdallahKamelSura1AlFatiha_201906', file: 'Awais (Owais) Raza Qadri_ Allah Allah Shah E Konain Jalalat Teri.mp3', title: 'Allah Allah Shah-e-Konain', reciter: 'Owais Raza Qadri' },
  { archiveId: 'AbdallahKamelSura1AlFatiha_201906', file: 'Awais (Owais) Raza Qadri_ Yaad Mein Teri Khabar.mp3', title: 'Yaad Mein Teri Khabar', reciter: 'Owais Raza Qadri' },
  { archiveId: 'AbdallahKamelSura1AlFatiha_201906', file: 'Awais (Owais) Raza Qadri_ Dil Mera Duniya Pe Sheda Ho Gaya.mp3', title: 'Dil Mera Duniya Pe Sheda Ho Gaya', reciter: 'Owais Raza Qadri' },
  { archiveId: 'AbdallahKamelSura1AlFatiha_201906', file: 'Awais (Owais) Raza Qadri_ Gunahon Ki Aadat Naat.mp3', title: 'Gunahon Ki Aadat', reciter: 'Owais Raza Qadri' },
]

function archiveUrl(archiveId, file) {
  return `https://archive.org/download/${archiveId}/${encodeURIComponent(file)}`
}

async function downloadFile(url, dest) {
  if (existsSync(dest) && readFileSync(dest).length > 1000) return dest
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
  return dest
}

async function seed() {
  console.log('Fetching existing nasheeds...')
  const snapshot = await getDocs(collection(db, 'tracks'))
  const existing = new Set()
  snapshot.forEach((d) => {
    const data = d.data()
    if (data.category === 'nasheeds') {
      existing.add(String(data.title || '').toLowerCase())
    }
  })
  console.log(`Existing nasheeds: ${existing.size}\n`)

  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const item of ITEMS) {
    if (existing.has(item.title.toLowerCase())) {
      console.log(`  ↷ Skip "${item.title}"`)
      skipped++
      continue
    }

    const safeLocal = item.file.replace(/[^\w\-_.]+/g, '_').slice(0, 100)
    const localPath = join(CACHE_DIR, `${item.archiveId}_${safeLocal}`)

    try {
      process.stdout.write(`  ↓ "${item.title}" (${item.reciter})...`)
      await downloadFile(archiveUrl(item.archiveId, item.file), localPath)
      const buffer = readFileSync(localPath)
      process.stdout.write(` ${(buffer.length / 1e6).toFixed(1)}MB ↑`)

      const id = randomUUID()
      const snap = await uploadBytes(
        ref(storage, `audio/${id}-${safeLocal}`),
        new Blob([buffer], { type: 'audio/mpeg' })
      )
      const audioUrl = await getDownloadURL(snap.ref)

      await setDoc(doc(db, 'tracks', id), {
        id,
        title: item.title,
        category: 'nasheeds',
        reciter: item.reciter,
        fileName: item.file,
        fileSize: buffer.length,
        mimeType: 'audio/mpeg',
        uploadedAt: Date.now(),
        audioUrl,
        views: 0,
        source: `archive.org/${item.archiveId}`,
      })

      console.log(' ✓')
      uploaded++
      existing.add(item.title.toLowerCase())
    } catch (err) {
      console.log(` ✗ ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone! Uploaded: ${uploaded} | Skipped: ${skipped} | Failed: ${failed}`)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
