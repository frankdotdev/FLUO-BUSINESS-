// Fluo Progressive Web App Service Worker
const CACHE_NAME = "fluo-pwa-v2";
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
  const url = new URL(event.request.url);
  // Only cache GET static assets on current origin
  if (
    url.origin === location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".css"))
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request)
            .then((response) => {
              if (response && response.status === 200 && response.type === "basic") {
                const clone = response.clone();
                caches
                  .open(CACHE_NAME)
                  .then((cache) => cache.put(event.request, clone).catch(() => {}))
                  .catch(() => {});
              }
              return response;
            })
            .catch(() => cached || new Response("", { status: 408 }))
        );
      })
    );
  }
});

// Real-time Push Notifications for Web / PWA
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || "Fluo Notification";
    const options = {
      body: data.body || "",
      icon: "/logo.png",
      badge: "/icon.png",
      data: data.data || {},
      vibrate: [100, 50, 100],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    // If not json, display raw text
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Fluo Alert", {
        body: text,
        icon: "/logo.png",
        badge: "/icon.png",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = event.notification.data?.path || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetPath) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetPath);
      }
    })
  );
});
