/**
 * Upload Arabic vocals-only kids nasheeds to Firestore/Storage.
 */
import { readFileSync, existsSync } from 'fs'
import { basename } from 'path'
import { randomUUID } from 'crypto'
import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore'

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

const KIDS_ARABIC = [
  {
    file: '/tmp/kids-arabic-nasheeds/ya-nabi-salam-arabic.mp3',
    title: 'يا نبي سلام عليك (Ya Nabi Salam Alayka — Vocals Only)',
    reciter: 'Maher Zain',
  },
  {
    file: '/tmp/kids-arabic-nasheeds/insha-allah-arabic.mp3',
    title: 'إن شاء الله (Insha Allah Arabic — Vocals Only)',
    reciter: 'Maher Zain',
  },
  {
    file: '/tmp/kids-arabic-nasheeds/subhana-allah.mp3',
    title: 'سبحان الله (Subhana Allah — Vocals Only)',
    reciter: 'Maher Zain',
  },
  {
    file: '/tmp/kids-arabic-nasheeds/assalamu-alayka-arabic.mp3',
    title: 'السلام عليك (Assalamu Alayka — Vocals Only)',
    reciter: 'Maher Zain',
  },
  {
    file: '/tmp/kids-arabic-nasheeds/mawlaya-arabic.mp3',
    title: 'مولاي (Mawlaya — Vocals Only)',
    reciter: 'Maher Zain',
  },
  {
    file: '/tmp/kids-arabic-nasheeds/radhitu-billahi.mp3',
    title: 'رضيت بالله ربا (Radhitu Billahi Rabba — Vocals Only)',
    reciter: 'Maher Zain',
  },
  {
    file: '/tmp/kids-arabic-nasheeds/ya-allah.mp3',
    title: 'يا الله (Ya Allah — Kids, Vocals Only)',
    reciter: 'Traditional Arabic',
  },
  {
    file: '/tmp/kids-arabic-nasheeds/allahu-akbar.mp3',
    title: 'الله أكبر (Allahu Akbar — Kids, Vocals Only)',
    reciter: 'Traditional Arabic',
  },
  {
    file: '/tmp/kids-arabic-nasheeds/la-ilaha.mp3',
    title: 'لا إله إلا الله (La Ilaha Illallah — Kids, Vocals Only)',
    reciter: 'Traditional Arabic',
  },
  {
    file: '/tmp/kids-arabic-nasheeds/subhaan-allah-trad.mp3',
    title: 'سبحان الله (Subhaan Allah — Kids, Vocals Only)',
    reciter: 'Traditional Arabic',
  },
  {
    file: '/tmp/kids-arabic-nasheeds/muhammad.mp3',
    title: 'محمد ﷺ (Muhammad — Kids, Vocals Only)',
    reciter: 'Traditional Arabic',
  },
]

async function existingByTitle() {
  const snap = await getDocs(collection(db, 'tracks'))
  const map = new Map()
  for (const d of snap.docs) {
    const data = d.data()
    map.set(String(data.title || '').toLowerCase(), { docId: d.id, ...data })
  }
  return map
}

async function uploadOne({ file, title, reciter }) {
  if (!existsSync(file)) throw new Error(`Missing file: ${file}`)
  const buf = readFileSync(file)
  const id = randomUUID()
  const fileName = basename(file)
  const storageRef = ref(storage, `audio/${id}-${fileName}`)
  console.log(`Uploading ${title}…`)
  await uploadBytes(storageRef, buf, { contentType: 'audio/mpeg' })
  const audioUrl = await getDownloadURL(storageRef)
  const track = {
    id,
    title,
    category: 'kids-nasheeds',
    reciter,
    fileName,
    fileSize: buf.length,
    mimeType: 'audio/mpeg',
    uploadedAt: Date.now(),
    audioUrl,
    views: 0,
    source: 'upload',
    language: 'arabic',
    topic: 'arabic',
    vocalsOnly: true,
  }
  await setDoc(doc(db, 'tracks', id), track)
  console.log(`  ✓ ${id}`)
}

async function main() {
  const existing = await existingByTitle()
  let added = 0

  for (const item of KIDS_ARABIC) {
    if (existing.has(item.title.toLowerCase())) {
      console.log(`Skip (exists): ${item.title}`)
      continue
    }
    // Avoid near-duplicate kids Arabic vocals with same short English name
    const short = item.title.match(/\(([^—)]+)/)?.[1]?.trim().toLowerCase() || ''
    const near = [...existing.values()].some(
      (t) =>
        t.category === 'kids-nasheeds' &&
        (t.language === 'arabic' || t.topic === 'arabic') &&
        t.vocalsOnly &&
        short &&
        String(t.title).toLowerCase().includes(short.split(' ')[0])
    )
    // still upload distinct titles; only skip exact
    await uploadOne(item)
    added++
  }

  // Ensure existing Arabic kids poems are tagged correctly
  for (const t of existing.values()) {
    if (t.category !== 'kids-nasheeds') continue
    const title = String(t.title || '')
    if (/hasbi rabbi/i.test(title)) {
      const patch = {}
      if (t.language !== 'arabic') patch.language = 'arabic'
      if (t.topic !== 'arabic') patch.topic = 'arabic'
      if (!t.vocalsOnly) patch.vocalsOnly = true
      if (Object.keys(patch).length) {
        await updateDoc(doc(db, 'tracks', t.docId), patch)
        console.log(`Tagged: ${title}`, patch)
      }
    }
  }

  console.log(`\nDone. Added ${added} kids Arabic vocals-only nasheeds.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
