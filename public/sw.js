// ForHumo Web Push service worker — barcha modullar (Nexus, BN, ...) uchun umumiy.
// Har payload'da `url` bo'lsa, notification click shu URL'ga ochadi.

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
            data: { url: data.url || "/" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || "/";
    // Absolute yoki nisbiy URL'ni normalizatsiya qilamiz
    let dest = targetUrl;
    try { dest = new URL(targetUrl, self.location.origin).href; } catch { /* keep as-is */ }
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
            // Xuddi shu origin+prefiks (BN yoki Nexus) mavjud bo'lsa, uni fokuslaymiz
            for (const c of list) {
                try {
                    const u = new URL(c.url);
                    const d = new URL(dest);
                    if (u.origin === d.origin) {
                        if ("focus" in c) return c.focus().then(() => {
                            if ("navigate" in c) return c.navigate(dest);
                        });
                    }
                } catch { /* ignore */ }
            }
            return self.clients.openWindow(dest);
        })
    );
});
