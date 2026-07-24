/**
 * Upload English vocals-only nasheeds + kids nasheeds to Firestore/Storage.
 * Also retag a few existing kids-friendly English tracks into kids-nasheeds.
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

const ENGLISH_VOCALS = [
  { file: '/tmp/english-vocals/insha-allah-english.mp3', title: 'Insha Allah (English — Vocals Only)', reciter: 'Maher Zain' },
  { file: '/tmp/english-vocals/thank-you-allah-vocals.mp3', title: 'Thank You Allah (Vocals Only)', reciter: 'Maher Zain' },
  { file: '/tmp/english-vocals/the-chosen-one.mp3', title: 'The Chosen One (Vocals Only)', reciter: 'Maher Zain' },
  { file: '/tmp/english-vocals/open-your-eyes.mp3', title: 'Open Your Eyes (Vocals Only)', reciter: 'Maher Zain' },
  { file: '/tmp/english-vocals/always-be-there.mp3', title: 'Always Be There (Vocals Only)', reciter: 'Maher Zain' },
  { file: '/tmp/english-vocals/hold-my-hand.mp3', title: 'Hold My Hand (Vocals Only)', reciter: 'Maher Zain' },
  { file: '/tmp/english-vocals/awaken.mp3', title: 'Awaken (Vocals Only)', reciter: 'Maher Zain' },
  { file: '/tmp/english-vocals/palestine-will-be-free.mp3', title: 'Palestine Will Be Free (Vocals Only)', reciter: 'Maher Zain' },
  { file: '/tmp/english-vocals/for-the-rest-of-my-life.mp3', title: 'For the Rest of My Life (Vocals Only)', reciter: 'Maher Zain' },
  { file: '/tmp/english-vocals/new-you.mp3', title: 'New You (Vocals Only)', reciter: 'Ilyas Mao' },
  { file: '/tmp/english-vocals/free-zain-bhikha.mp3', title: 'Free (Vocals Only)', reciter: 'Zain Bhikha' },
  { file: '/tmp/english-vocals/baraka-allahu-lakuma.mp3', title: 'Baraka Allahu Lakuma (Vocals Only)', reciter: 'Other' },
  { file: '/tmp/english-vocals/no-god-but-allah.mp3', title: 'No God But Allah (Vocals Only)', reciter: 'Other' },
]

const KIDS_NASHEEDS = [
  { file: '/tmp/kids-nasheeds/lets-pray.mp3', title: "Let's Pray", reciter: 'Omar Esa', language: 'english', vocalsOnly: true },
  { file: '/tmp/kids-nasheeds/aisha-omar-esa.mp3', title: "Aisha (Radiallahu Anha)", reciter: 'Omar Esa', language: 'english', vocalsOnly: true },
  { file: '/tmp/kids-nasheeds/my-brother.mp3', title: 'My Brother', reciter: 'Omar Esa', language: 'english', vocalsOnly: true },
  { file: '/tmp/kids-nasheeds/kids-islamic-songs-compilation.mp3', title: 'Islamic Songs for Kids (Compilation)', reciter: 'Various Artists', language: 'english', vocalsOnly: false },
]

const RETAG_TO_KIDS = [
  'A Is For Allah',
  'Mum And Dad',
]

async function existingTitles() {
  const snap = await getDocs(collection(db, 'tracks'))
  const byTitle = new Map()
  for (const d of snap.docs) {
    const data = d.data()
    byTitle.set(String(data.title || '').toLowerCase(), { id: d.id, ...data })
  }
  return byTitle
}

async function uploadOne({ file, title, category, reciter, language, vocalsOnly }) {
  if (!existsSync(file)) throw new Error(`Missing file: ${file}`)
  const buf = readFileSync(file)
  const id = randomUUID()
  const fileName = basename(file)
  const storagePath = `audio/${id}-${fileName}`
  const storageRef = ref(storage, storagePath)
  console.log(`Uploading ${title}…`)
  await uploadBytes(storageRef, buf, { contentType: 'audio/mpeg' })
  const audioUrl = await getDownloadURL(storageRef)
  const track = {
    id,
    title,
    category,
    reciter,
    fileName,
    fileSize: buf.length,
    mimeType: 'audio/mpeg',
    uploadedAt: Date.now(),
    audioUrl,
    views: 0,
    source: 'upload',
    language,
    topic: language,
  }
  if (vocalsOnly) track.vocalsOnly = true
  await setDoc(doc(db, 'tracks', id), track)
  console.log(`  ✓ ${id}`)
  return track
}

async function main() {
  const existing = await existingTitles()
  let addedEnglish = 0
  let addedKids = 0
  let retagged = 0

  for (const item of ENGLISH_VOCALS) {
    const key = item.title.toLowerCase()
    if (existing.has(key)) {
      console.log(`Skip (exists): ${item.title}`)
      continue
    }
    // Also skip near-duplicates that already have same base title + vocals only from same artist
    const already = [...existing.values()].some(
      (t) =>
        t.category === 'nasheeds' &&
        String(t.title).toLowerCase().includes(item.title.toLowerCase().replace(' (vocals only)', '').slice(0, 18)) &&
        t.vocalsOnly === true
    )
    if (already) {
      console.log(`Skip (similar vocals-only exists): ${item.title}`)
      continue
    }
    await uploadOne({
      ...item,
      category: 'nasheeds',
      language: 'english',
      vocalsOnly: true,
    })
    addedEnglish++
  }

  for (const item of KIDS_NASHEEDS) {
    const key = item.title.toLowerCase()
    if (existing.has(key)) {
      console.log(`Skip (exists): ${item.title}`)
      continue
    }
    await uploadOne({
      ...item,
      category: 'kids-nasheeds',
    })
    addedKids++
  }

  for (const title of RETAG_TO_KIDS) {
    const t = existing.get(title.toLowerCase())
    if (!t) {
      console.log(`Retag miss: ${title}`)
      continue
    }
    if (t.category === 'kids-nasheeds') {
      console.log(`Already kids: ${title}`)
      continue
    }
    await updateDoc(doc(db, 'tracks', t.id), {
      category: 'kids-nasheeds',
      language: t.language || 'english',
      topic: t.topic || 'english',
    })
    console.log(`Retagged → kids-nasheeds: ${title}`)
    retagged++
  }

  // Flag existing vocals-only titled track
  for (const t of existing.values()) {
    if (
      t.category === 'nasheeds' &&
      !t.vocalsOnly &&
      /vocals only|without music|a cappella|acapella/i.test(String(t.title || ''))
    ) {
      await updateDoc(doc(db, 'tracks', t.id), { vocalsOnly: true })
      console.log(`Flagged vocalsOnly: ${t.title}`)
    }
  }

  console.log('\nDone.')
  console.log(`Added English vocals-only: ${addedEnglish}`)
  console.log(`Added kids nasheeds: ${addedKids}`)
  console.log(`Retagged to kids: ${retagged}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
