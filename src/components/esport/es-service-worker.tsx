"use client";

// Humo eSport service worker'ni ERTA ro'yxatga oladi (push yoqilishini kutmasdan) —
// offline shell (/sw.js "fh-v3") + Chrome `beforeinstallprompt` (PWA/TWA o'rnatish)
// barcha esport foydalanuvchisida ishlashi uchun. Bir xil URL/scope idempotent
// (push-client.ts bilan to'qnashmaydi). BnServiceWorker naqshi.

import { useEffect } from "react";

export function EsServiceWorker() {
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
