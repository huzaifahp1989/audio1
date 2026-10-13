const CACHE = 'islamic-audio-v5'
const ASSETS = ['/', '/car', '/manifest.json', '/manifest.webmanifest', '/favicon.svg', '/ads/promo-1.mp3', '/ads/promo-2.mp3', '/ads/promo-3.mp3']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) return
  if (url.origin !== self.location.origin) return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseUrl = new URL(response.url)
          // Never cache redirected cross-origin pages (for example Vercel auth/login pages).
          if (response.ok && responseUrl.origin === self.location.origin) {
            const clone = response.clone()
            caches.open(CACHE).then((cache) => {
              cache.put('/index.html', clone)
            })
          }
          return response
        })
        .catch(async () => {
          const appShell = await caches.match('/index.html')
          return appShell || Response.error()
        })
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone()
            caches.open(CACHE).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(async () => {
          if (cached) return cached
          return Response.error()
        })
      return cached || fetchPromise
    })
  )
})
