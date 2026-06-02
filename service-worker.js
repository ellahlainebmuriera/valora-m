const CACHE_NAME = "valora-em-v28";
const APP_ASSETS = [
  "/",
  "/app",
  "/refund-policy",
  "/index.html",
  "/official-website.html",
  "/refund-policy.html",
  "/app.html",
  "/styles.css",
  "/app.js",
  "/auth-fallback.js",
  "/pwa-install.js",
  "/manifest.json",
  "/manifest.webmanifest",
  "/icons/valora-em-logo-192.png",
  "/icons/valora-em-logo-512.png",
  "/icons/valora-em-mark-192.png",
  "/icons/valora-em-mark-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(APP_ASSETS.map((asset) => cache.add(asset)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
  );
});
