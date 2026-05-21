const CACHE_NAME = "math-hero-version-5-auth-1x1";
const ASSETS = ["./","./index.html","./style.css","./app.js","./manifest.json","./assets/icon-192.svg","./assets/icon-512.svg"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request))));
