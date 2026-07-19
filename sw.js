/* Service Worker — מעטפת מהקאש, נתונים תמיד מהרשת.
   מביא את קבצי המעטפת עם revalidation (bypass ל-HTTP cache) כדי שעדכונים יתפשטו אמין. */
const CACHE = 'tasks-shell-v4';
const SHELL = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // reload = לעקוף את קאש ה-HTTP של הדפדפן ולהביא עותק טרי מהרשת
      Promise.all(SHELL.map(url =>
        fetch(new Request(url, { cache: 'reload' }))
          .then(res => res.ok ? c.put(url, res) : null)
          .catch(() => null)
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.includes('/api/')) return;   // ה-API תמיד ישירות מהרשת
  if (e.request.method !== 'GET') return;
  // רשת קודם (עם revalidation), נפילה לקאש כשאין רשת
  e.respondWith(
    fetch(new Request(e.request, { cache: 'no-cache' })).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request))
  );
});
