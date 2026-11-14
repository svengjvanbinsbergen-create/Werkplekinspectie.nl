/* Service worker — netwerk eerst, cache als terugval wanneer je offline bent.
   Zo zie je na een update altijd de nieuwste versie, en werkt de app zonder bereik. */
const CACHE = "wpi-v25";
const SHELL = [
  "./", "index.html", "styles.css", "manifest.json",
  "js/kern.js", "js/vandaag.js", "js/planning.js", "js/inspectie.js", "js/inspecties.js",
  "js/acties.js", "js/meldingen.js", "js/dashboard.js", "js/kwartaal.js", "js/start.js",
  "js/config.js", "js/sync.js", "js/auth.js", "js/beheer.js", "css/beheer.css",
  "js/oefen.js", "css/oefen.css",
  "js/koppel.js", "css/koppel.css",
  "fonts/nunito-latin-wght-normal.woff2",
  "icon-192.png", "icon-512.png",
  "data/cijfers.json", "data/kennisbank.json", "data/voorbeelddata.json", "data/trendacties.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
      .catch(() => caches.match(req))
  );
});

// tik op een melding: open (of focus) de app op het actiescherm
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const doel = new URL("index.html" + ((e.notification.data && e.notification.data.hash) || "#/acties"), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ("focus" in c) { if ("navigate" in c) c.navigate(doel).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(doel);
  }));
});
