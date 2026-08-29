/**
 * Seed more Molana Tariq Jameel + Sheikh Sulaiman Moola talks from Archive.org.
 * Run: node scripts/seed-tariq-moola.mjs
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

/** @type {{ archiveId: string, file: string, title: string, reciter: string, topic: string }[]} */
const ITEMS = [
  // ── Molana Tariq Jameel (2008–09 bayans) ────────────────────────────────
  {
    archiveId: 'TariqJamilsYear2008-09Bayanats',
    file: 'KHUSHGAWAR AZDAWAJI ZINDAGI.mp3',
    title: 'Khushgawar Azdawaji Zindagi (Happy Married Life)',
    reciter: 'Molana Tariq Jameel',
    topic: 'family',
  },
  {
    archiveId: 'TariqJamilsYear2008-09Bayanats',
    file: 'myry nbi (PBUH) ky ikhlak.mp3',
    title: 'Mere Nabi ﷺ Ke Ikhlaq',
    reciter: 'Molana Tariq Jameel',
    topic: 'seerah',
  },
  {
    archiveId: 'TariqJamilsYear2008-09Bayanats',
    file: 'FAZAILE NAMAZ AUR IKHLAQ.mp3',
    title: 'Fazail-e-Namaz Aur Ikhlaq',
    reciter: 'Molana Tariq Jameel',
    topic: 'spirituality',
  },
  {
    archiveId: 'TariqJamilsYear2008-09Bayanats',
    file: 'IMAAN AUR HAYA.mp3',
    title: 'Imaan Aur Haya',
    reciter: 'Molana Tariq Jameel',
    topic: 'aqeedah',
  },
  {
    archiveId: 'TariqJamilsYear2008-09Bayanats',
    file: 'ALLAH KI NARAZGI KI NISHANIYAN.mp3',
    title: 'Allah Ki Narazgi Ki Nishaniyan',
    reciter: 'Molana Tariq Jameel',
    topic: 'repentance',
  },
  {
    archiveId: 'TariqJamilsYear2008-09Bayanats',
    file: 'DEEN AUR DUNYA KI CHAHAT.mp3',
    title: 'Deen Aur Dunya Ki Chahat',
    reciter: 'Molana Tariq Jameel',
    topic: 'spirituality',
  },
  {
    archiveId: 'TariqJamilsYear2008-09Bayanats',
    file: 'SILA REHMI.mp3',
    title: 'Sila Rahmi (Keeping Family Ties)',
    reciter: 'Molana Tariq Jameel',
    topic: 'family',
  },
  {
    archiveId: 'TariqJamilsYear2008-09Bayanats',
    file: 'Naik Amal Ka Sila.mp3',
    title: 'Naik Amal Ka Sila',
    reciter: 'Molana Tariq Jameel',
    topic: 'spirituality',
  },
  {
    archiveId: 'TariqJamilsYear2008-09Bayanats',
    file: 'insan ki zindagi ka mqsd.mp3',
    title: 'Insan Ki Zindagi Ka Maqsad',
    reciter: 'Molana Tariq Jameel',
    topic: 'aqeedah',
  },
  {
    archiveId: 'TariqJamilsYear2008-09Bayanats',
    file: 'AZEEM RAHBAR.mp3',
    title: 'Azeem Rahbar (The Great Leader)',
    reciter: 'Molana Tariq Jameel',
    topic: 'seerah',
  },
  {
    archiveId: 'TariqJamilsYear2008-09Bayanats',
    file: 'NA FARMANI KI SAZA.mp3',
    title: 'Nafarmani Ki Saza',
    reciter: 'Molana Tariq Jameel',
    topic: 'repentance',
  },
  {
    archiveId: 'TariqJamilsYear2008-09Bayanats',
    file: 'ARSH KA SAYA.mp3',
    title: 'Arsh Ka Saya',
    reciter: 'Molana Tariq Jameel',
    topic: 'hereafter',
  },
  {
    archiveId: 'MastratManBayanByMaulanaTariqJameel',
    file: 'MasturatMainBiyan.mp3',
    title: 'Masturat Bayan',
    reciter: 'Molana Tariq Jameel',
    topic: 'family',
  },

  // ── Sheikh Sulaiman Moola ───────────────────────────────────────────────
  {
    archiveId: '3GoldenAdvices',
    file: '3 Golden Advices.mp3',
    title: '3 Golden Advices',
    reciter: 'Sheikh Sulaiman Moola',
    topic: 'spirituality',
  },
  {
    archiveId: '3GoldenAdvices',
    file: 'HowToCureYourDepression.mp3',
    title: 'How To Cure Your Depression',
    reciter: 'Sheikh Sulaiman Moola',
    topic: 'youth',
  },
  {
    archiveId: '3GoldenAdvices',
    file: 'ConcentrateInSalahAndBeSuccessful.mp3',
    title: 'Concentrate In Salah And Be Successful',
    reciter: 'Sheikh Sulaiman Moola',
    topic: 'spirituality',
  },
  {
    archiveId: '3GoldenAdvices',
    file: 'DepressionVsContentment.mp3',
    title: 'Depression vs Contentment',
    reciter: 'Sheikh Sulaiman Moola',
    topic: 'youth',
  },
  {
    archiveId: '3GoldenAdvices',
    file: 'AGoodMarriage.mp3',
    title: 'A Good Marriage',
    reciter: 'Sheikh Sulaiman Moola',
    topic: 'family',
  },
  {
    archiveId: '3GoldenAdvices',
    file: 'AMessageToMuslimYouth.mp3',
    title: 'A Message To Muslim Youth',
    reciter: 'Sheikh Sulaiman Moola',
    topic: 'youth',
  },
  {
    archiveId: '3GoldenAdvices',
    file: 'BenefitsOfSayingInshallah.mp3',
    title: 'Benefits Of Saying InshaAllah',
    reciter: 'Sheikh Sulaiman Moola',
    topic: 'spirituality',
  },
  {
    archiveId: '3GoldenAdvices',
    file: 'ConsistencyInAamal.mp3',
    title: 'Consistency In Aamal',
    reciter: 'Sheikh Sulaiman Moola',
    topic: 'spirituality',
  },
  {
    archiveId: '3GoldenAdvices',
    file: 'DutyOfABeliever.mp3',
    title: 'Duty Of A Believer',
    reciter: 'Sheikh Sulaiman Moola',
    topic: 'general',
  },
  {
    archiveId: '3GoldenAdvices',
    file: 'FastingAndTaqwa.mp3',
    title: 'Fasting And Taqwa',
    reciter: 'Sheikh Sulaiman Moola',
    topic: 'ramadan',
  },
  {
    archiveId: '3GoldenAdvices',
    file: 'NabisSawLastsWords.mp3',
    title: "Nabi ﷺ's Last Words",
    reciter: 'Sheikh Sulaiman Moola',
    topic: 'seerah',
  },
  {
    archiveId: '3GoldenAdvices',
    file: 'EchoesFromTheCavePart1.mp3',
    title: 'Echoes From The Cave (Part 1)',
    reciter: 'Sheikh Sulaiman Moola',
    topic: 'tafsir',
  },
  {
    archiveId: '3GoldenAdvices',
    file: 'EchoesFromTheCavePart2.mp3',
    title: 'Echoes From The Cave (Part 2)',
    reciter: 'Sheikh Sulaiman Moola',
    topic: 'tafsir',
  },
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
  console.log('Fetching existing talks...')
  const snapshot = await getDocs(collection(db, 'tracks'))
  const existing = new Set()
  snapshot.forEach((d) => {
    const data = d.data()
    if (data.category === 'talks') {
      existing.add(String(data.title || '').toLowerCase())
    }
  })
  console.log(`Existing talks: ${existing.size}\n`)

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
      process.stdout.write(`  ↓ "${item.title}"...`)
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
        category: 'talks',
        reciter: item.reciter,
        topic: item.topic,
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
