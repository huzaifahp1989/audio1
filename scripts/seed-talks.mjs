/**
 * Seed script: uploads local Islamic talk/bayan files to Firebase
 * Run with: node scripts/seed-talks.mjs
 */
import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { randomUUID } from 'crypto'
import { join, basename } from 'path'

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

const MUSIC_DIR = 'C:\\Users\\huzai\\Music'

// Helper: resolve file by partial name match (handles special chars in filenames)
const allFiles = readdirSync(MUSIC_DIR, { encoding: 'utf8' })
function findFile(partial) {
  const match = allFiles.find(f => f.includes(partial))
  if (!match) return null
  return join(MUSIC_DIR, match)
}

// Curated talks — deduplicated (prefer .m4a where both exist)
const TALKS = [
  // ── Molana Tariq Jameel ──────────────────────────────────────────────────
  {
    match: 'Does God Exist- - New Year 2026',
    title: 'Does God Exist?',
    speaker: 'Molana Tariq Jameel',
    topic: 'aqeedah',
  },
  {
    match: 'How to Bring Happiness Home',
    title: 'How to Bring Happiness Home',
    speaker: 'Molana Tariq Jameel',
    topic: 'family',
  },
  {
    match: 'MAULANA TARlQ lAmEEL l HEART T0UCHlNG BAYAN',
    title: 'Heart Touching Bayan: Quitting Sins',
    speaker: 'Molana Tariq Jameel',
    topic: 'repentance',
  },
  {
    match: 'Nabi ﷺ ke Ikhlaaq',
    title: "Nabi ﷺ Ke Ikhlaaq Kaise Thay",
    speaker: 'Molana Tariq Jameel',
    topic: 'seerah',
  },
  {
    match: 'Amazing Creation of Camel',
    title: 'The Amazing Creation of the Camel',
    speaker: 'Molana Tariq Jameel',
    topic: 'aqeedah',
  },
  {
    match: 'Biggest Illusion of Life',
    title: "The Biggest Illusion of Life",
    speaker: 'Molana Tariq Jameel',
    topic: 'spirituality',
  },
  {
    match: 'True Status of Women in Islam',
    title: 'The True Status of Women in Islam',
    speaker: 'Molana Tariq Jameel',
    topic: 'social',
  },
  // ── Sheikh Sulaiman Moola ────────────────────────────────────────────────
  {
    match: 'Gaining the help of Allah',
    title: 'Gaining the Help of Allah',
    speaker: 'Sheikh Sulaiman Moola',
    topic: 'spirituality',
  },
  {
    match: 'Livestream - The Prophet (pbuh) As A Leader',
    title: 'The Prophet ﷺ as a Leader',
    speaker: 'Sheikh Sulaiman Moola',
    topic: 'seerah',
  },
  {
    match: 'Memory Lane - Ep 1',
    title: 'Memory Lane — Episode 1',
    speaker: 'Sheikh Sulaiman Moola',
    topic: 'history',
  },
  {
    match: 'Memory Lane - Ep 2',
    title: 'Memory Lane — Episode 2',
    speaker: 'Sheikh Rafiq Sufi',
    topic: 'history',
  },
  {
    match: 'Results Require Routine',
    title: 'Results Require Routine',
    speaker: 'Sheikh Sulaiman Moola',
    topic: 'youth',
  },
  {
    match: 'Seek Forgiveness From Those You Have Wronged',
    title: 'Seek Forgiveness From Those You Have Wronged',
    speaker: 'Sheikh Sulaiman Moola',
    topic: 'repentance',
  },
  // ── Dr. Mufti Abdur-Rahman ibn Yusuf (Mufti Menk-style) ─────────────────
  {
    match: 'Faith, Knowledge, and Inner Strength',
    title: 'Faith, Knowledge and Inner Strength',
    speaker: 'Mufti Abdur-Rahman ibn Yusuf',
    topic: 'spirituality',
  },
  {
    match: 'Identity Fatigue, Alignment and Inner Peace',
    title: 'Identity Fatigue, Alignment and Inner Peace',
    speaker: 'Mufti Abdur-Rahman ibn Yusuf',
    topic: 'youth',
  },
  // ── Hisham Abu Yusuf ────────────────────────────────────────────────────
  {
    match: 'Mindset The Prophet ﷺ Had To Get Rid of Ego',
    title: 'The Mindset to Get Rid of Ego and Pride',
    speaker: 'Hisham Abu Yusuf',
    topic: 'spirituality',
  },
  {
    match: 'Why Social Media Is Destroying Your Discipline',
    title: 'Why Social Media Is Destroying Your Discipline',
    speaker: 'Hisham Abu Yusuf',
    topic: 'youth',
  },
  {
    match: "Addicted to Scrolling",
    title: "Why You're Addicted to Scrolling but Bored of the Quran",
    speaker: 'Hisham Abu Yusuf',
    topic: 'youth',
  },
  // ── Sheikh Abu Bakr Zoud ─────────────────────────────────────────────────
  {
    match: "MOST Muslims Don't Realize This About Allah",
    title: "Most Muslims Don't Realize This About Allah",
    speaker: 'Sheikh Abu Bakr Zoud',
    topic: 'aqeedah',
  },
  // ── Molana Muhammad Vanker ───────────────────────────────────────────────
  {
    match: 'Build Your Home with Taqwa',
    title: 'Build Your Home with Taqwa',
    speaker: 'Molana Muhammad Vanker',
    topic: 'family',
  },
  {
    match: 'Molana Anas Younus ملحد کو چپ کروا دیا',
    title: 'Responding to Modern Atheism',
    speaker: 'Molana Anas Younus',
    topic: 'dawah',
  },
  {
    match: "⚠️ DO NOT WASTE THIS RAMADAN 2025",
    title: 'Do Not Waste This Ramadan',
    speaker: 'Other',
    topic: 'ramadan',
  },
  {
    match: 'Qur\'an + AI- Grounded, Not Guesswork',
    title: "Qur'an + AI: Grounded, Not Guesswork",
    speaker: 'Other',
    topic: 'technology',
  },
  {
    match: 'muadhibnjabal-20250214-Friday',
    title: 'Friday Khutbah — Muadh ibn Jabal',
    speaker: 'Other',
    topic: 'khutbah',
  },
  // ── I Experienced Hajj ──────────────────────────────────────────────────
  {
    match: "I Experienced Hajj",
    title: "I Experienced Hajj's Life-Changing Spiritual Journey",
    speaker: 'Other',
    topic: 'hajj',
  },
]

async function seedTalks() {
  console.log('Fetching existing tracks from Firestore...')
  const snapshot = await getDocs(collection(db, 'tracks'))
  const existingTitles = new Set()
  snapshot.forEach((d) => {
    const data = d.data()
    if (data.category === 'talks') {
      existingTitles.add(data.title.toLowerCase())
    }
  })
  console.log(`Found ${existingTitles.size} existing talks in Firestore.\n`)

  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const talk of TALKS) {
    const titleKey = talk.title.toLowerCase()

    if (existingTitles.has(titleKey)) {
      console.log(`  ↷ Skipping "${talk.title}" — already exists`)
      skipped++
      continue
    }

    const filePath = findFile(talk.match)
    if (!filePath) {
      console.warn(`  ✗ File not found for match: "${talk.match}"`)
      failed++
      continue
    }

    try {
      const buffer = readFileSync(filePath)
      const fileName = basename(filePath)
      const mimeType = fileName.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg'
      const blob = new Blob([buffer], { type: mimeType })

      const id = randomUUID()
      const safeFileName = fileName.replace(/[^\w\-_.]/g, '_').replace(/_+/g, '_')
      const storagePath = `audio/${id}-${safeFileName}`
      const storageRef = ref(storage, storagePath)

      process.stdout.write(`  ↑ Uploading "${talk.title}" by ${talk.speaker}...`)
      const snap = await uploadBytes(storageRef, blob)
      const audioUrl = await getDownloadURL(snap.ref)

      const track = {
        id,
        title: talk.title,
        category: 'talks',
        reciter: talk.speaker,
        topic: talk.topic,
        fileName,
        fileSize: buffer.length,
        mimeType,
        uploadedAt: Date.now(),
        audioUrl,
        views: 0,
      }

      await setDoc(doc(db, 'tracks', id), track)
      console.log(' ✓')
      uploaded++
      existingTitles.add(titleKey)
    } catch (err) {
      console.log(` ✗ ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone! Uploaded: ${uploaded} | Skipped: ${skipped} | Failed: ${failed}`)
}

seedTalks().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
