import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAApgjYdOw8QTBINdJETomagniQqlz1mqo",
  authDomain: "audio-68d1f.firebaseapp.com",
  projectId: "audio-68d1f",
  storageBucket: "audio-68d1f.firebasestorage.app",
  messagingSenderId: "749467125801",
  appId: "1:749467125801:web:c852164b64658203ef3438",
  measurementId: "G-DBB7C76F4G"
}

const app = initializeApp(firebaseConfig)
const storage = getStorage(app)
const db = getFirestore(app)

export { storage, db, ref, uploadBytes, getDownloadURL, deleteObject, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc, setDoc }
