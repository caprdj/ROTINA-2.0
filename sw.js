// sw.js – service worker único para Rotina + Cardápio + Inventário

const CACHE_NAME = "fibro-suite-v1";

const OFFLINE_URLS = [
  "index.html",
  "rotina.html",
  "cardapio.html",
  "inventario.html",
  "manifest.json",
  "icon-192.png", 
  "icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).catch(() => {
        // Se quiser, aqui dá pra fazer fallback para uma página offline
        return cached || Promise.reject("Offline e sem cache");
      });
    })
  );
});

