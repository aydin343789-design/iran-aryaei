/* ندای پهلوی — Service Worker (نسخهٔ وب / PWA)
 * اپ هیچ سروری ندارد؛ این فایل فقط کاری می‌کند که نسخهٔ وب هم بعد از اولین
 * بازشدن آفلاین باز شود. داخل APK ثبت نمی‌شود (همه‌چیز از قبل داخل اپ است).
 *  - صفحه‌ها: network-first با بازگشت به کش
 *  - فایل‌های ایستا و موتور صوتی: stale-while-revalidate
 *  - مدل‌های صوتی (/models) و هر چیز دیگر: دست‌نخورده
 */
const APP_CACHE = "avasaz-app-v4";

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/logo/logo-square-1024.png",
  "/logo/logo-round-1024.png",
  "/voices/female.jpg",
  "/voices/male.jpg",
  "/voices/narrator.jpg",
  "/samples/female.mp3",
  "/samples/male.mp3",
  "/samples/narrator.mp3",
  "/piper/worker.js",
  "/piper/piper_phonemize.js",
  "/piper/ort.wasm.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      await Promise.allSettled(APP_SHELL.map((u) => cache.add(u)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== APP_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.headers.has("range")) return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/models/") || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(APP_CACHE);
          cache.put("/", response.clone()).catch(() => {});
          return response;
        } catch {
          const cache = await caches.open(APP_CACHE);
          return (
            (await cache.match(request)) ||
            (await cache.match("/")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/voices/") ||
    url.pathname.startsWith("/samples/") ||
    url.pathname.startsWith("/piper/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
