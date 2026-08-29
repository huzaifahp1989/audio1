/**
 * Seed script: uploads local nasheed files from C:\Users\huzai\Music to Firebase
 * Run with: node scripts/seed-nasheeds.mjs
 * Requires Node.js 18+ (for built-in fetch and Blob)
 */

import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore'
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

// Curated list of nasheed files with clean metadata
const NASHEEDS = [
  // ── Muad ──────────────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\Muad - Kun Fayakun (Vocals Only).mp3`,
    title: 'Kun Fayakun',
    artist: 'Muad',
  },
  {
    file: `${MUSIC_DIR}\\Muad - No Better Place (Vocals Only).mp3`,
    title: 'No Better Place',
    artist: 'Muad',
  },
  {
    file: `${MUSIC_DIR}\\Muad - Palestine (Vocals Only).mp3`,
    title: 'Palestine',
    artist: 'Muad',
  },
  {
    file: `${MUSIC_DIR}\\Muad - Prophet Muhammad (Vocals Only).mp3`,
    title: 'Prophet Muhammad',
    artist: 'Muad',
  },
  {
    file: `${MUSIC_DIR}\\Muad - Al-Quran (Vocals Only).mp3`,
    title: 'Al-Quran',
    artist: 'Muad',
  },
  {
    file: `${MUSIC_DIR}\\Muad X Firas - Jibreel (Vocals Only).mp3`,
    title: 'Jibreel',
    artist: 'Muad',
  },
  {
    file: `${MUSIC_DIR}\\Muad X Firas - Tala'al Badru (Vocals Only).mp3`,
    title: "Tala'al Badru",
    artist: 'Muad',
  },
  {
    file: `${MUSIC_DIR}\\Muad X Musa - Superhero II (Vocals Only).mp3`,
    title: 'Superhero II',
    artist: 'Muad',
  },
  {
    file: `${MUSIC_DIR}\\Muad X Musa X Ebraheem - Reach For The Stars (Vocals Only).mp3`,
    title: 'Reach For The Stars',
    artist: 'Muad',
  },
  {
    file: `${MUSIC_DIR}\\Muad X Ebraheem - Lord You're With Me (Vocals Only) - Official Music Video.mp3`,
    title: "Lord You're With Me",
    artist: 'Muad',
  },
  {
    file: `${MUSIC_DIR}\\Ebraheem X Muad X Musa - Unbreakable (Vocals Only).mp3`,
    title: 'Unbreakable',
    artist: 'Muad',
  },
  {
    file: `${MUSIC_DIR}\\'Ya Aqsa' by Muad (Vocals Only) - Lyric video - -PALESTINE NASHEED-.mp3`,
    title: 'Ya Aqsa',
    artist: 'Muad',
  },
  {
    file: `${MUSIC_DIR}\\Jannah - Voice-Only - Muad feat. Zain Bhikha.mp3`,
    title: 'Jannah',
    artist: 'Muad',
  },
  // ── Maher Zain ────────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\(Official) MV BISMILLAH (2013 Edition - ENGLISH).mp3`,
    title: 'Bismillah',
    artist: 'Maher Zain',
  },
  {
    file: `${MUSIC_DIR}\\Maher Zain & Harris J - Qalbi Fil Madinah (Vocals Only) - قلبي في المدينة (بدون موسيقى).mp3`,
    title: 'Qalbi Fil Madinah',
    artist: 'Maher Zain',
  },
  // ── Zain Bhikha ───────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\Allah Made Everything - Lyric Video - Zain Bhikha feat. Zain Bhikha Kids.mp3`,
    title: 'Allah Made Everything',
    artist: 'Zain Bhikha',
  },
  // ── Ahmed Bukhatir ────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\Qurani I Ahmed Bukhatir قرآني - أحمد بوخاطر.mp3`,
    title: 'Qurani',
    artist: 'Ahmed Bukhatir',
  },
  // ── Humood ────────────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\Humood - Falasteen Biladi - حمود الخضر - فلسطين بلادي.mp3`,
    title: 'Falasteen Biladi',
    artist: 'Humood',
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
  // ── Qari Anas Younus ──────────────────────────────────────────────────────
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
  {
    file: `${MUSIC_DIR}\\AnasYounus -Nabi G Ka Gaon - Anas Younus Naat 2025 - Beautiful Islamic Naat by Anas Younus(1).m4a`,
    title: 'Nabi G Ka Gaon',
    artist: 'Qari Anas Younus',
  },
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
  // ── Ahmed Rajel ───────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\[100% Copyright FREE] Allahu Allahu Nasheed╏Covered by Ahmed Rajel╏Vocals Only╏Islamic Audio Lib.mp3`,
    title: 'Allahu Allahu',
    artist: 'Ahmed Rajel',
  },
  // ── Kamal Uddin ───────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\lyric - 99 names of Allah by kamal uddin.mp3`,
    title: '99 Names of Allah',
    artist: 'Kamal Uddin',
  },
  // ── Amin Davis ────────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\In My Dreams - Amin Davis feat. Ilyas Mao x Faisal Salah - (Official Nasheed Video) - Vocals Onl.mp3`,
    title: 'In My Dreams',
    artist: 'Amin Davis',
  },
  // ── Hafiz Abubakr ─────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\Heart Touching Hajj Naat- Kaba Dekhun Ga - Hafiz Jalabeeb Qadri Nasheed Club - Peace Studio.mp3`,
    title: 'Kaba Dekhun Ga',
    artist: 'Hafiz Abubakr',
  },
  // ── Other/Various ─────────────────────────────────────────────────────────
  {
    file: `${MUSIC_DIR}\\#Palestine Nasheed - La Tubali Ya Gaza.mp3`,
    title: 'La Tubali Ya Gaza',
    artist: 'Other',
  },
  {
    file: `${MUSIC_DIR}\\Palestine Nasheeds - Music Free Nasheeds.mp3`,
    title: 'Palestine Nasheeds',
    artist: 'Other',
  },
  {
    file: `${MUSIC_DIR}\\All New #Palestine Nasheeds (2023).mp3`,
    title: 'All New Palestine Nasheeds',
    artist: 'Other',
  },
  {
    file: `${MUSIC_DIR}\\يا أقصى – Gaza & Al Aqsa Emotional Nasheed 2025 - نشيد مؤثر عن فلسطين.mp3`,
    title: 'Ya Aqsa (Gaza & Al Aqsa)',
    artist: 'Other',
  },
  {
    file: `${MUSIC_DIR}\\100%-COPYRIGHT FREE background nasheed-Music [ Astaghfirullah~ Hammings Only ] Islamic Audio Lib.mp3`,
    title: 'Astaghfirullah (Humming Only)',
    artist: 'Other',
  },
  {
    file: `${MUSIC_DIR}\\100%-COPYRIGHT FREE [ Sad background Nasheed-Music ] [ Vocals Only, Humming ] Islamic Audio Libr.mp3`,
    title: 'Sad Background Nasheed (Vocals Only)',
    artist: 'Other',
  },
  {
    file: `${MUSIC_DIR}\\Laytaka Ma'ana (cover) - أحمد مصبح - ليتك معنا - AHMED MUSABEH🇵🇸 لأجل غـــزة.mp3`,
    title: "Laytaka Ma'ana",
    artist: 'Other',
  },
  {
    file: `${MUSIC_DIR}\\Hasbi Rabbi Jallallah - Islamic Poem for Kids - Heart-touching Kalma Nasheed.mp3`,
    title: 'Hasbi Rabbi Jallallah',
    artist: 'Other',
  },
  {
    file: `${MUSIC_DIR}\\New Heart Touching Beautiful Naat - Agar Wo Na Aate - Jalalees officials.mp3`,
    title: 'Agar Wo Na Aate',
    artist: 'Jalalees Officials',
  },
  {
    file: `${MUSIC_DIR}\\[100% Copyright FREE] Shaib Alie ft Oneness of Islam - People like you (Vocals only).mp3`,
    title: 'People Like You',
    artist: 'Other',
  },
  {
    file: `${MUSIC_DIR}\\Islamic is my way! (Vocals Only) No Copyright Nasheed Islamic Audio Library.mp3`,
    title: 'Islamic Is My Way',
    artist: 'Other',
  },
  {
    file: `${MUSIC_DIR}\\Busy Bees Counting Song - Kids (Nasheed) - Vocals Only - Muslim Version - @supermuslimkids.mp3`,
    title: 'Busy Bees Counting Song',
    artist: 'Super Muslim Kids',
  },
  {
    file: `${MUSIC_DIR}\\Nursery Rhymes Collection Vol 1 - Kids Song (Nasheed) - Vocals Only - 10 Songs - Compilation.mp3`,
    title: 'Nursery Rhymes Collection Vol 1',
    artist: 'Super Muslim Kids',
  },
  {
    file: `${MUSIC_DIR}\\Everything Belongs to Allah - Omar and Hana - Official Video.mp3`,
    title: 'Everything Belongs to Allah',
    artist: 'Omar and Hana',
  },
]

async function seedNasheeds() {
  console.log('Fetching existing tracks from Firestore...')
  const snapshot = await getDocs(collection(db, 'tracks'))
  const existingTitles = new Set()
  snapshot.forEach((d) => {
    const data = d.data()
    if (data.category === 'nasheeds') {
      existingTitles.add(data.title.toLowerCase())
    }
  })
  console.log(`Found ${existingTitles.size} existing nasheeds in Firestore.\n`)

  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const nasheed of NASHEEDS) {
    const titleKey = nasheed.title.toLowerCase()

    if (existingTitles.has(titleKey)) {
      console.log(`  ↷ Skipping "${nasheed.title}" — already exists`)
      skipped++
      continue
    }

    if (!existsSync(nasheed.file)) {
      console.warn(`  ✗ File not found: ${nasheed.file}`)
      failed++
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

seedNasheeds().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
