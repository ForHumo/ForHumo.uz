// ForHumo Nexus — Web Push service worker
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
    const title = data.title || "Nexus";
    event.waitUntil(
        self.registration.showNotification(title, {
            body: data.body || "",
            icon: "/logo.png",
            badge: "/logo.png",
            tag: data.tag || undefined,
            data: { url: data.url || "/nexus" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || "/nexus";
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
            for (const c of list) {
                if (c.url.includes("/nexus") && "focus" in c) return c.focus();
            }
            return self.clients.openWindow(url);
        })
    );
});
