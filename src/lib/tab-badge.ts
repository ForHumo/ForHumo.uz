"use client";

// Browser tab title + favicon dinamik badge (Nexus'da o'qilmagan xabarlar uchun).
// Ishlatish: useTabBadge(unreadCount) — komponent ichida.
// - Title: '(N) OriginalTitle' formatiga o'zgartiradi (yoki N=0 bo'lsa asl)
// - Favicon: cyan nuqta qo'shilgan version yaratiladi (canvas orqali, cache'lanadi)

import { useEffect, useRef } from "react";

let origTitle: string | null = null;
let origFaviconHref: string | null = null;
const badgedFaviconCache = new Map<string, string>();

// Favicon URL'ga cyan dot qo'shib data-URL qaytaradi (client-side canvas)
async function makeBadgedFavicon(baseHref: string): Promise<string | null> {
    if (badgedFaviconCache.has(baseHref)) return badgedFaviconCache.get(baseHref) ?? null;
    try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("favicon load"));
            img.src = baseHref;
        });
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0, size, size);
        // Cyan dot — o'ng yuqori burchakda, radius 14px
        const r = 14;
        ctx.beginPath();
        ctx.fillStyle = "#00CEC8";
        ctx.arc(size - r - 2, r + 2, r, 0, Math.PI * 2);
        ctx.fill();
        // Oq ring (kontrast)
        ctx.strokeStyle = "#0B1228";
        ctx.lineWidth = 3;
        ctx.stroke();
        const url = canvas.toDataURL("image/png");
        badgedFaviconCache.set(baseHref, url);
        return url;
    } catch {
        return null;
    }
}

function getOrCreateFaviconLink(): HTMLLinkElement {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
    }
    return link;
}

export function useTabBadge(unreadCount: number): void {
    const lastRef = useRef<number | null>(null);
    useEffect(() => {
        if (typeof document === "undefined") return;
        if (origTitle == null) origTitle = document.title;
        const link = getOrCreateFaviconLink();
        if (origFaviconHref == null) origFaviconHref = link.href || "/favicon.ico";

        const n = Math.max(0, Math.floor(unreadCount));
        if (lastRef.current === n) return;
        lastRef.current = n;

        // Title
        const base = origTitle;
        document.title = n > 0 ? `(${n > 99 ? "99+" : n}) ${base}` : base;

        // Favicon
        if (n > 0) {
            void makeBadgedFavicon(origFaviconHref).then(url => {
                if (url) link.href = url;
            });
        } else {
            link.href = origFaviconHref;
        }
    }, [unreadCount]);
}
