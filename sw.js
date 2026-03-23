/**
 * Analisa Performa PWA - Service Worker
 * Version: 2.2.1 (Cache Busting)
 */

const CACHE_NAME = "analisa-pro-cache-v2.2.1";

// Daftar aset yang harus tersedia 100% secara offline
const PRE_CACHE_ASSETS = [
    "./",
    "./index.html",
    "./absen.html",
    "./data_dw.html",
    "./jumlah_hari_kerja.html",
    "./analisa.html",
    "./manifest.json",
    // Library CDN - Wajib di-cache agar fungsi (QR/Grafik/Excel) tidak mati
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css",
    "https://cdn.jsdelivr.net/npm/chart.js",
    "https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js",
    "https://cdn.jsdelivr.net/npm/sweetalert2@11",
    "https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js",
    "https://unpkg.com/html5-qrcode"
];

// 1. Tahap Install: Ambil semua asset dan simpan ke cache
self.addEventListener("install", (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("SW: Pre-caching assets...");
            return cache.addAll(PRE_CACHE_ASSETS);
        })
    );
});

// 2. Tahap Aktivasi: Hapus cache lama (Cleanup)
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log("SW: Clearing old cache...");
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. Tahap Fetch: Strategi Pintar
self.addEventListener("fetch", (event) => {
    // Abaikan permintaan selain GET (seperti POST untuk analytics jika ada)
    if (event.request.method !== "GET") return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Jika ada di cache, berikan langsung (Instant Load)
            if (cachedResponse) {
                // Sambil memberikan cache, lakukan update di background (Stale-While-Revalidate)
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                }).catch(() => { /* Abaikan jika gagal update karena offline */ });
                
                return cachedResponse;
            }

            // Jika tidak ada di cache, ambil dari network
            return fetch(event.request).then((networkResponse) => {
                // Simpan ke cache untuk permintaan berikutnya (jika valid)
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Fallback jika network gagal dan tidak ada di cache (Offline Page)
                if (event.request.mode === "navigate") {
                    return caches.match("./index.html");
                }
            });
        })
    );
});
