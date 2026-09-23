"use client";

// BN service worker'ni ERTA (push yoqilishini kutmasdan) ro'yxatga oladi.
// Nega muhim:
//   1. Offline shell (sw.js "fh-v3" + /offline.html) BARCHA foydalanuvchida ishlasin —
//      avval sw faqat push obuna oqimida (push-client.ts) ro'yxatga olinardi, shuning
//      uchun push yoqmagan userlarda offline umuman yo'q edi.
//   2. Chrome/Android'da `beforeinstallprompt` ishonchli otilishi uchun (BnInstallCard'ning
//      bir-bosishli o'rnatishi shunga bog'liq).
//   3. iOS'da standalone o'rnatilgach Web Push ishlashi uchun (iOS faqat standalone PWA'da
//      push oladi).
// Bir xil URL/scope qayta register qilinsa brauzer mavjud registratsiyani qaytaradi
// (idempotent) — push-client.ts bilan to'qnashmaydi.

import { useEffect } from "react";

export function BnServiceWorker() {
    useEffect(() => {
        if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

        const register = () => {
            navigator.serviceWorker.register("/sw.js").catch(() => { /* fail-safe */ });
        };

        // Birinchi render bilan raqobat qilmaslik uchun sahifa yuklanib bo'lgach.
        if (document.readyState === "complete") {
            register();
        } else {
            window.addEventListener("load", register, { once: true });
            return () => window.removeEventListener("load", register);
        }
    }, []);

    return null;
}
