// sw.js – service worker único para Rotina + Cardápio + Inventário

const CACHE_NAME = "fibro-suite-v2"; // ↑ aumente quando publicar mudanças
const OFFLINE_URLS = [
  "./",
  "./index.html",
  "./rotina.html",
  "./cardapio.html",
  "./inventario.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Precache "tolerante": se 1 item falhar, não mata o SW inteiro
    await Promise.allSettled(
      OFFLINE_URLS.map((url) => cache.add(new Request(url, { cache: "reload" })))
    );

    // Opcional, mas ajuda a atualizar mais rápido quando você publica mudanças
    // self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // limpa caches antigos
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));

    // assume controle das abas abertas
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Só lida com o mesmo "origin" (evita tentar cachear coisas externas)
  if (url.origin !== self.location.origin) return;

  // Navegação (HTML): NETWORK-FIRST (pra atualizar), com fallback no cache
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || caches.match("./index.html");
      }
    })());
    return;
  }

  // Assets (css/js/png/json): CACHE-FIRST
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return cached || Response.error();
    }
  })());
});
