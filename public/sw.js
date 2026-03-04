// Clarity PWA Service Worker — caching + background sync

const CACHE_NAME = 'clarity-v1';
const STATIC_CACHE = 'clarity-static-v1';

// App shell pages to precache
const APP_SHELL_PAGES = [
    '/',
    '/dashboard',
    '/notes',
    '/tasks',
    '/journal',
    '/bookmarks',
    '/kanban',
    '/canvas',
    '/transcripts',
];

// Install — precache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // Best-effort precache — don't fail install if a page errors
            for (const url of APP_SHELL_PAGES) {
                try {
                    await cache.add(url);
                } catch {}
            }
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => {
            return Promise.all(
                names
                    .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch strategies
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only handle same-origin requests
    if (url.origin !== self.location.origin) return;

    // API calls — network-first, cache fallback for GETs
    if (url.pathname.startsWith('/api/')) {
        if (event.request.method === 'GET') {
            event.respondWith(networkFirstApi(event.request));
        }
        // Non-GET API calls pass through to network
        return;
    }

    // Static assets — cache-first
    if (
        url.pathname.startsWith('/_next/static/') ||
        url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)
    ) {
        event.respondWith(cacheFirstStatic(event.request));
        return;
    }

    // Navigation requests — network-first with app shell fallback
    if (event.request.mode === 'navigate') {
        event.respondWith(networkFirstNavigation(event.request));
        return;
    }

    // Everything else — network with cache fallback
    event.respondWith(networkFirstApi(event.request));
});

// Background Sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'clarity-sync') {
        event.waitUntil(notifyClientsToSync());
    }
});

async function networkFirstApi(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(
            JSON.stringify({ error: 'offline' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

async function cacheFirstStatic(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('', { status: 503 });
    }
}

async function networkFirstNavigation(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        // Try the exact URL first
        const cached = await caches.match(request);
        if (cached) return cached;

        // Fall back to cached /dashboard as app shell
        const shellCached = await caches.match('/dashboard');
        if (shellCached) return shellCached;

        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
}

async function notifyClientsToSync() {
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
        client.postMessage({ type: 'SYNC_REQUESTED' });
    }
}
