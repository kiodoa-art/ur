const VERSION = "2.0.0";
const CACHE = `nat-ur-v${VERSION}`;
const APP_SHELL = [
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Navigation skal altid forsøge at hente den nyeste GitHub-version først.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Lokale filer opdateres i baggrunden, men virker stadig offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fresh = fetch(request, { cache: "no-store" })
          .then(response => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then(cache => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);

        return cached || fresh;
      })
    );
  }
});
