// Gerado por tools/gera_pwa.py: guarda todos os arquivos para funcionar sem internet.
const CACHE = "questoes-trf3-937eff56dd";
const ARQS = [
  "./",
  "./app.css",
  "./app.js",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./img/MPSP25-18.png",
  "./img/MPSP25-58.png",
  "./img/TCSP26-25.png",
  "./img/TCSP26-26.png",
  "./img/TCSP26-27.png",
  "./img/TCSP26-44.png",
  "./img/TCSP26-45.png",
  "./img/TCSP26-46.png",
  "./img/TCSP26-50.png",
  "./img/TCSP26-52.png",
  "./img/TCSP26-57.png",
  "./img/TCSP26-58.png",
  "./img/TCSP26-75.png",
  "./img/TJMABD25-34.png",
  "./img/TJMACPD25-15.png",
  "./img/TJMTI25-09.png",
  "./img/TJMTI25-14.png",
  "./img/TJMTI25-15.png",
  "./img/TJMTI25-27.png",
  "./img/TJMTI25-39.png",
  "./manifest.webmanifest",
  "./questoes.js",
  "./index.html"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
