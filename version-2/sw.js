const CACHE_NAME = "math-hero-real-duolingo-v3";
const ASSETS = ["./","./index.html","./style.css","./app.js","./manifest.json","./assets/icon-192.svg","./assets/icon-512.svg"];
self.addEventListener("install", event => {self.skipWaiting();event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));});
self.addEventListener("activate", event => {event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));});
self.addEventListener("fetch", event => {event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));});
