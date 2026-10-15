// Tabuada Divertida 3.0 — service worker (versão web / PWA)
const CACHE_NAME = 'tabuada-v3-0-0';
const CORE = [
    './',
    'index.html',
    'manifest.json',
    'icon-192.png',
    'icon-512.png',
    'assets/css/app.css',
    'assets/js/core.js',
    'assets/js/ads.js',
    'assets/js/learn.js',
    'assets/js/games.js',
    'assets/js/games3d.js',
    'assets/js/tools.js',
    'assets/js/profile.js',
    'assets/js/home.js',
    'assets/js/main.js',
    'assets/fonts/baloo-2-latin-700-normal.woff2',
    'assets/fonts/baloo-2-latin-800-normal.woff2',
    'assets/fonts/nunito-latin-600-normal.woff2',
    'assets/fonts/nunito-latin-700-normal.woff2',
    'assets/fonts/nunito-latin-800-normal.woff2',
    'assets/fonts/nunito-latin-900-normal.woff2'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)).catch(() => {}));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
    // Rede primeiro para HTML/JS/CSS (pega atualizações), cache como reserva offline
    event.respondWith(
        fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
            return res;
        }).catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
    );
});
