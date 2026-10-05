/* Finance Book AI service worker.
   Deliberately tiny: it makes the app installable and shows a friendly page when the phone is offline.
   It NEVER caches pages, API responses or anything from a signed-in session, so money data is not stored by the worker. */
const CACHE = "fb-offline-v1";
const OFFLINE = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(OFFLINE, { cache: "reload" }))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate") return; // everything else goes straight to the network
  event.respondWith(fetch(req).catch(() => caches.open(CACHE).then((c) => c.match(OFFLINE)).then((r) => r || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } }))));
});
