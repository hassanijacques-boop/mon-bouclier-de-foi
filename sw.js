/* Mon Bouclier de Foi — minimal service worker for PWA install + offline shell */
const CACHE = "mbdf-v1";
const SHELL = ["/", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Network-first for /api, cache-first for everything else
  if (url.pathname.startsWith("/api")) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
  } else {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
  }
});

// Handle "show notification" message from the page
self.addEventListener("message", (event) => {
  if (event.data?.type === "show-adhkar-notification") {
    const { title, body } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "adhkar-reminder",
      data: { url: event.data.url || "/dhikr" },
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dhikr";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(targetUrl) && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
