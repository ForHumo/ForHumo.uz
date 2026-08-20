// ForHumo Web Push service worker — barcha modullar (Nexus, BN, ...) uchun umumiy.
// Har payload'da `url` bo'lsa, notification click shu URL'ga ochadi.
// Payload'da `trackClickPath` bo'lsa, ochishdan oldin analytics POST yuboradi.
//
// PWA offline shell (v2 dan boshlab):
//   - Static shell precache: /offline.html, /logo.png, /bn/favicon.png, /bn/apple-icon.png
//   - Runtime cache: _next/static/* (immutable), rasm CDN'lari
//   - Navigate fetch: network-first, offline bo'lsa /offline.html
//   - API/POST hech qachon cache'ga tushmaydi (auth va freshness)

const CACHE_VERSION = "fh-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Precache — kichkina, avval tekshirilgan
const PRECACHE_URLS = [
    "/offline.html",
    "/logo.png",
    "/bn/favicon.png",
    "/bn/apple-icon.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(STATIC_CACHE);
        // Har biri alohida, birortasi 404 bo'lsa qolganini qo'shsin
        await Promise.all(PRECACHE_URLS.map(u =>
            cache.add(u).catch(() => { /* jim */ })
        ));
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        // Eski versiya cache'larini tozalaymiz
        const keys = await caches.keys();
        await Promise.all(keys
            .filter(k => k.startsWith("fh-") && !k.startsWith(CACHE_VERSION))
            .map(k => caches.delete(k)));
        await self.clients.claim();
    })());
});

// ── Fetch strategy ──────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
    const req = event.request;

    // Faqat GET keshlaymiz. POST/PUT/DELETE bevosita network'ga.
    if (req.method !== "GET") return;

    const url = new URL(req.url);

    // Boshqa origin'lar (Vercel Analytics, blob CDN)ni umuman ushlamaymiz
    if (url.origin !== self.location.origin) return;

    // API/auth/next dinamik va push endpoint'lar — network-only
    if (url.pathname.startsWith("/api/") ||
        url.pathname.startsWith("/_next/data/") ||
        url.pathname === "/sw.js") return;

    // Navigation (HTML sahifalar) — network-first, offline bo'lsa offline.html
    if (req.mode === "navigate") {
        event.respondWith((async () => {
            try {
                const resp = await fetch(req);
                return resp;
            } catch {
                const cache = await caches.open(STATIC_CACHE);
                const offline = await cache.match("/offline.html");
                return offline ?? new Response("Offline", { status: 503 });
            }
        })());
        return;
    }

    // _next/static/* immutable — cache-first (Next hashli fayllar)
    if (url.pathname.startsWith("/_next/static/")) {
        event.respondWith((async () => {
            const cache = await caches.open(RUNTIME_CACHE);
            const cached = await cache.match(req);
            if (cached) return cached;
            try {
                const resp = await fetch(req);
                if (resp.ok) cache.put(req, resp.clone()).catch(() => { /* jim */ });
                return resp;
            } catch { return new Response("", { status: 504 }); }
        })());
        return;
    }

    // Rasm/logo — stale-while-revalidate (tez ko'rinsin, fon'da yangilansin)
    if (req.destination === "image") {
        event.respondWith((async () => {
            const cache = await caches.open(RUNTIME_CACHE);
            const cached = await cache.match(req);
            const fetchPromise = fetch(req).then(resp => {
                if (resp.ok) cache.put(req, resp.clone()).catch(() => { /* jim */ });
                return resp;
            }).catch(() => cached);
            return cached ?? fetchPromise;
        })());
        return;
    }

    // Qolgan hammasi — network passthrough
});

// ── Push xabarlari (mavjud logika) ──────────────────────────────────────────
self.addEventListener("push", (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
    const title = data.title || "For Humo";
    event.waitUntil(
        self.registration.showNotification(title, {
            body: data.body || "",
            icon: data.icon || "/logo.png",
            badge: "/logo.png",
            tag: data.tag || undefined,
            data: {
                url: data.url || "/",
                trackClickPath: data.trackClickPath || null,
            },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const nd = event.notification.data || {};
    const targetUrl = nd.url || "/";
    const trackPath = nd.trackClickPath || null;

    let dest = targetUrl;
    try { dest = new URL(targetUrl, self.location.origin).href; } catch { /* keep as-is */ }

    event.waitUntil((async () => {
        if (trackPath) {
            try {
                await fetch(trackPath, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: "{}",
                    keepalive: true,
                });
            } catch { /* jim */ }
        }

        const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const c of list) {
            try {
                const u = new URL(c.url);
                const d = new URL(dest);
                if (u.origin === d.origin) {
                    if ("focus" in c) {
                        await c.focus();
                        if ("navigate" in c) return c.navigate(dest);
                        return;
                    }
                }
            } catch { /* ignore */ }
        }
        await self.clients.openWindow(dest);
    })());
});
