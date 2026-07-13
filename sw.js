/* Service Worker — кэширование для офлайн-работы */
const CACHE_NAME = 'gymtracker-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Установка — кэшируем ресурсы
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Активация — чистим старые кэши
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — стратегия "Cache First"
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});
