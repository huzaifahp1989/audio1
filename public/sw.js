/* Minimal service worker — keeps shell/ads warm for Car Mode installs */
const CACHE = 'islamic-audio-v1'
const PRECACHE = [
  '/',
  '/car',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/ads/promo-1.mp3',
  '/ads/promo-2.mp3',
  '/ads/promo-3.mp3',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Cache-first for local ads & icons only; network for API/audio CDN
  if (url.origin === self.location.origin && (url.pathname.startsWith('/ads/') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.webmanifest'))) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        const copy = res.clone()
        void caches.open(CACHE).then((c) => c.put(request, copy))
        return res
      }))
    )
  }
})
