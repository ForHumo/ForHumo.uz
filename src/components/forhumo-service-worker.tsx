"use client";

// For Humo super-app service worker'ni ERTA ro'yxatga oladi (barcha core sahifada:
// home, /id, /pay, /faq, /support, /market, /ai). /sw.js offline shell +
// `beforeinstallprompt` (PWA/TWA o'rnatish) super-app darajasida ishlashi uchun.
// Bir xil URL/scope idempotent — BN/eSport/Nexus layout'laridagi register bilan
// to'qnashmaydi (o'sha /sw.js). Bn/Es/NxServiceWorker naqshi.

import { useEffect } from "react";

export function ForHumoServiceWorker() {
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
