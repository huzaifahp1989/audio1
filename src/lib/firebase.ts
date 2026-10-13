import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, updateDoc, setDoc, getDoc, increment } from 'firebase/firestore'
import { getAnalytics, isSupported, logEvent, setUserId, type Analytics } from 'firebase/analytics'

/** Primary app — where tracks / storage live */
const firebaseConfig = {
  apiKey: "AIzaSyAApgjYdOw8QTBINdJETomagniQqlz1mqo",
  authDomain: "audio-68d1f.firebaseapp.com",
  projectId: "audio-68d1f",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "audio-68d1f.firebasestorage.app",
  messagingSenderId: "749467125801",
  appId: "1:749467125801:web:c852164b64658203ef3438",
}

/** Separate Analytics project (GA4 measurement ID) */
const analyticsConfig = {
  apiKey: "AIzaSyDIpe4_imqnRmn4hB5DadmzRGGl_AndpXc",
  authDomain: "islam-media-stats.firebaseapp.com",
  projectId: "islam-media-stats",
  storageBucket: "islam-media-stats.firebasestorage.app",
  messagingSenderId: "748617367224",
  appId: "1:748617367224:web:18469c9aa80e975860be4d",
  measurementId: "G-8LHGLLY2NC",
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const storage = getStorage(app)
const db = getFirestore(app)

/** Lazily init Analytics so module load never blocks the UI. */
let analytics: Analytics | null = null
let analyticsReady: Promise<Analytics | null> | null = null

function initAnalytics(): Promise<Analytics | null> {
  if (analytics) return Promise.resolve(analytics)
  if (analyticsReady) return analyticsReady

  analyticsReady = (async () => {
    if (typeof window === 'undefined') return null
    if (!analyticsConfig.measurementId) return null
    try {
      const supported = await isSupported()
      if (!supported) return null
      const analyticsApp = initializeApp(analyticsConfig, 'analytics')
      analytics = getAnalytics(analyticsApp)
      return analytics
    } catch (err) {
      console.warn('[Firebase] Analytics unavailable', err)
      return null
    }
  })()

  return analyticsReady
}

if (typeof window !== 'undefined') {
  void initAnalytics()
}

export {
  auth,
  storage,
  db,
  analytics,
  initAnalytics,
  logEvent,
  setUserId,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  increment,
  updateDoc,
  setDoc,
  getDoc,
}
export type { Analytics }
