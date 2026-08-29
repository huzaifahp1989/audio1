/**
 * Restore Urdu nasheeds that were deleted
 * Run with: node scripts/restore-urdu-nasheeds.mjs
 */

import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFirestore, collection, getDocs, setDoc, updateDoc, doc } from 'firebase/firestore'
import { readFileSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { basename } from 'path'

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
const DRY_RUN = process.argv.includes('--dry-run')
const BACKFILL = process.argv.includes('--backfill-language')

function canonicalTitle(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// All Urdu nasheeds to restore from local Music directory
const URDU_NASHEEDS = [
  // ── Zaheer Usmani ─────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\New Naat - Qalbi Fil Madinah - Zaheer Usmani - New Naat Sharif 2025 - hajj naat 2025.mp3`,
    title: 'Qalbi Fil Madinah (Urdu)',
    artist: 'Zaheer Usmani',
  },
  {
    file: `${MUSIC_DIR}\\new naat 2024 - Huroof e Tahajhi naat-Her laffz Teri tareef kare-Zaheer Usmani - New Naat.mp3`,
    title: 'Huroof e Tahajhi',
    artist: 'Zaheer Usmani',
  },
  {
    file: `${MUSIC_DIR}\\New Naat 2024 - Kar Rah Hun Roz e Janam Se - Intezar e Madina - Zaheer Usmani - Nasheed Club.mp3`,
    title: 'Kar Rah Hun Roz e Janam Se',
    artist: 'Zaheer Usmani',
  },
  {
    file: `${MUSIC_DIR}\\Beautiful & Heart Touching Hamd - Ye Barish Ke Mosam - Zaheer Usmani - Relaxing Nasheed.mp3`,
    title: 'Ye Barish Ke Mosam',
    artist: 'Zaheer Usmani',
  },
  // ── Qazi Amanullah ────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\New Naat Sharif - Hasrat-e-Didar-Madina - Tamanna He Shehro ka Sardar Dekhun - Hafiz AmanUllah Qazi.mp3`,
    title: 'Hasrat-e-Didar-Madina',
    artist: 'Qazi Amanullah',
  },
  {
    file: `${MUSIC_DIR}\\Rab Ko Dekha He mere Nabi Ne - New Beautiful Naat Shareef - Hafiz AmanUllah Qaz 2024.mp3`,
    title: 'Rab Ko Dekha He Mere Nabi Ne',
    artist: 'Qazi Amanullah',
  },
  // ── Hafiz Rahat Khan ──────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\Assalam Assalam -- Heart Touching Naat -- Hafiz Rahat Khan -- Beautiful Voice.mp3`,
    title: 'Assalam Assalam',
    artist: 'Hafiz Rahat Khan',
  },
  // ── Qari Shadab Badar ─────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\Nasheed 2025 - Allah Tujhse Mera Rishta Imani - Qari Shadab Badar - New Naat.mp3`,
    title: 'Allah Tujhse Mera Rishta Imani',
    artist: 'Qari Shadab Badar',
  },
  // ── Junaid Jamshed ────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\Junaid Jamshed Heart Touching Naat - Ilahi Teri Chaukhat Per - Official Video - Tauheed Islamic(1).m4a`,
    title: 'Ilahi Teri Chaukhat Per',
    artist: 'Junaid Jamshed',
  },
  {
    file: `${MUSIC_DIR}\\MERA DIL BADAL DE - JUNAID JAMSHED - OFFICIAL HD VIDEO - HI-TECH ISLAMIC - BEAUTIFUL NAAT(1).m4a`,
    title: 'Mera Dil Badal De',
    artist: 'Junaid Jamshed',
  },
  // ── Hafiz Abubakr ─────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\Heart Touching Hajj Naat- Kaba Dekhun Ga - Hafiz Jalabeeb Qadri Nasheed Club - Peace Studio.mp3`,
    title: 'Kaba Dekhun Ga',
    artist: 'Hafiz Abubakr',
  },
  // ── Qari Anas Younus ──────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\AnasYounus -Nabi G Ka Gaon - Anas Younus Naat 2025 - Beautiful Islamic Naat by Anas Younus(1).m4a`,
    title: 'Nabi G Ka Gaon',
    artist: 'Qari Anas Younus',
  },
  {
    file: `${MUSIC_DIR}\\Anas Younus - Ya Man Salaita Bikullil Anbiya-Anas Younus -https---youtu.be-PnwuRIybpQ8(1).m4a`,
    title: 'Ya Man Salaita Bikullil Anbiya',
    artist: 'Qari Anas Younus',
  },
  {
    file: `${MUSIC_DIR}\\Anas Younus Naat - Durood Shareef - New Heart Touching Naat 2026 - Beautiful Islamic Naat(1).m4a`,
    title: 'Durood Shareef',
    artist: 'Qari Anas Younus',
  },
  // ── Jalalees Officials ─────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\New Heart Touching Beautiful Naat - Agar Wo Na Aate - Jalalees officials.mp3`,
    title: 'Agar Wo Na Aate',
    artist: 'Jalalees Officials',
  },
]

async function restoreUrdu() {
  console.log('Fetching existing tracks from Firestore...')
  const snapshot = await getDocs(collection(db, 'tracks'))
  const existingTitles = new Set()
  const existingDocs = new Map()
  snapshot.forEach((d) => {
    const data = d.data()
    if (data.category === 'nasheeds') {
      const titleKey = canonicalTitle(String(data.title || ''))
      existingTitles.add(titleKey)
      existingDocs.set(titleKey, d.id)
    }
  })
  console.log(`Found ${existingTitles.size} existing nasheeds in Firestore.\n`)

  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const nasheed of URDU_NASHEEDS) {
    const titleKey = canonicalTitle(nasheed.title)

    if (existingTitles.has(titleKey)) {
      if (BACKFILL) {
        await updateDoc(doc(db, 'tracks', existingDocs.get(titleKey)), { language: 'urdu' })
        console.log(`  ✓ Marked "${nasheed.title}" as Urdu`)
        skipped++
        continue
      }
      console.log(`  ↷ Skipping "${nasheed.title}" — already exists`)
      skipped++
      continue
    }

    if (!existsSync(nasheed.file)) {
      console.warn(`  ✗ File not found: ${nasheed.file}`)
      failed++
      continue
    }

    if (DRY_RUN) {
      console.log(`  • Missing candidate: "${nasheed.title}" by ${nasheed.artist}`)
      skipped++
      continue
    }

    try {
      const buffer = readFileSync(nasheed.file)
      const fileName = basename(nasheed.file)
      const mimeType = fileName.endsWith('.m4a') ? 'audio/mp4' : 'audio/mpeg'
      const blob = new Blob([buffer], { type: mimeType })

      const id = randomUUID()
      const storagePath = `audio/${id}-${fileName}`
      const storageRef = ref(storage, storagePath)

      process.stdout.write(`  ↑ Uploading "${nasheed.title}" by ${nasheed.artist}...`)
      const snap = await uploadBytes(storageRef, blob)
      const audioUrl = await getDownloadURL(snap.ref)

      const track = {
        id,
        title: nasheed.title,
        category: 'nasheeds',
        reciter: nasheed.artist,
        language: 'urdu',
        fileName,
        fileSize: buffer.length,
        mimeType,
        uploadedAt: Date.now(),
        audioUrl,
        views: 0,
      }

      await setDoc(doc(db, 'tracks', id), track)
      console.log(` ✓`)
      uploaded++
      existingTitles.add(titleKey)
    } catch (err) {
      console.log(` ✗ ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone! Uploaded: ${uploaded} | Skipped: ${skipped} | Failed: ${failed}`)
}

restoreUrdu().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
