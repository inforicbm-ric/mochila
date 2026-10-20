const CACHE_VERSION = '2.0.1'; // Versão de segurança secundária
const CACHE_NAME = 'mochila-emergencia-' + CACHE_VERSION;
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Instalação: armazena os arquivos principais em cache e detecta a versão do index.html
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    fetch('./index.html', { cache: 'no-store' })
      .then(r => r.text())
      .then(text => {
        const match = text.match(/<meta name="app-version" content="([^"]+)"/);
        const detectedVersion = match ? match[1] : CACHE_VERSION;
        const cacheName = 'mochila-emergencia-' + detectedVersion;
        return caches.open(cacheName).then(cache => cache.addAll(urlsToCache));
      })
      .catch(() => caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)))
  );
});

// Ativação: limpa os caches antigos automaticamente
self.addEventListener('activate', (event) => {
  event.waitUntil(
    fetch('./index.html', { cache: 'no-store' })
      .then(r => r.text())
      .then(text => {
        const match = text.match(/<meta name="app-version" content="([^"]+)"/);
        const currentVersion = match ? match[1] : CACHE_VERSION;
        const currentCacheName = 'mochila-emergencia-' + currentVersion;
        return caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== currentCacheName) {
                return caches.delete(cacheName);
              }
            })
          );
        });
      })
      .catch(() => {
        return caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== CACHE_NAME) {
                return caches.delete(cacheName);
              }
            })
          );
        });
      })
      .then(() => self.clients.claim())
  );
});

// Busca: rede primeiro para o HTML, cache para os demais recursos
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate' || request.url.endsWith('index.html')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) return response;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
      .catch(() => {})
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});