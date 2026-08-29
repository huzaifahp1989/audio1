/**
 * One-off fix: upload Laytaka Ma'ana (file with Arabic+emoji in name)
 * by finding it via directory scan instead of hardcoded path.
 */
import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore'
import { readdirSync, readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { join } from 'path'

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

// Find the file by partial name match (avoids encoding issues with hardcoded paths)
const files = readdirSync(MUSIC_DIR, { encoding: 'utf8' })
const laytakaFile = files.find(f => f.includes('Laytaka'))

if (!laytakaFile) {
  console.error('Could not find Laytaka file in', MUSIC_DIR)
  process.exit(1)
}

const filePath = join(MUSIC_DIR, laytakaFile)
console.log('Found:', laytakaFile)

// Check if already uploaded
const snapshot = await getDocs(collection(db, 'tracks'))
const exists = [...snapshot.docs].some(d => d.data().title === "Laytaka Ma'ana")
if (exists) {
  console.log("Already exists in Firestore, skipping.")
  process.exit(0)
}

const buffer = readFileSync(filePath)
const blob = new Blob([buffer], { type: 'audio/mpeg' })
const id = randomUUID()
const storagePath = `audio/${id}-laytaka-maana.mp3`
const storageRef = ref(storage, storagePath)

process.stdout.write("Uploading \"Laytaka Ma'ana\" by Ahmed Musabeh...")
const snap = await uploadBytes(storageRef, blob)
const audioUrl = await getDownloadURL(snap.ref)

await setDoc(doc(db, 'tracks', id), {
  id,
  title: "Laytaka Ma'ana",
  category: 'nasheeds',
  reciter: 'Other',
  fileName: 'laytaka-maana.mp3',
  fileSize: buffer.length,
  mimeType: 'audio/mpeg',
  uploadedAt: Date.now(),
  audioUrl,
  views: 0,
})
console.log(' ✓')
console.log('Done!')
