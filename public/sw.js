// ForHumo Web Push service worker — barcha modullar (Nexus, BN, ...) uchun umumiy.
// Har payload'da `url` bo'lsa, notification click shu URL'ga ochadi.
// Payload'da `trackClickPath` bo'lsa, ochishdan oldin analytics POST yuboradi
// (BN broadcast CTR — CORS: shu origin'ga same-origin POST).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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

    // Absolute yoki nisbiy URL'ni normalizatsiya qilamiz
    let dest = targetUrl;
    try { dest = new URL(targetUrl, self.location.origin).href; } catch { /* keep as-is */ }

    event.waitUntil((async () => {
        // 1) Analytics ping (fail-safe — CTR uchun)
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

        // 2) Xuddi shu origin+prefiks (BN yoki Nexus) mavjud bo'lsa, uni fokuslaymiz
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
