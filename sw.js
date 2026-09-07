/* Service Worker — מעטפת מהקאש, נתונים תמיד מהרשת.
   מביא את קבצי המעטפת עם revalidation כדי שעדכונים יתפשטו אמין.
   ה-scope הוא רק /tasks/ — בלי Service-Worker-Allowed על כל האתר. */
const CACHE = 'tasks-shell-v7';
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
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(SHELL.map(url =>
        fetch(new Request(url, { cache: 'reload' }))
          .then(res => (res.ok ? c.put(url, res) : null))
          .catch(() => null)
      ))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.includes('/api/')) return;
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(new Request(e.request, { cache: 'no-cache' })).then(res => {
      // רק תשובות תקינות נכנסות לקאש — אחרת 404/שגיאה נתקעת כ"גרסה ישנה"
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
