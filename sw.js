const CACHE_NAME = "math-hero-v1";
const ASSETS = ["./","./index.html","./style.css","./app.js","./manifest.json","./assets/icon-192.svg","./assets/icon-512.svg"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))));
self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});