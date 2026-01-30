// Minimal service worker - enables PWA install prompt without offline caching
// This keeps the app online-only as requested

self.addEventListener('install', (event) => {
    // Skip waiting to activate immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Claim all clients immediately
    event.waitUntil(self.clients.claim());
});

// Pass through all fetch requests to the network (no caching)
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});
