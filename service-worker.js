const CACHE_NAME = "valora-em-v37";
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

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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

  const url = new URL(event.request.url);
  const mustStayFresh = (
    url.origin === self.location.origin &&
    (
      url.pathname === "/" ||
      url.pathname === "/app" ||
      url.pathname.endsWith(".html") ||
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith("service-worker.js")
    )
  );

  if (mustStayFresh) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => response)
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
    );
    return;
  }

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
