/**
 * Delete script: removes all music/drum nasheeds (non-vocals-only tracks) from Firebase
 * Keeps only vocals-only, humming-only, and pure acapella nasheeds
 * Run with: node scripts/delete-music-drum-nasheeds.mjs
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { getStorage, ref, deleteObject } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyAApgjYdOw8QTBINdJETomagniQqlz1mqo',
  authDomain: 'audio-68d1f.firebaseapp.com',
  projectId: 'audio-68d1f',
  storageBucket: 'audio-68d1f.firebasestorage.app',
  messagingSenderId: '749467125801',
  appId: '1:749467125801:web:c852164b64658203ef3438',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const storage = getStorage(app)

// List of titles to KEEP (vocals-only, humming-only, etc.)
const VOCALS_ONLY_TITLES = [
  // Muad
  'Kun Fayakun',
  'No Better Place',
  'Palestine',
  'Al-Quran',
  'Jibreel',
  "Tala'al Badru",
  'Superhero II',
  'Reach For The Stars',
  "Lord You're With Me",
  'Unbreakable',
  'Ya Aqsa',
  'Jannah',
  // Maher Zain
  'Qalbi Fil Madinah',
  // Ahmed Rajel
  'Allahu Allahu',
  // Amin Davis
  'In My Dreams',
  // Other vocals-only
  'Astaghfirullah (Humming Only)',
  'Sad Background Nasheed (Vocals Only)',
  'People Like You',
  'Islamic Is My Way',
  'Busy Bees Counting Song',
  'Nursery Rhymes Collection Vol 1',
]

async function deleteMusic() {
  console.log('Fetching nasheeds from Firestore...')
  const snapshot = await getDocs(collection(db, 'tracks'))
  
  let toDelete = []
  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data()
    if (data.category === 'nasheeds') {
      // Keep if it's in the vocals-only list
      if (!VOCALS_ONLY_TITLES.includes(data.title)) {
        toDelete.push({ id: docSnapshot.id, title: data.title, fileName: data.fileName })
      }
    }
  })

  console.log(`\nFound ${toDelete.length} music/drum nasheeds to delete:\n`)
  
  if (toDelete.length === 0) {
    console.log('No music/drum nasheeds found to delete.')
    return
  }

  // Show what will be deleted
  toDelete.forEach((track) => {
    console.log(`  • ${track.title}`)
  })

  console.log(`\nDeleting ${toDelete.length} tracks...`)
  
  let deleted = 0
  let failed = 0

  for (const track of toDelete) {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'tracks', track.id))
      
      // Try to delete from Storage
      try {
        const storageRef = ref(storage, `audio/${track.id}-${track.fileName}`)
        await deleteObject(storageRef)
      } catch (storageErr) {
        // Storage deletion might fail if file doesn't exist, that's okay
      }

      console.log(`  ✓ Deleted "${track.title}"`)
      deleted++
    } catch (err) {
      console.log(`  ✗ Failed to delete "${track.title}": ${err.message}`)
      failed++
    }
  }

  console.log(`\nDone! Deleted: ${deleted} | Failed: ${failed}`)
}

deleteMusic().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
