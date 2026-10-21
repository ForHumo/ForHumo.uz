import { NextResponse } from "next/server";

// YukGo — path-scoped PWA manifest (forhumo.uz/yukgo TWA + iOS install uchun).
// Alohida ilova identligi. Layout shunga link qiladi. Bubblewrap init:
// https://forhumo.uz/yukgo.webmanifest. Middleware `.`-li yo'lni chetlab o'tadi.
export const dynamic = "force-static";

export function GET() {
    return NextResponse.json(
        {
            id: "/uz/yukgo",
            name: "YukGo — yuk va mashina e'lonlari",
            short_name: "YukGo",
            description: "O'zbekiston bo'ylab yuk va bo'sh mashina e'lonlari — bir joyda, tez va ishonchli.",
            start_url: "/uz/yukgo",
            scope: "/uz/yukgo",
            display: "standalone",
            orientation: "portrait",
            background_color: "#0A0F1E",
            theme_color: "#0A0F1E",
            lang: "uz",
            icons: [
                { src: "/yukgo/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
                { src: "/yukgo/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
                { src: "/yukgo/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
            categories: ["business", "productivity", "travel"],
        },
        { headers: { "Content-Type": "application/manifest+json" } },
    );
}
