// BN OG rasmlari uchun umumiy qism: palitra, brend qatori, xavfsiz rasm yuklash,
// render + zaxira (fallback). Route emas — faqat route.tsx fayllar import qiladi.
//
// Nega kerak (2026-10 jonli tekshiruv: shop/market/product 500 berardi):
//  1) Satori ko'p bolali <div>'da `display: flex` talab qiladi — `{a}{b}` ikki bola hisoblanadi.
//     Matnlar shablon satr bilan BITTA bola qilib beriladi.
//  2) Satori WebP/AVIF'ni o'qiy olmaydi — rasm oldindan yuklanib, faqat PNG/JPEG data URI bo'lib beriladi.
//  3) "★" kabi belgilar uchun dinamik shrift yuklanmaydi — yulduz inline SVG.
//  4) ImageResponse xatosi stream ichida chiqadi (500 HTML) — shu yerda buferlab ushlaymiz va
//     brend kartasini qaytaramiz.

import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { BN_SITE, bnLocale, type BnLocale } from "@/lib/bn-seo";

// OG rasm — CSS o'zgaruvchilarisiz (Satori), shuning uchun tungi BN palitrasi qiymatlari shu yerda.
export const OG = {
    gold:    "#F5B301",
    onGold:  "#0A0A0A",
    bg:      "#0F0F10",
    surface: "#191919",
    text:    "#F7F7F7",
    text2:   "#B8B8B8",
    text3:   "#8A8A8A",
    ok:      "#22C55E",
    info:    "#60A5FA",
} as const;

export const OG_SIZE = { width: 1200, height: 630 };

const CACHE_OK       = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";
const CACHE_FALLBACK = "public, max-age=300, s-maxage=300";

/** `?l=ru` → "ru" (bo'lmasa uz) */
export function ogLocale(req: Request): BnLocale {
    try { return bnLocale(new URL(req.url).searchParams.get("l")); } catch { return "uz"; }
}

/** Satr uzun bo'lsa qisqartirish */
export function clip(s: string, n: number): string {
    return s.length > n ? s.slice(0, n) + "…" : s;
}

/**
 * Tashqi rasmni (picsum / Vercel Blob) oldindan yuklaydi va faqat PNG/JPEG bo'lsa data URI qaytaradi.
 * Format magic-bayt bo'yicha aniqlanadi (content-type ba'zan noto'g'ri keladi).
 * Har qanday muammo (timeout, 404, WebP, juda katta) → null — chaqiruvchi zaxira ko'rsatadi.
 */
export async function ogImageSrc(url: string | null | undefined): Promise<string | null> {
    if (!url || !/^https?:\/\//i.test(url)) return null;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) return null;
        const len = Number(res.headers.get("content-length") ?? 0);
        if (len > 4 * 1024 * 1024) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > 4 * 1024 * 1024) return null;
        const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
        const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
        if (!isPng && !isJpeg) return null;
        return `data:${isPng ? "image/png" : "image/jpeg"};base64,${buf.toString("base64")}`;
    } catch {
        return null;
    }
}

/** BN monogrammasi + nom (har OG kartaning yuqori chap burchagi) */
export function OgBrand() {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: OG.gold, color: OG.onGold,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, fontWeight: 900,
            }}>BN</div>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 800, color: OG.text2 }}>Bozor Narxida</div>
        </div>
    );
}

/** Yulduz (reyting) — shrift belgisi emas, inline SVG */
export function OgStar({ size = 36 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={OG.gold} />
        </svg>
    );
}

/** Brend kartasi — umumiy OG va har qanday xato uchun zaxira */
export function OgBrandCard({ tagline }: { tagline?: string | null }) {
    return (
        <div style={{
            width: "100%", height: "100%",
            display: "flex", position: "relative",
            background: `linear-gradient(135deg, ${OG.bg} 0%, #1A1614 100%)`,
            color: OG.text, fontFamily: "sans-serif",
        }}>
            <div style={{
                position: "absolute", top: -120, right: -120,
                width: 520, height: 520, borderRadius: 9999,
                background: `radial-gradient(circle, ${OG.gold}26 0%, transparent 70%)`,
            }} />
            <div style={{
                position: "relative", display: "flex", flexDirection: "column",
                justifyContent: "space-between", padding: "56px 64px", flex: 1,
            }}>
                <OgBrand />
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", fontSize: 104, fontWeight: 900, color: OG.gold, letterSpacing: "-0.03em", lineHeight: 1 }}>
                        Bozor Narxida
                    </div>
                    {tagline && (
                        <div style={{ display: "flex", fontSize: 38, marginTop: 24, color: OG.text, maxWidth: 1000, lineHeight: 1.25 }}>
                            {tagline}
                        </div>
                    )}
                </div>
                <div style={{ display: "flex", fontSize: 24, color: OG.text3 }}>bozornarxida.uz</div>
            </div>
        </div>
    );
}

// Ichki: ImageResponse'ni buferga o'qiymiz — render xatosi shu yerda reject bo'lib chiqadi.
async function toPng(node: ReactElement, cache: string): Promise<Response> {
    const buf = await new ImageResponse(node, OG_SIZE).arrayBuffer();
    return new Response(buf, { headers: { "content-type": "image/png", "cache-control": cache } });
}

/** Zaxira: brend kartasi; u ham chiqmasa — statik /bn/og.png */
export async function fallbackOg(tagline?: string | null): Promise<Response> {
    try {
        return await toPng(<OgBrandCard tagline={tagline} />, CACHE_FALLBACK);
    } catch (e) {
        console.error("[og/bn] fallback render failed:", e);
        return Response.redirect(`${BN_SITE}/bn/og.png`, 307);
    }
}

/** Asosiy render — xato bo'lsa log + zaxira (500 hech qachon qaytmaydi) */
export async function renderOg(node: ReactElement, tagline?: string | null): Promise<Response> {
    try {
        return await toPng(node, CACHE_OK);
    } catch (e) {
        console.error("[og/bn] render failed:", e);
        return fallbackOg(tagline);
    }
}

/** Butun handler uchun himoya: DB/tarjima/render — istalgan xato zaxira kartaga aylanadi */
export async function ogHandler(build: () => Promise<Response>): Promise<Response> {
    try {
        return await build();
    } catch (e) {
        console.error("[og/bn] handler failed:", e);
        return fallbackOg(null);
    }
}
