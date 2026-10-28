"use client";

// Alifbo almashtirgich — client tomoni (cookie o'qish/yozish + UI ro'yxati).
// Server tomoni (transliteratsiya dvigateli) = lib/uz-script.ts.

export type UzScript = "latn" | "cyrl" | "latn-new";

const COOKIE = "uz_script";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 yil — tanlov eslab qolinadi

// Ro'yxat har variantni O'Z alifbosida ko'rsatadi (foydalanuvchi taniydi).
export const UZ_SCRIPTS: { code: UzScript; label: string }[] = [
    { code: "latn", label: "Lotin (eski)" },
    { code: "cyrl", label: "Кирилл" },
    { code: "latn-new", label: "Lotin (yangi)" },
];

export function getUzScript(): UzScript {
    if (typeof document === "undefined") return "latn";
    const m = document.cookie.match(/(?:^|;\s*)uz_script=([^;]+)/);
    const v = m?.[1];
    return v === "cyrl" || v === "latn-new" ? v : "latn";
}

export function setUzScript(script: UzScript): void {
    try {
        document.cookie = `${COOKIE}=${script}; path=/; max-age=${MAX_AGE}; samesite=lax`;
    } catch { /* cookie yozilmasa — noop */ }
    // SSR xabarlarni tanlangan alifboда qayta render qilishi uchun to'liq reload.
    if (typeof window !== "undefined") window.location.reload();
}
