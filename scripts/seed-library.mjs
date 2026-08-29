/**
 * Seed Quran + extra nasheeds/talks from C:\Users\huzai\Music into Firebase (audio-68d1f).
 * Run: node scripts/seed-library.mjs
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
const allFiles = readdirSync(MUSIC_DIR, { encoding: 'utf8' })

function findFile(partial) {
  const match = allFiles.find((f) => f.includes(partial))
  if (!match) return null
  return join(MUSIC_DIR, match)
}

/** @type {{ match: string, title: string, reciter: string, category: string, topic?: string }[]} */
const TRACKS = [
  // ── Quran ───────────────────────────────────────────────────────────────
  {
    match: '50 Minutes Juz amma Compilation for kids -Mishary Rashid Alafasy',
    title: 'Juz Amma Compilation (Kids)',
    reciter: 'Mishary Rashid Alafasy',
    category: 'quran',
  },
  {
    match: 'Juz 30 Full - Ramadan Recitation - Sheikh Hani Ar Rifai',
    title: 'Juz 30 Full (Ramadan Recitation)',
    reciter: 'Hani Ar-Rifai',
    category: 'quran',
  },
  {
    match: 'Juz Amma Full',
    title: 'Juz Amma Full',
    reciter: 'Other',
    category: 'quran',
  },
  {
    match: 'Surat 078 An-Naba',
    title: "Surah An-Naba' (078) — Learn for Children",
    reciter: 'Other',
    category: 'quran',
  },
  {
    match: 'Surat 079 An-Nazi',
    title: "Surah An-Nazi'at (079) — Learn for Children",
    reciter: 'Other',
    category: 'quran',
  },
  {
    match: "Surat 080 'Abasa",
    title: "Surah 'Abasa (080) — Learn for Children",
    reciter: 'Other',
    category: 'quran',
  },
  {
    match: 'Surat 081 At-Takwir',
    title: 'Surah At-Takwir (081) — Learn for Children',
    reciter: 'Other',
    category: 'quran',
  },
  {
    match: 'Surat 082 Al-Infitar',
    title: 'Surah Al-Infitar (082) — Learn for Children',
    reciter: 'Other',
    category: 'quran',
  },
  {
    match: 'Surat 083 At-Tatfif',
    title: 'Surah Al-Mutaffifin (083) — Learn for Children',
    reciter: 'Other',
    category: 'quran',
  },
  {
    match: 'Surat 084 Al-Inshiqaq',
    title: 'Surah Al-Inshiqaq (084) — Learn for Children',
    reciter: 'Other',
    category: 'quran',
  },
  {
    match: 'Surat 085 Al-Buruj',
    title: 'Surah Al-Buruj (085) — Learn for Children',
    reciter: 'Other',
    category: 'quran',
  },
  {
    match: 'Surah Yaseen',
    title: 'Surah Yaseen (Yasin)',
    reciter: 'Other',
    category: 'quran',
  },
  {
    match: 'Surah Al Mulk',
    title: 'Surah Al-Mulk',
    reciter: 'Other',
    category: 'quran',
  },
  {
    match: 'Surah Ar-Rahman',
    title: 'Surah Ar-Rahman',
    reciter: 'Other',
    category: 'quran',
  },
  {
    match: 'Surah (naba) ABDULLAH Ahmad',
    title: "Surah An-Naba' — Abdullah Ahmad",
    reciter: 'Other',
    category: 'quran',
  },
  {
    match: 'Surah Al-Mutaffifin',
    title: 'Surah Al-Mutaffifin (083) — Maryam Masud',
    reciter: 'Maryam Masud',
    category: 'quran',
  },
  {
    match: 'Surah Al-Tariq',
    title: 'Surah At-Tariq (086) — Maryam Masud',
    reciter: 'Maryam Masud',
    category: 'quran',
  },
  {
    match: 'Surah An-Naba (# 78) by Maryam Masud',
    title: "Surah An-Naba' (078) — Maryam Masud",
    reciter: 'Maryam Masud',
    category: 'quran',
  },

  // ── Extra nasheeds (if not already seeded) ──────────────────────────────
  {
    match: 'Do you mock Muhammad',
    title: 'Do You Mock Muhammad? — Poem by Hassan bin Thabit',
    reciter: 'Other',
    category: 'nasheeds',
  },
  {
    match: 'Eid-Takbeer in 30 minute',
    title: 'Eid Takbeer (30 Minutes)',
    reciter: 'Other',
    category: 'nasheeds',
  },
  {
    match: 'Dalaail-ul-khayraat',
    title: 'Dalaail-ul-Khayraat (Monday)',
    reciter: 'Other',
    category: 'nasheeds',
  },

  // ── Extra talks ─────────────────────────────────────────────────────────
  {
    match: 'Amazing Creation of Camel',
    title: 'The Amazing Creation of the Camel',
    reciter: 'Molana Tariq Jameel',
    category: 'talks',
    topic: 'aqeedah',
  },
  {
    match: 'Biggest Illusion of Life',
    title: 'The Biggest Illusion of Life',
    reciter: 'Molana Tariq Jameel',
    category: 'talks',
    topic: 'spirituality',
  },
  {
    match: 'True Status of Women in Islam',
    title: 'The True Status of Women in Islam',
    reciter: 'Molana Tariq Jameel',
    category: 'talks',
    topic: 'social',
  },
  {
    match: 'Results Require Routine',
    title: 'Results Require Routine',
    reciter: 'Sheikh Sulaiman Moola',
    category: 'talks',
    topic: 'youth',
  },
  {
    match: 'Seek Forgiveness From Those You Have Wronged',
    title: 'Seek Forgiveness From Those You Have Wronged',
    reciter: 'Sheikh Sulaiman Moola',
    category: 'talks',
    topic: 'repentance',
  },
  {
    match: 'Mindset The Prophet',
    title: 'The Mindset to Get Rid of Ego and Pride',
    reciter: 'Hisham Abu Yusuf',
    category: 'talks',
    topic: 'spirituality',
  },
  {
    match: 'Why Social Media Is Destroying Your Discipline',
    title: 'Why Social Media Is Destroying Your Discipline',
    reciter: 'Hisham Abu Yusuf',
    category: 'talks',
    topic: 'youth',
  },
  {
    match: "Addicted to Scrolling",
    title: "Why You're Addicted to Scrolling but Bored of the Quran",
    reciter: 'Hisham Abu Yusuf',
    category: 'talks',
    topic: 'youth',
  },
  {
    match: 'muadhibnjabal-20250214-Friday',
    title: 'Friday Khutbah — Muadh ibn Jabal',
    reciter: 'Other',
    category: 'talks',
    topic: 'spirituality',
  },
]

async function seed() {
  console.log('Fetching existing tracks from Firestore (audio-68d1f)...')
  const snapshot = await getDocs(collection(db, 'tracks'))
  const existingByCategory = new Map()

  snapshot.forEach((d) => {
    const data = d.data()
    const cat = data.category || 'unknown'
    const key = `${cat}::${String(data.title || '').toLowerCase()}`
    existingByCategory.set(key, true)
  })
  console.log(`Found ${snapshot.size} existing tracks.\n`)

  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const item of TRACKS) {
    const titleKey = `${item.category}::${item.title.toLowerCase()}`
    if (existingByCategory.has(titleKey)) {
      console.log(`  ↷ Skip [${item.category}] "${item.title}" — already exists`)
      skipped++
      continue
    }

    const filePath = findFile(item.match)
    if (!filePath || !existsSync(filePath)) {
      console.warn(`  ✗ File not found: "${item.match}"`)
      failed++
      continue
    }

    try {
      const buffer = readFileSync(filePath)
      const fileName = basename(filePath)
      const mimeType = fileName.toLowerCase().endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg'
      const blob = new Blob([buffer], { type: mimeType })

      const id = randomUUID()
      const safeFileName = fileName.replace(/[^\w\-_.]/g, '_').replace(/_+/g, '_').slice(0, 80)
      const storagePath = `audio/${id}-${safeFileName}`
      const storageRef = ref(storage, storagePath)

      process.stdout.write(`  ↑ [${item.category}] "${item.title}"...`)
      const snap = await uploadBytes(storageRef, blob)
      const audioUrl = await getDownloadURL(snap.ref)

      const track = {
        id,
        title: item.title,
        category: item.category,
        reciter: item.reciter,
        ...(item.topic ? { topic: item.topic } : {}),
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
      existingByCategory.set(titleKey, true)
    } catch (err) {
      console.log(` ✗ ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone! Uploaded: ${uploaded} | Skipped: ${skipped} | Failed: ${failed}`)
}

seed().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
