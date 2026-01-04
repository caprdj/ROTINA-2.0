// sw.js – service worker único para Rotina + Cardápio + Inventário

const CACHE_NAME = "fibro-suite-v3"; // troque sempre que publicar mudanças

const OFFLINE_URLS = [
  "./",
  "./index.html",
  "./rotina.html",
  "./cardapio.html",
  "./inventario.html",
  "./manifest.json",

  // ícones (se existirem no seu repo; se não, tudo bem: usamos allSettled)
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Precache tolerante
    await Promise.allSettled(
      OFFLINE_URLS.map((url) => cache.add(new Request(url, { cache: "reload" })))
    );

    // IMPORTANTÍSSIMO: faz o SW novo valer imediatamente
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // só mesmo origin
  if (url.origin !== self.location.origin) return;

  // Navegação (HTML): network-first, com fallback robusto
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        // 1) tenta o request exato
        const cached = await caches.match(req);
        if (cached) return cached;

        // 2) tenta SEM query (pathname) — isso resolve vários “não acha no cache”
        const cached2 = await caches.match(url.pathname);
        if (cached2) return cached2;

        // 3) fallback final
        return (await caches.match("./index.html")) || (await caches.match("./"));
      }
    })());
    return;
  }

  // Assets: cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return Response.error();
    }
  })());
});
