/* Service worker — app-shell cache voor offline gebruik (voorbeeld). */
const CACHE = "wpi-v1";
const SHELL = [
  "./", "index.html", "styles.css", "app.js", "manifest.json",
  "icon-192.png", "icon-512.png",
  "data/cijfers.json", "data/kennisbank.json", "data/voorbeelddata.json", "data/trendacties.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // data: network-first (verse cijfers), val terug op cache offline
  if (url.pathname.includes("/data/")) {
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; }).catch(() => caches.match(req)));
    return;
  }
  // shell: cache-first
  e.respondWith(caches.match(req).then((c) => c || fetch(req)));
});
