/**
 * Download free nasheeds & talks from Internet Archive and seed into Firebase.
 * Sources: CC0 / publicly hosted Archive.org collections.
 * Run: node scripts/seed-online.mjs
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

/** @type {{ archiveId: string, file: string, title: string, category: string, reciter: string, topic?: string }[]} */
const ITEMS = [
  // ── Nasheeds (Background Nasheed Library — CC0 on Archive.org) ──────────
  {
    archiveId: 'background-nasheed-1',
    file: 'Alhamdulillah Nasheed.mp3',
    title: 'Alhamdulillah',
    category: 'nasheeds',
    reciter: 'Other',
  },
  {
    archiveId: 'background-nasheed-1',
    file: 'Ya Hala Marhaba (online-audio-converter.com).mp3',
    title: 'Ya Hala Marhaba',
    category: 'nasheeds',
    reciter: 'Other',
  },
  {
    archiveId: 'background-nasheed-1',
    file: 'Alyawm Kaleid (Today is like Eid).mp3',
    title: 'Alyawm Kaleid (Today Is Like Eid)',
    category: 'nasheeds',
    reciter: 'Other',
  },
  {
    archiveId: 'background-nasheed-1',
    file: 'MOHAMED ABSOLUTION - AMANTU BILLAH  (Isolated Vocal Only).mp3',
    title: 'Amantu Billah',
    category: 'nasheeds',
    reciter: 'Mohamed Absolution',
  },
  {
    archiveId: 'background-nasheed-1',
    file: 'HazzibFuwadakaBilHaya.mp3',
    title: 'Hazzib Fuwadaka Bil Haya',
    category: 'nasheeds',
    reciter: 'Other',
  },
  {
    archiveId: 'background-nasheed-1',
    file: 'Ummat al-Islami Bushra (online-audio-converter.com).mp3',
    title: 'Ummat al-Islami Bushra',
    category: 'nasheeds',
    reciter: 'Other',
  },
  {
    archiveId: 'background-nasheed-1',
    file: 'Walidduna (online-audio-converter.com).mp3',
    title: 'Walidduna',
    category: 'nasheeds',
    reciter: 'Other',
  },
  {
    archiveId: 'background-nasheed-1',
    file: 'Qad Udna (Here we come back to you).mp3',
    title: 'Qad Udna (Here We Come Back to You)',
    category: 'nasheeds',
    reciter: 'Other',
  },

  // ── Talks — Bilal Philips ───────────────────────────────────────────────
  {
    archiveId: 'BillalPhilipsJahiliyyahAtTheEndOfThe20thCentury',
    file: 'Bilal Philips - How To Be A Better Muslim 1of2.mp3',
    title: 'How To Be A Better Muslim (Part 1)',
    category: 'talks',
    reciter: 'Bilal Philips',
    topic: 'spirituality',
  },
  {
    archiveId: 'BillalPhilipsJahiliyyahAtTheEndOfThe20thCentury',
    file: 'Bilal Philips - How To Be A Better Muslim 2of2.mp3',
    title: 'How To Be A Better Muslim (Part 2)',
    category: 'talks',
    reciter: 'Bilal Philips',
    topic: 'spirituality',
  },
  {
    archiveId: 'BillalPhilipsJahiliyyahAtTheEndOfThe20thCentury',
    file: 'Bilal Philips - My Way To Islam 1of2.mp3',
    title: 'My Way To Islam (Part 1)',
    category: 'talks',
    reciter: 'Bilal Philips',
    topic: 'aqeedah',
  },
  {
    archiveId: 'BillalPhilipsJahiliyyahAtTheEndOfThe20thCentury',
    file: 'Bilal Philips - Explaining The Quran 1of2.mp3',
    title: 'Explaining The Quran (Part 1)',
    category: 'talks',
    reciter: 'Bilal Philips',
    topic: 'tafsir',
  },
  {
    archiveId: 'BillalPhilipsJahiliyyahAtTheEndOfThe20thCentury',
    file: 'Bilal Philips - Avoiding The Forbidden 1of2.mp3',
    title: 'Avoiding The Forbidden (Part 1)',
    category: 'talks',
    reciter: 'Bilal Philips',
    topic: 'fiqh',
  },
  {
    archiveId: 'BillalPhilipsJahiliyyahAtTheEndOfThe20thCentury',
    file: 'Bilal Philips  - The Rights of Non-Muslims and Our Responsibility Towards Them.mp3',
    title: 'The Rights of Non-Muslims',
    category: 'talks',
    reciter: 'Bilal Philips',
    topic: 'social',
  },
  {
    archiveId: 'BillalPhilipsJahiliyyahAtTheEndOfThe20thCentury',
    file: 'Billal Philips - The True Religion Of God 1of2.mp3',
    title: 'The True Religion Of God (Part 1)',
    category: 'talks',
    reciter: 'Bilal Philips',
    topic: 'aqeedah',
  },
  {
    archiveId: 'RenewingOurIntentions',
    file: '7HabitsOfRaisingRighteousChildrenPart1.ogg',
    title: '7 Habits of Raising Righteous Children (Part 1)',
    category: 'talks',
    reciter: 'Bilal Philips',
    topic: 'family',
  },
  {
    archiveId: 'RenewingOurIntentions',
    file: '7HabitsOfRaisingRighteousChildrenPart2.ogg',
    title: '7 Habits of Raising Righteous Children (Part 2)',
    category: 'talks',
    reciter: 'Bilal Philips',
    topic: 'family',
  },
  {
    archiveId: 'RenewingOurIntentions',
    file: '23September2011BenefitOfAdheringToTheQuranAndTheSunnah.ogg',
    title: 'The Benefit of Adhering to the Quran and Sunnah',
    category: 'talks',
    reciter: 'Bilal Philips',
    topic: 'tafsir',
  },
  {
    archiveId: 'RenewingOurIntentions',
    file: '30March2012TheTrueStoryOfDajjal.ogg',
    title: 'The True Story of Dajjal (Part 1)',
    category: 'talks',
    reciter: 'Bilal Philips',
    topic: 'hereafter',
  },
  {
    archiveId: 'RenewingOurIntentions',
    file: '6April2012TheTrueStoryOfDajjal.ogg',
    title: 'The True Story of Dajjal (Part 2)',
    category: 'talks',
    reciter: 'Bilal Philips',
    topic: 'hereafter',
  },
  {
    archiveId: 'AngelsAndJinnsBilalPhilips',
    file: '011. Angels, Jinns and Magic/001. Angels and Jinns/001 Angels and Jinns - Bilal Philips.ogg',
    title: 'Angels and Jinns',
    category: 'talks',
    reciter: 'Bilal Philips',
    topic: 'aqeedah',
  },

  // ── Talks — Yasmin Mogahed ──────────────────────────────────────────────
  {
    archiveId: 'AJourneyToAllah',
    file: 'A Journey To Allah.mp3',
    title: 'A Journey To Allah',
    category: 'talks',
    reciter: 'Yasmin Mogahed',
    topic: 'spirituality',
  },
  {
    archiveId: 'AJourneyToAllah',
    file: 'ReclaimYourHeart01.mp3',
    title: 'Reclaim Your Heart (Part 1)',
    category: 'talks',
    reciter: 'Yasmin Mogahed',
    topic: 'spirituality',
  },
  {
    archiveId: 'AJourneyToAllah',
    file: 'ReclaimYourHeart02.mp3',
    title: 'Reclaim Your Heart (Part 2)',
    category: 'talks',
    reciter: 'Yasmin Mogahed',
    topic: 'spirituality',
  },
  {
    archiveId: 'AJourneyToAllah',
    file: 'ReclaimYourHeart03.mp3',
    title: 'Reclaim Your Heart (Part 3)',
    category: 'talks',
    reciter: 'Yasmin Mogahed',
    topic: 'spirituality',
  },
  {
    archiveId: 'AJourneyToAllah',
    file: 'RefugeInTheMiddleOfTheStorm.mp3',
    title: 'Refuge In The Middle Of The Storm',
    category: 'talks',
    reciter: 'Yasmin Mogahed',
    topic: 'spirituality',
  },
  {
    archiveId: 'AJourneyToAllah',
    file: 'KeepThreeDifferentPartsAfreshToAvoidDepression.mp3',
    title: 'Keep Three Parts Fresh To Avoid Depression',
    category: 'talks',
    reciter: 'Yasmin Mogahed',
    topic: 'youth',
  },
  {
    archiveId: 'PeopleOfQuran-EP01TheCure',
    file: 'PeopleOfQuranEp01TheCure.ogg',
    title: 'People of Quran — The Cure',
    category: 'talks',
    reciter: 'Omar Suleiman',
    topic: 'tafsir',
  },
  {
    archiveId: 'PeopleOfQuran-EP01TheCure',
    file: 'PeopleOfQuranEp02BreakingBottles.ogg',
    title: 'People of Quran — Breaking Bottles',
    category: 'talks',
    reciter: 'Omar Suleiman',
    topic: 'spirituality',
  },
  {
    archiveId: 'PeopleOfQuran-EP01TheCure',
    file: 'PeopleOfQuranEp03UpgradeYourGarden.ogg',
    title: 'People of Quran — Upgrade Your Garden',
    category: 'talks',
    reciter: 'Omar Suleiman',
    topic: 'spirituality',
  },
  {
    archiveId: 'PeopleOfQuran-EP01TheCure',
    file: 'PeopleOfQuranEp04AlmostDivorced.ogg',
    title: 'People of Quran — Almost Divorced',
    category: 'talks',
    reciter: 'Omar Suleiman',
    topic: 'family',
  },
  {
    archiveId: 'nouman-ali-khan-the-mercy-of-allah',
    file: 'nouman-ali-khan-the-mercy-of-allah.mp3',
    title: 'The Mercy of Allah',
    category: 'talks',
    reciter: 'Nouman Ali Khan',
    topic: 'repentance',
  },
  {
    archiveId: 'dr-yasir-qadhi-audio-lectures',
    file: '1 - Importance & Blessings of Knowledge - Fundamentals of Faith - Yasir Qadhi.mp3',
    title: 'Importance and Blessings of Knowledge',
    category: 'talks',
    reciter: 'Yasir Qadhi',
    topic: 'spirituality',
  },
  {
    archiveId: 'dr-yasir-qadhi-audio-lectures',
    file: '10 - The Life of Prophet Muhammad (pbuh) - The First Revelation - Sh. Yasir Qadhi.mp3',
    title: 'The First Revelation',
    category: 'talks',
    reciter: 'Yasir Qadhi',
    topic: 'seerah',
  },
  {
    archiveId: 'dr-yasir-qadhi-audio-lectures',
    file: '12 - Performing Vows, Sacrificing and Seeking Blessings - Fundamentals of Faith - Yasir Qadhi.mp3',
    title: 'Performing Vows, Sacrificing and Seeking Blessings',
    category: 'talks',
    reciter: 'Yasir Qadhi',
    topic: 'aqeedah',
  },
  {
    archiveId: 'dua_the_weapon_of_the_believer',
    file: 'dua_the_weapon_of_the_believer_part_01.mp3',
    title: 'Dua: The Weapon of the Believer (Part 1)',
    category: 'talks',
    reciter: 'Yasir Qadhi',
    topic: 'spirituality',
  },
  {
    archiveId: 'dua_the_weapon_of_the_believer',
    file: 'dua_the_weapon_of_the_believer_part_02.mp3',
    title: 'Dua: The Weapon of the Believer (Part 2)',
    category: 'talks',
    reciter: 'Yasir Qadhi',
    topic: 'spirituality',
  },
  {
    archiveId: 'an-advice-for-non-hijaabi-sisters-dr.-yasir-qadhi',
    file: '10 Deeds to Jannah - Part 4 Manners (Akhlaq) Towards Parents.mp3',
    title: '10 Deeds to Jannah: Manners Towards Parents',
    category: 'talks',
    reciter: 'Yasir Qadhi',
    topic: 'family',
  },
]

function archiveUrl(archiveId, file) {
  return `https://archive.org/download/${archiveId}/${encodeURIComponent(file)}`
}

async function downloadFile(url, dest) {
  if (existsSync(dest)) return dest
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  return dest
}

function detectMimeType(fileName) {
  const normalized = fileName.toLowerCase()
  if (normalized.endsWith('.ogg')) return 'audio/ogg'
  if (normalized.endsWith('.mp4') || normalized.endsWith('.m4a')) return 'audio/mp4'
  if (normalized.endsWith('.wav')) return 'audio/wav'
  return 'audio/mpeg'
}

async function seed() {
  console.log('Fetching existing tracks...')
  const snapshot = await getDocs(collection(db, 'tracks'))
  const existing = new Set()
  snapshot.forEach((d) => {
    const data = d.data()
    existing.add(`${data.category}::${String(data.title || '').toLowerCase()}`)
  })
  console.log(`Existing: ${snapshot.size}\n`)

  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const item of ITEMS) {
    const key = `${item.category}::${item.title.toLowerCase()}`
    if (existing.has(key)) {
      console.log(`  ↷ Skip [${item.category}] ${item.title}`)
      skipped++
      continue
    }

    const safeLocal = item.file.replace(/[^\w\-_.]+/g, '_').slice(0, 100)
    const localPath = join(CACHE_DIR, `${item.archiveId}_${safeLocal}`)

    try {
      process.stdout.write(`  ↓ Download "${item.title}"...`)
      await downloadFile(archiveUrl(item.archiveId, item.file), localPath)
      const buffer = readFileSync(localPath)
      console.log(` ${(buffer.length / 1e6).toFixed(1)}MB`)

      const id = randomUUID()
      const storagePath = `audio/${id}-${safeLocal}`
      const mimeType = detectMimeType(item.file)
      process.stdout.write(`  ↑ Upload [${item.category}]...`)
      const snap = await uploadBytes(ref(storage, storagePath), new Blob([buffer], { type: mimeType }))
      const audioUrl = await getDownloadURL(snap.ref)

      await setDoc(doc(db, 'tracks', id), {
        id,
        title: item.title,
        category: item.category,
        reciter: item.reciter,
        ...(item.topic ? { topic: item.topic } : {}),
        fileName: item.file,
        fileSize: buffer.length,
        mimeType,
        uploadedAt: Date.now(),
        audioUrl,
        views: 0,
        source: `archive.org/${item.archiveId}`,
      })

      console.log(' ✓')
      uploaded++
      existing.add(key)
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
