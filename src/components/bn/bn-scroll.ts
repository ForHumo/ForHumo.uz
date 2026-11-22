"use client";

// BN scroll yordamchilari.
//
// MUHIM: BN layout'da `window` scroll bo'lmaydi — butun sahifa `fixed inset-0
// overflow-y-auto` div ichida aylanadi (`[data-bn-scroll-root]`, bn/layout.tsx).
// Shuning uchun `window.scrollY` doim 0 va `window` scroll eventi kelmaydi.
// Scroll'ga bog'liq har qanday UI shu yordamchilardan foydalansin.

import { useEffect, useState } from "react";

/** BN sahifasini aylantiradigan element (topilmasa — `null`, ya'ni window). */
export function getBnScrollRoot(): HTMLElement | null {
    if (typeof document === "undefined") return null;
    return document.querySelector<HTMLElement>("[data-bn-scroll-root]");
}

/** Scroll root'ga (yoki window'ga) passiv scroll listener ulaydi; tozalash funksiyasini qaytaradi. */
export function onBnScroll(handler: () => void): () => void {
    const root = getBnScrollRoot();
    const target: HTMLElement | Window = root ?? window;
    target.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
        target.removeEventListener("scroll", handler);
        window.removeEventListener("resize", handler);
    };
}

/** Joriy scroll ofseti (px). */
export function getBnScrollTop(): number {
    const root = getBnScrollRoot();
    return root ? root.scrollTop : window.scrollY;
}

/** Sahifa `threshold` px dan ko'proq aylantirilganmi. */
export function useBnScrolled(threshold = 8): boolean {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const read = () => setScrolled(getBnScrollTop() > threshold);
        read();
        return onBnScroll(read);
    }, [threshold]);
    return scrolled;
}
