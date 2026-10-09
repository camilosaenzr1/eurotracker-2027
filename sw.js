const CACHE_NAME = 'eurotracker-v6-2026-10-09-offline';
const ASSETS_TO_CACHE = [
  './manifest.json',
  './app.html',
  './itinerary_data.js',
  './data.json',
  './icon.svg',
  '/static/manifest.json',
  '/static/app.html',
  '/static/itinerary_data.js',
  'https://unpkg.com/lucide@latest',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('Pre-cache partial error:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// NETWORK-FIRST STRATEGY FOR HTML & API WITH OFFLINE FALLBACK
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // HTML pages and API data: Network-First so users get live updates, fallback to cache
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.startsWith('/api') || url.pathname.endsWith('data.json') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const fallbackApp = await caches.match('/static/app.html') || await caches.match('./app.html') || await caches.match('./index.html');
          return fallbackApp;
        })
    );
    return;
  }

  // Static assets (images, fonts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});
