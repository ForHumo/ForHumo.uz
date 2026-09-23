import { NextResponse } from "next/server";

// Humo eSport — path-scoped PWA manifest (forhumo.uz/esport TWA uchun).
// Root `/manifest.webmanifest` "For Humo" super-app manifestini beradi; bu esa ALOHIDA
// "Humo eSport" ilova identligi. Esport layout shunga link qiladi (`manifest: "/esport.webmanifest"`).
// Bubblewrap init shu URL bilan: `https://forhumo.uz/esport.webmanifest`.
// Middleware `.`-li yo'llarni chetlab o'tadi → bu forhumo.uz'da rewrite'siz beriladi.
export const dynamic = "force-static";

export function GET() {
    return NextResponse.json(
        {
            // id — "For Humo" root manifestidan (id "/") ALOHIDA identlik.
            id: "/uz/esport",
            name: "Humo eSport",
            short_name: "Humo eSport",
            description: "O'zbekiston esport platformasi — jamoalar, turnirlar, liga va transfer bozori.",
            // TWA kirish nuqtasi — kanonik (redirect'siz) locale bilan.
            start_url: "/uz/esport",
            // scope "/" — esport ichidagi Pay/Market/ID havolalari ham ilovada ochilsin.
            scope: "/",
            display: "standalone",
            orientation: "portrait",
            background_color: "#070C1C",
            theme_color: "#070C1C",
            lang: "uz",
            icons: [
                { src: "/esport/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
                { src: "/esport/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
                // Maskable ALOHIDA — logo safe-zone (markaziy ~64%) ichida, dark-navy fon.
                { src: "/esport/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
            categories: ["games", "sports", "entertainment"],
        },
        { headers: { "Content-Type": "application/manifest+json" } },
    );
}
