const CACHE = 'life-planner-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API calls — always needs live data
  if (url.hostname === 'api.lunkystch.com') return;
  if (url.hostname.includes('workers.dev'))  return;

  // Navigation: network-first, fall back to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(request).then(cached => {
        const network = fetch(request).then(res => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});
