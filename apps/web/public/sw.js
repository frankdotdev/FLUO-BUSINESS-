// Fluo Progressive Web App Service Worker
const CACHE_NAME = "fluo-pwa-v1";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Network first for HTML pages, cache fallback for assets
  const url = new URL(event.request.url);
  if (url.origin === location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".css"))) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
        );
      })
    );
  }
});
