/**
 * Quick check that public vote reads/writes work against Firestore.
 * Run: node scripts/test-votes.mjs
 */
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  doc,
  getDoc,
  runTransaction,
  collection,
  getDocs,
} from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSyAApgjYdOw8QTBINdJETomagniQqlz1mqo',
  authDomain: 'audio-68d1f.firebaseapp.com',
  projectId: 'audio-68d1f',
  storageBucket: 'audio-68d1f.firebasestorage.app',
  appId: '1:749467125801:web:c852164b64658203ef3438',
})

const db = getFirestore(app)
const TEST_ID = 'vote-smoke-test'

async function main() {
  console.log('Reading votes collection...')
  const snap = await getDocs(collection(db, 'votes'))
  console.log(`OK read: ${snap.size} vote documents`)

  const ref = doc(db, 'votes', TEST_ID)
  const next = await runTransaction(db, async (tx) => {
    const existing = await tx.get(ref)
    const current = existing.exists() ? (existing.data().count || 0) : 0
    const count = current + 1
    tx.set(
      ref,
      {
        trackId: TEST_ID,
        count,
        lastUpdated: new Date().toISOString(),
        ...(existing.exists() ? {} : { createdAt: new Date().toISOString() }),
      },
      { merge: true },
    )
    return count
  })
  console.log(`OK write: test vote count = ${next}`)

  const verify = await getDoc(ref)
  console.log(`OK verify: stored count = ${verify.data()?.count}`)
}

main().catch((err) => {
  console.error('FAILED:', err.message || err)
  if (String(err.message).includes('permission')) {
    console.error('\nPublish firestore.rules in Firebase Console → Firestore → Rules')
  }
  process.exit(1)
})
