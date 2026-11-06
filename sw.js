/* Looply application-shell offline cache. Media remains in IndexedDB, never in the network cache. */
'use strict';
const CACHE = 'looply-pwa-shell-2026-11-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(names => Promise.all(names.filter(name => name.startsWith('looply-pwa-shell-') && name !== CACHE).map(name => caches.delete(name)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Prefer the latest page when online, with a cached fallback offline.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy)));
      }
      return response;
    }).catch(async () => (await caches.match(req)) || (await caches.match('./index.html')) || Response.error()));
    return;
  }
  // Only application files are cached. Uploaded MP3/MP4 files are local blobs stored in IndexedDB.
  if (!/\.(?:webmanifest|png|js|css|html)$/.test(url.pathname)) return;
  event.respondWith(fetch(req).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy)));
    }
    return response;
  }).catch(() => caches.match(req)));
});
