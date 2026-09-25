import { NextResponse } from "next/server";

// Humo Nexus — path-scoped PWA manifest (forhumo.uz/nexus TWA uchun).
// Root `/manifest.webmanifest` "For Humo" super-app manifestini beradi; bu esa ALOHIDA
// "Humo Nexus" ilova identligi. Nexus layout shunga link qiladi (`manifest: "/nexus.webmanifest"`).
// Bubblewrap init shu URL bilan: `https://forhumo.uz/nexus.webmanifest`.
// Middleware `.`-li yo'llarni chetlab o'tadi → bu forhumo.uz'da rewrite'siz beriladi.
// MUHIM: eSport (forhumo.uz/esport) bilan BIR host — assetlinks.json ikkala TWA'ni ro'yxatlaydi.
export const dynamic = "force-static";

export function GET() {
    return NextResponse.json(
        {
            // id — "For Humo" root manifestidan (id "/") va eSport'dan (/uz/esport) ALOHIDA identlik.
            id: "/uz/nexus",
            name: "Humo Nexus",
            short_name: "Nexus",
            description: "Humo Nexus — ijtimoiy tarmoq: postlar, videolar, jonli efir, kanallar, xabarlar va musiqa.",
            // TWA kirish nuqtasi — kanonik (redirect'siz) locale bilan.
            start_url: "/uz/nexus",
            // scope "/" — Nexus ichidagi Pay/ID/boshqa havolalar ham ilovada ochilsin.
            scope: "/",
            display: "standalone",
            orientation: "portrait",
            // Nexus dark brand foni (--nx-bg dark). Adaptiv UI, lekin splash/status doim brend.
            background_color: "#0A0C12",
            theme_color: "#0A0C12",
            lang: "uz",
            icons: [
                { src: "/nexus/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
                { src: "/nexus/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
                // Maskable ALOHIDA — "N" belgisi safe-zone (markaziy ~62%) ichida, dark fon.
                { src: "/nexus/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
            categories: ["social", "communication", "entertainment"],
        },
        { headers: { "Content-Type": "application/manifest+json" } },
    );
}
