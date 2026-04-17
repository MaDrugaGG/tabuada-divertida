const APP_VERSION = '2.4.1';
// release-refresh: ui-revolution-2026-04-17
const CACHE_NAME = 'tabuada-v' + APP_VERSION;
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    // version.json nunca cacheado - sempre busca do servidor
    if (event.request.url.includes('version.json')) {
        event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
        return;
    }
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});

// Recebe sinal para ativar novo SW imediatamente
self.addEventListener('message', event => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
