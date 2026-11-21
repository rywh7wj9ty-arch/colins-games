/* Frozen Spindle Isle v1.0. Scope is this folder only (the script directory),
   separate from /spindle-isle/. Only this release's caches are cleaned. */
const CACHE = 'spindle-isle-v10-20261115';
const PREFIX = 'spindle-isle-v10-';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/game.js',
  'js/level.js',
  'js/sim.js',
  'js/pose.js',
  'js/render.js',
  'js/audio.js',
  'js/input.js',
  'vendor/three.module.js',
  'vendor/LICENSE',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put('index.html', copy));
      return res;
    }).catch(() => caches.match('index.html')));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(req, copy));
    }
    return res;
  })));
});
