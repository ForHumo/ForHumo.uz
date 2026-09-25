"use client";

// Humo Nexus service worker'ni ERTA ro'yxatga oladi (push yoqilishini kutmasdan) —
// offline shell (/sw.js) + Chrome `beforeinstallprompt` (PWA/TWA o'rnatish) barcha Nexus
// foydalanuvchisida ishlashi uchun. Bir xil URL/scope idempotent (push-client.ts bilan
// to'qnashmaydi). EsServiceWorker/BnServiceWorker naqshi.

import { useEffect } from "react";

export function NxServiceWorker() {
    useEffect(() => {
        if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
        const register = () => {
            navigator.serviceWorker.register("/sw.js").catch(() => { /* fail-safe */ });
        };
        if (document.readyState === "complete") {
            register();
        } else {
            window.addEventListener("load", register, { once: true });
            return () => window.removeEventListener("load", register);
        }
    }, []);
    return null;
}
